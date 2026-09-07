import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPlatformUser } from "@/lib/platform/auth";

export type PlatformAuthorizationContext = {
  authUserId: string;
  globalRole: "super_admin" | "admin" | null;
  assignments: Array<{ role: string; scope_type: string; scope_id: string | null }>;
};

export async function getAuthorizationContext(authUserId?: string): Promise<PlatformAuthorizationContext | null> {
  const resolvedId = authUserId ?? (await getPlatformUser())?.id;
  if (!resolvedId) return null;
  const db = createAdminSupabaseClient();
  const [{ data: member }, { data: assignments }] = await Promise.all([
    db.from("admin_members").select("role,status").eq("auth_user_id", resolvedId).eq("status", "active").maybeSingle(),
    db.from("platform_role_assignments").select("role,scope_type,scope_id").eq("auth_user_id", resolvedId).eq("status", "active"),
  ]);
  const globalRole = member?.role === "super_admin" || member?.role === "admin" ? member.role : null;
  return { authUserId: resolvedId, globalRole, assignments: assignments ?? [] };
}

export function canManagePlatform(context: PlatformAuthorizationContext | null) {
  return context?.globalRole === "super_admin" || context?.globalRole === "admin";
}

export function canPerformGlobalDestructiveAction(context: PlatformAuthorizationContext | null) {
  return context?.globalRole === "super_admin";
}

export function canManageHub(context: PlatformAuthorizationContext | null, hubId: string) {
  return canManagePlatform(context) || Boolean(context?.assignments.some((assignment) => assignment.role === "hub_leader" && assignment.scope_type === "hub" && assignment.scope_id === hubId));
}

export async function canViewHub(context: PlatformAuthorizationContext | null, hubId: string) {
  if (!context) return false;
  if (canManageHub(context, hubId)) return true;
  const db = createAdminSupabaseClient();
  const { data: participant } = await db.from("participants").select("id").eq("auth_user_id", context.authUserId).maybeSingle();
  if (!participant) return false;
  const { data: membership } = await db.from("hub_memberships").select("id").eq("participant_id", participant.id).eq("hub_id", hubId).eq("status", "active").maybeSingle();
  return Boolean(membership);
}

export async function canManageWayfinderInHub(context: PlatformAuthorizationContext | null, participantId: string, hubId: string) {
  if (!canManageHub(context, hubId)) return false;
  if (canManagePlatform(context)) return true;
  const { data } = await createAdminSupabaseClient().from("hub_memberships").select("id").eq("participant_id", participantId).eq("hub_id", hubId).eq("status", "active").maybeSingle();
  return Boolean(data);
}

export async function canManageExperienceOffering(context: PlatformAuthorizationContext | null, offeringId: string) {
  if (!context) return false;
  const db = createAdminSupabaseClient();
  const { data: offering } = await db.from("experience_offerings").select("hub_id,cohort_id").eq("id", offeringId).maybeSingle();
  if (!offering) return false;
  if (offering.hub_id) return canManageHub(context, offering.hub_id);
  if (offering.cohort_id) {
    const { data: cohort } = await db.from("cohorts").select("hub_id").eq("id", offering.cohort_id).maybeSingle();
    return cohort?.hub_id ? canManageHub(context, cohort.hub_id) : canManagePlatform(context);
  }
  return canManagePlatform(context);
}
