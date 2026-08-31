import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const { data: member } = await admin.from("admin_members").select("id,status,auth_user_id").eq("email_normalized", email).maybeSingle();
  if (!member || member.status !== "invited" || member.auth_user_id) {
    return NextResponse.json({ error: "This account cannot be set up here." }, { status: 403 });
  }
  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: "Unable to verify this account. Please contact an administrator." }, { status: 503 });
  if (existingUsers.users.some((user) => user.email?.toLowerCase() === email)) {
    return NextResponse.json({ error: "An Auth account already exists for this authorized email but is not linked. Contact an administrator." }, { status: 409 });
  }
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) return NextResponse.json({ error: "Unable to set up this account. Please contact an administrator." }, { status: 400 });
  const now = new Date().toISOString();
  const { data: activated, error: linkError } = await admin.from("admin_members").update({ auth_user_id: created.user.id, status: "active", updated_at: now })
    .eq("id", member.id).eq("status", "invited").is("auth_user_id", null).select("id").maybeSingle();
  if (linkError || !activated) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Unable to activate this account. Please contact an administrator." }, { status: 409 });
  }
  await admin.from("admin_audit_log").insert({ admin_user_id: created.user.id, admin_email: email, action: "admin_account_activated", entity_type: "admin_member", entity_id: member.id, metadata: {} });
  return NextResponse.json({ ok: true });
}
