import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/admin") ? url.searchParams.get("next")! : "/admin/reset-password";
  const supabase = await createServerSupabaseClient();
  const result = tokenHash && type === "invite" ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type }) : code ? await supabase.auth.exchangeCodeForSession(code) : { data: { user: null }, error: new Error("Missing invitation credential") };
  if (result.error) {
    await recordFailedActivation(null, null, "invalid_or_expired_supabase_credential", result.error.message);
    return NextResponse.redirect(new URL("/admin/login?error=confirmation", url.origin));
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) {
    await recordFailedActivation(user?.id ?? null, user?.email ?? null, "unverified_auth_identity");
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=confirmation", url.origin));
  }
  const admin = createAdminSupabaseClient();
  const { data: activated, error: activationError } = await admin.rpc("activate_admin_invitation", {
    p_auth_user_id: user.id,
    p_email: user.email,
  });
  if (activationError || !activated?.length) {
    await recordFailedActivation(user.id, user.email, "invitation_activation_rejected", activationError?.message);
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=unauthorized", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

async function recordFailedActivation(authUserId: string | null, email: string | null, reason: string, detail?: string) {
  const { error } = await createAdminSupabaseClient().from("admin_audit_log").insert({
    admin_user_id: authUserId,
    admin_email: email?.trim().toLowerCase() || "unknown",
    action: "admin_invitation_activation_failed",
    entity_type: "admin_invitation",
    metadata: { reason, detail: detail ?? null },
  });
  if (error) console.error("Admin invitation failure audit could not be recorded", { reason, message: error.message });
}
