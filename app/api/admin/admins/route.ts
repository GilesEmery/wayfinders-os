import { NextResponse } from "next/server";
import { auditSecurityEvent, getAdmin } from "@/lib/admin/auth";
import { adminInvitationExpiresAt, adminInvitationRedirectUrl } from "@/lib/admin/invitation-security";
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
  const { data: participantAccount, error: participantError } = await admin.from("participants").select("id,auth_user_id").eq("email_normalized", email).not("auth_user_id", "is", null).maybeSingle();
  if (participantError) return NextResponse.json({ error: "Unable to verify whether this person already has a PurposeOS account." }, { status: 503 });
  if (participantAccount?.auth_user_id) return NextResponse.json({ error: "This person already has a PurposeOS account. Grant Administrator access from their Wayfinder profile instead of sending an invitation.", profileUrl: `/admin/users/${participantAccount.id}#access` }, { status: 409 });
  const { data: existing, error: existingError } = await admin.from("admin_members").select("id,status,auth_user_id").eq("email_normalized", email).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Unable to verify this administrator." }, { status: 503 });
  if (existing?.auth_user_id) return NextResponse.json({ error: "This administrator already has an account. Manage their access from their Wayfinder profile." }, { status: 409 });
  const { data: member, error: memberError } = existing
    ? await admin.from("admin_members").update({ email, status: "invited", role: "admin", invited_by: identity.memberId, invitation_issued_at: null, invitation_expires_at: null, invitation_accepted_at: null, invitation_revoked_at: null }).eq("id", existing.id).is("auth_user_id", null).select("id").single()
    : await admin.from("admin_members").insert({ email, email_normalized: email, role: "admin", status: "invited", invited_by: identity.memberId }).select("id").single();
  if (memberError || !member) return NextResponse.json({ error: "Unable to authorize this administrator." }, { status: 400 });

  const issuedAt = new Date();
  const expiresAt = adminInvitationExpiresAt(issuedAt);
  const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: adminInvitationRedirectUrl(request.url),
  });
  if (invitationError || !invitation.user) {
    await admin.from("admin_members").update({ status: "disabled", invitation_revoked_at: issuedAt.toISOString() }).eq("id", member.id).is("auth_user_id", null);
    await auditSecurityEvent(identity, "admin_invitation_issue_failed", "admin_member", member.id, { authorizedEmail: email, reason: invitationError?.message ?? "Supabase Auth did not return an invited user." });
    return NextResponse.json({ error: "Unable to send the administrator invitation. The address may already have an account." }, { status: 409 });
  }

  const { data: linked, error: linkError } = await admin.from("admin_members").update({
    auth_user_id: invitation.user.id,
    invitation_issued_at: issuedAt.toISOString(),
    invitation_expires_at: expiresAt.toISOString(),
  }).eq("id", member.id).eq("status", "invited").is("auth_user_id", null).select("id").maybeSingle();
  if (linkError || !linked) {
    await admin.auth.admin.deleteUser(invitation.user.id);
    await admin.from("admin_members").update({ status: "disabled", invitation_revoked_at: issuedAt.toISOString() }).eq("id", member.id).is("auth_user_id", null);
    await auditSecurityEvent(identity, "admin_invitation_issue_failed", "admin_member", member.id, { authorizedEmail: email, reason: "The invitation could not be bound to its administrative record." });
    return NextResponse.json({ error: "Unable to finalize the administrator invitation." }, { status: 409 });
  }

  await auditSecurityEvent(identity, "admin_invitation_issued", "admin_member", member.id, { authorizedEmail: email, role: "admin", expiresAt: expiresAt.toISOString() });
  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
}
