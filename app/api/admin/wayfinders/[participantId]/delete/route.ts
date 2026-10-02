import { NextResponse, type NextRequest } from "next/server";
import { getAdmin, auditSecurityEvent } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";

function deletionError(message: string, code?: string) {
  if (message.includes("super_admin_required")) return apiError("Only Super Admins can delete users.", 403);
  if (message.includes("self_deletion_not_allowed")) return apiError("You cannot delete your own account.", 403);
  if (message.includes("super_admin_is_protected")) return apiError("Super Admin accounts are protected from deletion.", 403);
  if (message.includes("confirmation_email_mismatch")) return apiError("Type the user's email address to confirm deletion.", 400);
  if (message.includes("participant_not_found")) return apiError("This user no longer exists.", 404);
  if (code === "PGRST202") return apiError("User deletion is not available until the database migration is installed.", 503);
  return apiError("Unable to delete this user. Shared call history, files, or administrative records may need to be transferred first. No profile cleanup is committed when account deletion fails.", 409);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const actor = await getAdmin();
    if (!actor || actor.role !== "super_admin") return apiError("Only Super Admins can delete users.", 403);
    const { participantId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(participantId)) return apiError("Invalid user.", 400);
    const body = await readJsonObject(request);
    if (typeof body.confirmationEmail !== "string" || !body.confirmationEmail.trim()) return apiError("Type the user's email address to confirm deletion.", 400);
    const db = createAdminSupabaseClient();
    const args = { p_actor_id: actor.id, p_participant_id: participantId, p_confirmation_email: body.confirmationEmail };
    // This also verifies the cleanup trigger's migration is installed before
    // invoking Auth; deleting only a login would leave a misleading CRM record.
    const prepared = await db.rpc("prepare_wayfinder_deletion", args);
    if (prepared.error) return deletionError(prepared.error.message, prepared.error.code);
    const target = prepared.data as { authUserId: string | null; email: string };
    if (!target.authUserId) {
      const deleted = await db.rpc("delete_unactivated_wayfinder", args);
      if (deleted.error) return deletionError(deleted.error.message, deleted.error.code);
    } else {
      if (target.authUserId === actor.id) return apiError("You cannot delete your own account.", 403);
      await auditSecurityEvent(actor, "wayfinder.deletion_requested", "participant", participantId, { authUserId: target.authUserId });
      // Supabase removes sessions and identities; our database trigger removes
      // the linked profile and saved work within that same transaction.
      const deleted = await db.auth.admin.deleteUser(target.authUserId, false);
      if (deleted.error) return deletionError(deleted.error.message, deleted.error.code);
      // A completion-log outage must not report that an already-deleted account
      // is still present. The mandatory request audit remains available.
      try { await auditSecurityEvent(actor, "wayfinder.deleted", "participant", participantId, { authUserId: target.authUserId }); }
      catch { console.error("Unable to record user-deletion completion audit", { participantId }); }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to delete this user. Please try again.", 500);
  }
}
