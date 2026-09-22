import { NextResponse } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { canMutateRole } from "@/lib/admin/role-authorization";

export async function PATCH(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const identity = await getAdmin();
  if (!identity) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { memberId } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "active" ? "active" : body.status === "disabled" ? "disabled" : null;
  if (!status) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  if (memberId === identity.memberId) return NextResponse.json({ error: "You cannot change your own access." }, { status: 403 });
  const admin = createAdminSupabaseClient();
  const { data: target } = await admin.from("admin_members").select("id,email,auth_user_id,role,status,invitation_accepted_at").eq("id", memberId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Administrator not found." }, { status: 404 });
  if (!canMutateRole({ actor: identity, action: status === "disabled" ? "remove" : "assign", targetRole: target.role === "super_admin" ? "super_admin" : "admin", targetUserId: target.auth_user_id ?? target.email, scope: { type: "global", id: null } })) return NextResponse.json({ error: "This protected role change is not allowed." }, { status: 403 });
  if (status === "active" && (!target.auth_user_id || !target.invitation_accepted_at)) return NextResponse.json({ error: "An unaccepted invitation cannot be enabled. Send a new invitation instead." }, { status: 409 });
  const { error } = await admin.from("admin_members").update({ status, invitation_revoked_at: target.status === "invited" && status === "disabled" ? new Date().toISOString() : undefined }).eq("id", memberId);
  if (error) return NextResponse.json({ error: "Unable to update administrator." }, { status: 400 });
  await audit(identity, target.status === "invited" && status === "disabled" ? "admin_invitation_revoked" : status === "disabled" ? "admin_disabled" : "admin_enabled", "admin_member", memberId, { targetEmail: target.email });
  return NextResponse.json({ ok: true });
}
