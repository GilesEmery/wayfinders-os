import { NextResponse, type NextRequest } from "next/server";
import { audit, type AdminIdentity } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const INITIAL_SUPER_ADMIN = "giles@yourwayfinders.org";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (email !== INITIAL_SUPER_ADMIN) return NextResponse.json({ error: "This account is not eligible for local recovery." }, { status: 403 });
  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const { data: member, error: memberError } = await admin.from("admin_members").select("id,email_normalized,auth_user_id,role,status").eq("email_normalized", INITIAL_SUPER_ADMIN).eq("role", "super_admin").eq("status", "active").maybeSingle();
  if (memberError || !member?.auth_user_id) return NextResponse.json({ error: "The active initial super admin could not be verified." }, { status: 403 });
  const { error } = await admin.auth.admin.updateUserById(member.auth_user_id, { password: newPassword });
  if (error) return NextResponse.json({ error: "Unable to recover the super-admin password." }, { status: 400 });
  const identity: AdminIdentity = { id: member.auth_user_id, email: member.email_normalized, role: "super_admin", memberId: member.id };
  await audit(identity, "admin_password_recovered_local", "admin_member", member.id, { recovered_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
