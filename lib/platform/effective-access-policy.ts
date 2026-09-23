export type AuthorizationScopeType = "platform" | "hub" | "training" | "cohort" | "resource";
export type AuthorizationScope = { type: AuthorizationScopeType; id: string | null };
export type AuthorizationEffect = "allow" | "deny";
export type EffectiveRole = { key: string; scope: AuthorizationScope };
export type ScopedPermissionOverride = { key: string; effect: AuthorizationEffect; scope: AuthorizationScope };

export type EffectiveAccessSnapshot = {
  authUserId: string;
  isActiveMember: boolean;
  isSuperAdmin: boolean;
  roles: EffectiveRole[];
  roleEntitlements: ReadonlyMap<string, ReadonlySet<string>>;
  rolePermissions: ReadonlyMap<string, ReadonlySet<string>>;
  entitlementOverrides: ReadonlyMap<string, AuthorizationEffect>;
  permissionOverrides: readonly ScopedPermissionOverride[];
};

export type PermissionResource = {
  scope?: AuthorizationScope;
  ownerAuthUserId?: string | null;
  assignedAuthUserIds?: readonly string[];
};

function scopeMatches(assignment: AuthorizationScope, requested: AuthorizationScope) {
  return assignment.type === "platform" || (assignment.type === requested.type && assignment.id === requested.id);
}

function applicableRoles(snapshot: EffectiveAccessSnapshot, scope: AuthorizationScope) {
  return snapshot.roles.filter((role) => scopeMatches(role.scope, scope));
}

export function hasEntitlement(snapshot: EffectiveAccessSnapshot, entitlementKey: string) {
  if (!snapshot.isActiveMember) return false;
  if (snapshot.isSuperAdmin) return true;
  const override = snapshot.entitlementOverrides.get(entitlementKey);
  if (override === "deny") return false;
  if (override === "allow") return true;
  return snapshot.roles.some((role) => snapshot.roleEntitlements.get(role.key)?.has(entitlementKey));
}

export function hasPermission(snapshot: EffectiveAccessSnapshot, permissionKey: string, resource: PermissionResource = {}) {
  if (!snapshot.isActiveMember) return false;
  if (snapshot.isSuperAdmin) return true;
  const scope = resource.scope ?? { type: "platform", id: null };
  const overrides = snapshot.permissionOverrides.filter((override) => override.key === permissionKey && scopeMatches(override.scope, scope));
  if (overrides.some((override) => override.effect === "deny")) return false;
  if (overrides.some((override) => override.effect === "allow")) return true;
  return applicableRoles(snapshot, scope).some((role) => snapshot.rolePermissions.get(role.key)?.has(permissionKey));
}

export function can(snapshot: EffectiveAccessSnapshot, action: string, resource: PermissionResource = {}) {
  if (action !== "training.edit") return hasPermission(snapshot, action, resource);
  if (hasPermission(snapshot, "training.edit_any", resource)) return true;
  if (resource.ownerAuthUserId === snapshot.authUserId && hasPermission(snapshot, "training.edit_owned", resource)) return true;
  if (resource.assignedAuthUserIds?.includes(snapshot.authUserId) && hasPermission(snapshot, "training.edit_assigned", resource)) return true;
  return false;
}
