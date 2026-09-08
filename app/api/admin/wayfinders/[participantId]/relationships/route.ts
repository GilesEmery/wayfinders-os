import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { assertCanMutateRole, RoleAuthorizationError, type ManagedRole } from "@/lib/admin/role-authorization";

const kinds = ["organization", "hub", "cohort", "tag", "default_hub"] as const;
type Kind = typeof kinds[number];

export async function POST(request: NextRequest, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const identity = await getAdmin();
    if (!identity) return apiError("Purpose OS Admin access is required.", 403);
    const { participantId } = await params;
    const body = await readJsonObject(request);
    const kind = typeof body.kind === "string" && kinds.includes(body.kind as Kind) ? body.kind as Kind : null;
    const targetId = typeof body.targetId === "string" ? body.targetId : "";
    const operation = body.operation === "remove" ? "remove" : "assign";
    const requestedRole = typeof body.role === "string" ? body.role : "member";
    if (!kind || (!targetId && kind !== "default_hub")) return apiError("Choose a valid relationship.", 400);
    const db = createAdminSupabaseClient();
    const { data: participant } = await db.from("participants").select("id,auth_user_id").eq("id", participantId).maybeSingle();
    if (!participant) return apiError("Wayfinder not found.", 404);
    const roleScope = requestedRole === "hub_leader" ? { role: "hub_leader" as ManagedRole, type: "hub" as const }
      : requestedRole === "facilitator" ? { role: "facilitator" as ManagedRole, type: "cohort" as const }
      : requestedRole === "organization_admin" ? { role: "organization_admin" as ManagedRole, type: "organization" as const }
      : null;
    if (roleScope) {
      if (!participant.auth_user_id) return apiError("This Wayfinder must claim an account before receiving authorization.", 400);
      assertCanMutateRole({ actor: identity, action: operation, targetRole: roleScope.role, targetUserId: participant.auth_user_id, scope: { type: roleScope.type, id: targetId } });
    }

    if (kind === "organization") {
      const role = ["member", "leader", "organization_admin"].includes(requestedRole) ? requestedRole : "member";
      if (operation === "remove") await db.from("organization_memberships").delete().eq("participant_id", participantId).eq("organization_id", targetId);
      else await db.from("organization_memberships").upsert({ participant_id: participantId, organization_id: targetId, membership_role: role, status: "active", joined_at: new Date().toISOString() }, { onConflict: "organization_id,participant_id" });
      if (participant.auth_user_id && role === "organization_admin") {
        if (operation === "remove") await db.from("platform_role_assignments").delete().eq("auth_user_id", participant.auth_user_id).eq("role", "organization_admin").eq("scope_type", "organization").eq("scope_id", targetId);
        else {
          await db.from("platform_role_assignments").delete().eq("auth_user_id", participant.auth_user_id).eq("role", "organization_admin").eq("scope_type", "organization").eq("scope_id", targetId);
          await db.from("platform_role_assignments").insert({ auth_user_id: participant.auth_user_id, role: "organization_admin", scope_type: "organization", scope_id: targetId, granted_by: identity.id, status: "active" });
        }
      }
    }
    if (kind === "hub") {
      const role = requestedRole === "hub_leader" ? "hub_leader" : "member";
      if (operation === "remove") {
        await db.from("hub_memberships").delete().eq("participant_id", participantId).eq("hub_id", targetId);
        await db.from("participant_preferences").update({ default_hub_id: null }).eq("participant_id", participantId).eq("default_hub_id", targetId);
      }
      else await db.from("hub_memberships").upsert({ participant_id: participantId, hub_id: targetId, membership_role: role, status: "active", joined_at: new Date().toISOString() }, { onConflict: "hub_id,participant_id" });
      if (participant.auth_user_id) {
        if (operation === "remove" || role !== "hub_leader") await db.from("platform_role_assignments").delete().eq("auth_user_id", participant.auth_user_id).eq("role", "hub_leader").eq("scope_type", "hub").eq("scope_id", targetId);
        if (operation === "assign" && role === "hub_leader") {
          await db.from("platform_role_assignments").delete().eq("auth_user_id", participant.auth_user_id).eq("role", "hub_leader").eq("scope_type", "hub").eq("scope_id", targetId);
          await db.from("platform_role_assignments").insert({ auth_user_id: participant.auth_user_id, role: "hub_leader", scope_type: "hub", scope_id: targetId, granted_by: identity.id, status: "active" });
        }
      }
    }
    if (kind === "cohort") {
      const role = requestedRole === "facilitator" ? "facilitator" : "participant";
      if (operation === "remove") await db.from("cohort_memberships").delete().eq("participant_id", participantId).eq("cohort_id", targetId).eq("membership_role", role);
      else await db.from("cohort_memberships").upsert({ participant_id: participantId, cohort_id: targetId, membership_role: role, status: "active", joined_at: new Date().toISOString() }, { onConflict: "cohort_id,participant_id,membership_role" });
      if (participant.auth_user_id && role === "facilitator") {
        if (operation === "remove") await db.from("platform_role_assignments").delete().eq("auth_user_id", participant.auth_user_id).eq("role", "facilitator").eq("scope_type", "cohort").eq("scope_id", targetId);
        else {
          await db.from("platform_role_assignments").delete().eq("auth_user_id", participant.auth_user_id).eq("role", "facilitator").eq("scope_type", "cohort").eq("scope_id", targetId);
          await db.from("platform_role_assignments").insert({ auth_user_id: participant.auth_user_id, role: "facilitator", scope_type: "cohort", scope_id: targetId, granted_by: identity.id, status: "active" });
        }
      }
    }
    if (kind === "tag") {
      if (operation === "assign") {
        const { data: tag } = await db.from("tags").select("id").eq("id", targetId).eq("status", "active").maybeSingle();
        if (!tag) return apiError("Archived or unavailable classifications cannot be assigned.", 400);
      }
      if (operation === "remove") await db.from("participant_tags").delete().eq("participant_id", participantId).eq("tag_id", targetId);
      else await db.from("participant_tags").upsert({ participant_id: participantId, tag_id: targetId, assigned_by: identity.id }, { onConflict: "participant_id,tag_id" });
    }
    if (kind === "default_hub") {
      if (targetId) {
        const { data: membership } = await db.from("hub_memberships").select("id").eq("participant_id", participantId).eq("hub_id", targetId).eq("status", "active").maybeSingle();
        if (!membership) return apiError("The default Hub must be an active Hub membership.", 400);
      }
      const { error } = await db.from("participant_preferences").upsert({ participant_id: participantId, default_hub_id: targetId || null }, { onConflict: "participant_id" });
      if (error) return apiError("Unable to update the default Hub.", 400);
    }

    await audit(identity, `${operation === "remove" ? "removed" : "assigned"}_wayfinder_${kind}`, "participant", participantId, { target_id: targetId, role: requestedRole });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) return apiError(error.message, error.status);
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to update this Wayfinder relationship.", 500);
  }
}
