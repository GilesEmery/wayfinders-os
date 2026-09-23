import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { can, hasEntitlement, hasPermission, type EffectiveAccessSnapshot } from "./effective-access-policy.ts";

const migration = readFileSync("supabase/migrations/20260923163326_authority_entitlements_foundation.sql", "utf8");
const endpoint = readFileSync("app/api/admin/wayfinders/[participantId]/authority/route.ts", "utf8");
const navigation = readFileSync("lib/platform/dashboard-navigation.ts", "utf8");

function snapshot(overrides: Partial<EffectiveAccessSnapshot> = {}): EffectiveAccessSnapshot {
  return {
    authUserId: "user-1", isActiveMember: true, isSuperAdmin: false,
    roles: [{ key: "member", scope: { type: "platform", id: null } }],
    roleEntitlements: new Map([["member", new Set(["my_tasks"])], ["course_creator", new Set(["manage_trainings"])]]),
    rolePermissions: new Map([["course_creator", new Set(["training.create", "training.edit_owned", "training.edit_assigned"])], ["hub_leader", new Set(["hub.manage_members"])]]),
    entitlementOverrides: new Map(), permissionOverrides: [], ...overrides,
  };
}

test("1. active PurposeOS users receive implicit Member access", () => assert.equal(hasEntitlement(snapshot(), "my_tasks"), true));
test("2. Super Admin can grant Course Creator", () => assert.match(migration, /role = 'super_admin'[\s\S]+p_key <> 'course_creator'/));
test("3. normal Admin cannot grant Course Creator", () => assert.match(endpoint, /actor\.role !== "super_admin"/));
test("4. Course Creator is not Administrator", () => assert.doesNotMatch(migration, /course_creator[\s\S]{0,80}admin_members/));
test("5. Hub Leader permission remains Hub-scoped", () => {
  const access = snapshot({ roles: [{ key: "member", scope: { type: "platform", id: null } }, { key: "hub_leader", scope: { type: "hub", id: "hub-a" } }] });
  assert.equal(hasPermission(access, "hub.manage_members", { scope: { type: "hub", id: "hub-a" } }), true);
  assert.equal(hasPermission(access, "hub.manage_members", { scope: { type: "hub", id: "hub-b" } }), false);
});
test("6. one user may lead multiple Hubs", () => {
  const access = snapshot({ roles: [{ key: "hub_leader", scope: { type: "hub", id: "hub-a" } }, { key: "hub_leader", scope: { type: "hub", id: "hub-b" } }] });
  assert.equal(hasPermission(access, "hub.manage_members", { scope: { type: "hub", id: "hub-a" } }), true);
  assert.equal(hasPermission(access, "hub.manage_members", { scope: { type: "hub", id: "hub-b" } }), true);
});
test("7. role entitlement inheritance resolves", () => assert.equal(hasEntitlement(snapshot({ roles: [{ key: "course_creator", scope: { type: "platform", id: null } }] }), "manage_trainings"), true));
test("8. explicit entitlement ALLOW works", () => assert.equal(hasEntitlement(snapshot({ entitlementOverrides: new Map([["projects", "allow"]]) }), "projects"), true));
test("9. explicit entitlement DENY overrides role default", () => assert.equal(hasEntitlement(snapshot({ entitlementOverrides: new Map([["my_tasks", "deny"]]) }), "my_tasks"), false));
test("10. removing an override returns to inherited behavior", () => assert.equal(hasEntitlement(snapshot({ entitlementOverrides: new Map() }), "my_tasks"), true));
test("11. scoped permission does not cross Hubs", () => {
  const access = snapshot({ permissionOverrides: [{ key: "hub.manage_members", effect: "allow", scope: { type: "hub", id: "hub-a" } }] });
  assert.equal(hasPermission(access, "hub.manage_members", { scope: { type: "hub", id: "hub-b" } }), false);
});
test("12. ownership-aware training edit distinguishes owned resources", () => {
  const access = snapshot({ roles: [{ key: "course_creator", scope: { type: "platform", id: null } }] });
  assert.equal(can(access, "training.edit", { ownerAuthUserId: "user-1" }), true);
  assert.equal(can(access, "training.edit", { ownerAuthUserId: "user-2" }), false);
});
test("13. Course Creator lacks publish authority", () => assert.equal(hasPermission(snapshot({ roles: [{ key: "course_creator", scope: { type: "platform", id: null } }] }), "training.publish"), false));
test("14. Course Creator lacks edit-any authority", () => assert.equal(hasPermission(snapshot({ roles: [{ key: "course_creator", scope: { type: "platform", id: null } }] }), "training.edit_any"), false));
test("15. menu metadata is entitlement-aware but documents no server grant", () => {
  assert.match(navigation, /requiresEntitlement: "manage_trainings"/);
  assert.doesNotMatch(navigation, /platform_role_assignments|admin_members/);
});
test("16. privileged mutation is Super-Admin and service-role only", () => {
  assert.match(migration, /message = 'super_admin_required'/);
  assert.match(migration, /revoke all on function[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function[\s\S]+to service_role/);
});
test("17. authority mutations write complete audit context", () => {
  assert.match(migration, /insert into public\.admin_audit_log/);
  assert.match(migration, /'scope_type', p_scope_type, 'scope_id', p_scope_id, 'occurred_at', p_now/);
});
test("18. Super Admin protection outranks explicit denial", () => assert.equal(hasEntitlement(snapshot({ isSuperAdmin: true, entitlementOverrides: new Map([["projects", "deny"]]) }), "projects"), true));
