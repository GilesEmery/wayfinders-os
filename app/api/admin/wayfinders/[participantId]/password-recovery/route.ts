import { NextResponse, type NextRequest } from "next/server";
import { auditSecurityEvent, getAdmin } from "@/lib/admin/auth";
import { assistedRecoveryUrl, canAssistPasswordRecovery } from "@/lib/admin/password-recovery-policy";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { passwordRecoveryRedirectUrl } from "@/lib/platform/password-recovery-url";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ participantId: string }> }) {
  // Never cache recovery credentials, including error responses.
  const response = await recover(request, params);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

async function recover(request: NextRequest, params: Promise<{ participantId: string }>) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) return apiError("Use the PurposeOS Admin page to reset passwords.", 403);
    const actor = await getAdmin();
    if (!actor) return apiError("Active Administrator access is required.", 403);
    const { participantId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(participantId)) return apiError("Invalid Wayfinder.", 400);
    const body = await readJsonObject(request);
    if (body.identityVerified !== true) return apiError("Confirm that you have verified this person's identity.", 400);

    const db = createAdminSupabaseClient();
    const participant = await db.from("participants").select("id,auth_user_id,email").eq("id", participantId).maybeSingle();
    if (participant.error) throw new Error("Participant lookup failed");
    if (!participant.data) return apiError("Wayfinder not found.", 404);
    const authUserId = participant.data.auth_user_id;
    if (!authUserId) return apiError("This Wayfinder has not activated a login account.", 409);
    const member = await db.from("admin_members").select("role").eq("auth_user_id", authUserId).maybeSingle();
    if (member.error) throw new Error("Target authority lookup failed");
    if (!canAssistPasswordRecovery(actor, authUserId, member.data?.role ?? null)) {
      return apiError("Admins can help regular Wayfinders. Only Super Admins can help Admins. Use self-service recovery for your own or a Super Admin account.", 403);
    }
    // Read the canonical Auth identity; never generate credentials for an
    // arbitrary email supplied by the browser or a stale CRM email.
    const target = await db.auth.admin.getUserById(authUserId);
    if (target.error || !target.data.user?.email) return apiError("The linked login account could not be verified.", 409);
    const email = target.data.user.email;
    if (email.toLowerCase() !== participant.data.email.toLowerCase()) return apiError("The profile and login emails do not match. Resolve account linking first.", 409);
    const recent = await db.from("admin_audit_log").select("id").eq("entity_type", "participant").eq("entity_id", participantId)
      .eq("action", "wayfinder.password_recovery_requested").gte("created_at", new Date(Date.now() - 60_000).toISOString()).limit(1);
    if (recent.error) throw new Error("Recovery history lookup failed");
    if (recent.data?.length) return apiError("A reset was just requested. Wait one minute before generating another.", 429);

    const metadata = { authUserId, method: "link" };
    await auditSecurityEvent(actor, "wayfinder.password_recovery_requested", "participant", participantId, metadata);
    const redirectTo = passwordRecoveryRedirectUrl(request.nextUrl.origin);
    const generated = await db.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    if (generated.error || !generated.data.properties?.hashed_token || generated.data.user?.id !== authUserId) {
      await auditSecurityEvent(actor, "wayfinder.password_recovery_failed", "participant", participantId, metadata);
      return apiError("Unable to generate a reset link. Please try again.", 503);
    }
    // Audit before returning the credential. Never record URLs, OTPs or tokens.
    await auditSecurityEvent(actor, "wayfinder.password_recovery_link_generated", "participant", participantId, metadata);
    return NextResponse.json({ ok: true, resetUrl: assistedRecoveryUrl(request.nextUrl.origin, generated.data.properties.hashed_token) });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to start password recovery. Please try again.", 500);
  }
}
