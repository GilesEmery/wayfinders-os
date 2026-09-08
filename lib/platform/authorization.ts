import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPlatformUser } from "@/lib/platform/auth";

export type PlatformAuthorizationContext = {
  authUserId: string;
  globalRole: "super_admin" | "admin" | null;
  assignments: Array<{ role: string; scope_type: string; scope_id: string | null }>;
};

export type DashboardCapabilities = {
  isWayfinder: true;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  globalRole: "super_admin" | "admin" | null;
  hubLeaderships: Array<{ hubId: string }>;
};

export async function getAuthorizationContext(authUserId?: string, userEmail?: string): Promise<PlatformAuthorizationContext | null> {
  const platformUser = authUserId && userEmail ? null : await getPlatformUser();
  const resolvedId = authUserId ?? platformUser?.id;
  if (!resolvedId) return null;
  const db = createAdminSupabaseClient();
  const [memberResult, assignmentsResult] = await Promise.all([
    db.from("admin_members").select("role,status").eq("auth_user_id", resolvedId).eq("status", "active").maybeSingle(),
    db.from("platform_role_assignments").select("role,scope_type,scope_id").eq("auth_user_id", resolvedId).eq("status", "active"),
  ]);
  let member = memberResult.data;
  const assignments = assignmentsResult.data;
  const normalizedEmail = (userEmail ?? platformUser?.email)?.trim().toLowerCase();
  if (!member && normalizedEmail) {
    const invited = await db.from("admin_members").select("id,role,status,auth_user_id").eq("email_normalized", normalizedEmail).in("status", ["active", "invited"]).maybeSingle();
    if (invited.data && !invited.data.auth_user_id) {
      const linked = await db.from("admin_members").update({ auth_user_id: resolvedId, status: "active", last_login_at: new Date().toISOString() }).eq("id", invited.data.id).is("auth_user_id", null).select("role,status").maybeSingle();
      member = linked.data;
    } else if (invited.data?.auth_user_id === resolvedId && invited.data.status === "active") {
      member = invited.data;
    }
  }
  const globalRole = member?.role === "super_admin" || member?.role === "admin" ? member.role : null;
  return { authUserId: resolvedId, globalRole, assignments: assignments ?? [] };
}

export async function resolveDashboardCapabilities(authUserId: string, userEmail?: string): Promise<DashboardCapabilities> {
  const context = await getAuthorizationContext(authUserId, userEmail);
  return {
    isWayfinder: true,
    isAdmin: context?.globalRole === "admin" || context?.globalRole === "super_admin",
    isSuperAdmin: context?.globalRole === "super_admin",
    globalRole: context?.globalRole ?? null,
    hubLeaderships: (context?.assignments ?? []).filter((assignment) => assignment.role === "hub_leader" && assignment.scope_type === "hub" && assignment.scope_id).map((assignment) => ({ hubId: assignment.scope_id! })),
  };
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
