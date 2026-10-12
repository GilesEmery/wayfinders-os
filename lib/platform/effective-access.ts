import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, AuthorizationUnavailableError } from "@/lib/platform/authorization";
import {
  can,
  hasEntitlement,
  hasPermission,
  type AuthorizationScope,
  type EffectiveAccessSnapshot,
} from "@/lib/platform/effective-access-policy";

export { can, hasEntitlement, hasPermission };
export type { AuthorizationScope, EffectiveAccessSnapshot };

const toScope = (scopeType: string, scopeId: string | null): AuthorizationScope => {
  const type = scopeType === "global" ? "platform" : scopeType === "experience" ? "training" : scopeType;
  if (!["platform", "organization", "hub", "training", "cohort", "resource"].includes(type)
    || (type === "platform" ? scopeId !== null : !scopeId)) throw new AuthorizationUnavailableError();
  return { type: type as AuthorizationScope["type"], id: scopeId };
};

export async function resolveEffectiveAccess(authUserId: string): Promise<EffectiveAccessSnapshot> {
  const db = createAdminSupabaseClient();
  const [participant, context, roleEntitlements, rolePermissions, entitlementOverrides, permissionOverrides] = await Promise.all([
    db.from("participants").select("id").eq("auth_user_id", authUserId).maybeSingle(),
    getAuthorizationContext(authUserId),
    db.from("authorization_role_entitlements").select("role_key,entitlement_key", { count: "exact" }),
    db.from("authorization_role_permissions").select("role_key,permission_key", { count: "exact" }),
    db.from("authorization_entitlement_overrides").select("entitlement_key,effect", { count: "exact" }).eq("auth_user_id", authUserId),
    db.from("authorization_permission_overrides").select("permission_key,effect,scope_type,scope_id", { count: "exact" }).eq("auth_user_id", authUserId),
  ]).catch(() => { throw new AuthorizationUnavailableError(); });
  // A missing deny must never turn a partial snapshot into an authorization grant.
  if ([participant, roleEntitlements, rolePermissions, entitlementOverrides, permissionOverrides].some((result) => result.error)
    || !context || context.authUserId !== authUserId) throw new AuthorizationUnavailableError();
  if ([roleEntitlements, rolePermissions, entitlementOverrides, permissionOverrides].some(result => !Array.isArray(result.data) || result.count !== result.data.length)) throw new AuthorizationUnavailableError();
  if ([...(entitlementOverrides.data ?? []), ...(permissionOverrides.data ?? [])].some((row) => row.effect !== "allow" && row.effect !== "deny")) throw new AuthorizationUnavailableError();
  const entitlementMap = new Map<string, Set<string>>();
  for (const row of roleEntitlements.data ?? []) {
    if (!entitlementMap.has(row.role_key)) entitlementMap.set(row.role_key, new Set());
    entitlementMap.get(row.role_key)!.add(row.entitlement_key);
  }
  const permissionMap = new Map<string, Set<string>>();
  for (const row of rolePermissions.data ?? []) {
    if (!permissionMap.has(row.role_key)) permissionMap.set(row.role_key, new Set());
    permissionMap.get(row.role_key)!.add(row.permission_key);
  }
  const roles = [{ key: "member", scope: { type: "platform", id: null } as AuthorizationScope }];
  if (context?.globalRole) roles.push({ key: context.globalRole, scope: { type: "platform", id: null } });
  for (const assignment of context?.assignments ?? []) roles.push({ key: assignment.role, scope: toScope(assignment.scope_type, assignment.scope_id) });
  return {
    authUserId,
    isActiveMember: Boolean(participant.data),
    isSuperAdmin: context?.globalRole === "super_admin",
    roles: roles.filter((role, index) => roles.findIndex((candidate) => candidate.key === role.key && candidate.scope.type === role.scope.type && candidate.scope.id === role.scope.id) === index),
    roleEntitlements: entitlementMap,
    rolePermissions: permissionMap,
    entitlementOverrides: new Map((entitlementOverrides.data ?? []).map((row) => [row.entitlement_key, row.effect as "allow" | "deny"])),
    permissionOverrides: (permissionOverrides.data ?? []).map((row) => ({ key: row.permission_key, effect: row.effect as "allow" | "deny", scope: toScope(row.scope_type, row.scope_id) })),
  };
}
