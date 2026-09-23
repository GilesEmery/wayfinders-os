import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { assertCanMutateRole, RoleAuthorizationError, type ManagedRole } from "@/lib/admin/role-authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";

const messages: Record<string, string> = {
  active_administrator_required: "Active administrator access is required.",
  super_admin_required: "Only Super Admins can change administrator access.",
  participant_not_found: "Wayfinder not found.",
  existing_auth_account_required: "This Wayfinder must activate their PurposeOS account before receiving authority.",
  self_admin_mutation_not_allowed: "You cannot change your own administrator access from this profile.",
  super_admin_is_protected: "Super Admin authority cannot be changed from this control.",
  administrator_identity_conflict: "This email is connected to a different administrator identity.",
  active_hub_required: "Choose an active Hub.",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const actor = await getAdmin();
    if (!actor) return apiError("PurposeOS Administrator access is required.", 403);
    const { participantId } = await params;
    const body = await readJsonObject(request);
    const role = body.role === "admin" || body.role === "hub_leader" ? body.role : null;
    const enabled = typeof body.enabled === "boolean" ? body.enabled : null;
    const hubId = role === "hub_leader" && typeof body.hubId === "string" ? body.hubId : null;
    if (!role || enabled === null || (role === "hub_leader" && !hubId)) return apiError("Choose a valid authority change.", 400);

    const db = createAdminSupabaseClient();
    const participant = await db.from("participants").select("id,auth_user_id").eq("id", participantId).maybeSingle();
    if (participant.error || !participant.data) return apiError("Wayfinder not found.", 404);
    if (!participant.data.auth_user_id) return apiError("This Wayfinder must activate their PurposeOS account before receiving authority.", 400);

    const targetRole = role as ManagedRole;
    assertCanMutateRole({
      actor,
      action: enabled ? "assign" : "remove",
      targetRole,
      targetUserId: participant.data.auth_user_id,
      scope: role === "admin" ? { type: "global", id: null } : { type: "hub", id: hubId },
    });

    const result = await db.rpc("manage_existing_user_authority", {
      p_actor_auth_user_id: actor.id,
      p_target_participant_id: participantId,
      p_role: role,
      p_enabled: enabled,
      p_hub_id: hubId,
    });
    if (result.error) {
      const known = Object.entries(messages).find(([key]) => result.error.message.includes(key));
      return apiError(known?.[1] ?? "Unable to change this authority assignment.", result.error.code === "42501" ? 403 : 400);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) return apiError(error.message, error.status);
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to change this authority assignment.", 500);
  }
}
