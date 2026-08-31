import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { data: member } = await admin.from("admin_members").select("id,status,auth_user_id").eq("email_normalized", email).maybeSingle();
  if (!member || member.status !== "active" || member.auth_user_id !== data.user.id) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "This account is not authorized for admin access." }, { status: 403 });
  }
  await admin.from("admin_members").update({ last_login_at: new Date().toISOString() }).eq("id", member.id);
  return NextResponse.json({ ok: true });
}
