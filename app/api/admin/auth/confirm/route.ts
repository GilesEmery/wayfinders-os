import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/admin") ? url.searchParams.get("next")! : "/admin";
  const supabase = await createServerSupabaseClient();
  const result = tokenHash && type ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type }) : code ? await supabase.auth.exchangeCodeForSession(code) : { data: { user: null }, error: new Error("Missing confirmation token") };
  if (result.error) return NextResponse.redirect(new URL("/admin/login?error=confirmation", url.origin));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(new URL("/admin/login?error=confirmation", url.origin));
  const admin = createAdminSupabaseClient();
  const { data: member } = await admin.from("admin_members").select("id,status,auth_user_id").eq("email_normalized", user.email.toLowerCase()).maybeSingle();
  if (!member || member.status === "disabled" || (member.auth_user_id && member.auth_user_id !== user.id)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=unauthorized", url.origin));
  }
  await admin.from("admin_members").update({ auth_user_id: user.id, status: "active", last_login_at: new Date().toISOString() }).eq("id", member.id);
  return NextResponse.redirect(new URL(next, url.origin));
}
