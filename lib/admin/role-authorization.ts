import "server-only";

import type { AdminIdentity } from "@/lib/admin/auth";

export const protectedGlobalRoles = ["super_admin", "admin"] as const;
export const scopedOperationalRoles = ["hub_leader", "facilitator", "organization_admin"] as const;

export type ManagedRole = typeof protectedGlobalRoles[number] | typeof scopedOperationalRoles[number];
export type RoleMutationAction = "assign" | "remove";
export type RoleScope = { type: "global" | "hub" | "cohort" | "organization"; id: string | null };

const requiredScope: Record<ManagedRole, RoleScope["type"]> = {
  super_admin: "global",
  admin: "global",
  hub_leader: "hub",
  facilitator: "cohort",
  organization_admin: "organization",
};

export function isManagedRole(value: string): value is ManagedRole {
  return [...protectedGlobalRoles, ...scopedOperationalRoles].includes(value as ManagedRole);
}

export function canMutateRole({ actor, action, targetRole, targetUserId, scope }: {
  actor: Pick<AdminIdentity, "id" | "role">;
  action: RoleMutationAction;
  targetRole: ManagedRole;
  targetUserId: string;
  scope: RoleScope;
}) {
  if (requiredScope[targetRole] !== scope.type) return false;
  if (scope.type === "global" ? scope.id !== null : !scope.id) return false;
  if (actor.id === targetUserId && action === "assign") return false;
  if (protectedGlobalRoles.includes(targetRole as typeof protectedGlobalRoles[number])) {
    return actor.role === "super_admin" && actor.id !== targetUserId;
  }
  return actor.role === "super_admin" || actor.role === "admin";
}

export function assertCanMutateRole(input: Parameters<typeof canMutateRole>[0]) {
  if (!canMutateRole(input)) throw new RoleAuthorizationError();
}

export class RoleAuthorizationError extends Error {
  status = 403;
  constructor() { super("You do not have permission to change this role or scope."); }
}
