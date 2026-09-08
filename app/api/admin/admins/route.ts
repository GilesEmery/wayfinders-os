import { NextResponse } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { canMutateRole } from "@/lib/admin/role-authorization";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(request: Request) {
  const identity = await getAdmin();
  if (!identity) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!canMutateRole({ actor: identity, action: "assign", targetRole: "admin", targetUserId: email, scope: { type: "global", id: null } })) return NextResponse.json({ error: "This protected role change is not allowed." }, { status: 403 });
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.from("admin_members").select("id,status,auth_user_id").eq("email_normalized", email).maybeSingle();
  if (existing?.auth_user_id) return NextResponse.json({ error: "This administrator already has an account." }, { status: 409 });
  const { data: member, error: memberError } = existing
    ? await admin.from("admin_members").update({ email, status: "invited", role: "admin", invited_by: identity.memberId }).eq("id", existing.id).select("id").single()
    : await admin.from("admin_members").insert({ email, email_normalized: email, role: "admin", status: "invited", invited_by: identity.memberId }).select("id").single();
  if (memberError || !member) return NextResponse.json({ error: "Unable to authorize this administrator." }, { status: 400 });
  await audit(identity, "admin_added", "admin_member", member.id, { authorizedEmail: email, role: "admin" });
  return NextResponse.json({ ok: true });
}
