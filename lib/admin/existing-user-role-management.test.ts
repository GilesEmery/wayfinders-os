import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260923132211_secure_existing_user_role_management.sql", "utf8");
const endpoint = readFileSync("app/api/admin/wayfinders/[participantId]/authority/route.ts", "utf8");
const relationshipEndpoint = readFileSync("app/api/admin/wayfinders/[participantId]/relationships/route.ts", "utf8");
const invitationEndpoint = readFileSync("app/api/admin/admins/route.ts", "utf8");
const manager = readFileSync("components/admin/WayfinderAuthorityManager.tsx", "utf8");

test("Super Admin can grant Admin to an existing authenticated user", () => {
  assert.match(migration, /v_actor\.role <> 'super_admin'/);
  assert.match(migration, /role = 'admin',\s+status = 'active'/);
  assert.match(migration, /existing_auth_account_required/);
});

test("Super Admin can remove Admin while preserving the user account", () => {
  assert.match(migration, /set status = 'disabled'[\s\S]+role = 'admin'/);
  assert.doesNotMatch(migration, /delete from auth\.users/);
});

test("ordinary Admin cannot grant Admin", () => {
  assert.match(migration, /raise exception using errcode = '42501', message = 'super_admin_required'/);
  assert.match(endpoint, /assertCanMutateRole/);
});

test("ordinary Admin cannot remove Admin", () => {
  assert.match(manager, /actorRole !== "super_admin"/);
  assert.match(manager, /Only Super Admins can change administrator access/);
});

test("Admin and Super Admin can grant a Hub Leader role", () => {
  assert.match(migration, /role in \('admin', 'super_admin'\)/);
  assert.match(migration, /v_target\.auth_user_id, 'hub_leader', 'hub', p_hub_id, 'active'/);
});

test("Admin and Super Admin can remove a Hub Leader role", () => {
  assert.match(migration, /delete from public\.platform_role_assignments[\s\S]+role = 'hub_leader'[\s\S]+scope_id = p_hub_id/);
});

test("Hub Leader authority is scoped to exactly one Hub", () => {
  assert.match(migration, /scope_type = 'hub'/);
  assert.match(migration, /scope_id = p_hub_id/);
  assert.match(endpoint, /scope: role === "admin" \? \{ type: "global", id: null \} : \{ type: "hub", id: hubId \}/);
});

test("removing one Hub Leader role preserves unrelated Hub scopes", () => {
  assert.match(migration, /role = 'hub_leader'\s+and scope_type = 'hub'\s+and scope_id = p_hub_id/);
});

test("removing Hub Leader authority preserves membership and demotes capacity", () => {
  assert.match(migration, /update public\.hub_memberships\s+set membership_role = 'member'/);
  assert.doesNotMatch(migration, /delete from public\.hub_memberships/);
});

test("granting Hub Leader authority creates or restores Hub membership", () => {
  assert.match(migration, /insert into public\.hub_memberships[\s\S]+on conflict \(hub_id, participant_id\) do update/);
});

test("role mutations are audited in the same database transaction", () => {
  assert.match(migration, /insert into public\.admin_audit_log/);
  assert.match(migration, /'target_auth_user_id', v_target\.auth_user_id/);
  assert.match(migration, /'occurred_at', p_now/);
});

test("the authority mutation function is service-role-only", () => {
  assert.match(migration, /security invoker/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function[\s\S]+to service_role/);
});

test("self-demotion and Super Admin mutation are blocked", () => {
  assert.match(migration, /self_admin_mutation_not_allowed/);
  assert.match(migration, /super_admin_is_protected/);
  assert.doesNotMatch(migration, /set[\s\S]{0,120}role = 'super_admin'/);
});

test("existing-user promotion does not send an invitation", () => {
  assert.doesNotMatch(endpoint, /inviteUserByEmail/);
  assert.doesNotMatch(migration, /auth\.users|invitation_issued_at = p_now/);
});

test("new-user invitation remains separate and detects existing PurposeOS users", () => {
  assert.match(invitationEndpoint, /inviteUserByEmail/);
  assert.match(invitationEndpoint, /participants/);
  assert.match(invitationEndpoint, /profileUrl: `\/admin\/users\/\$\{participantAccount\.id\}#access`/);
});

test("legacy Hub relationship mutations delegate leadership to the atomic RPC", () => {
  assert.match(relationshipEndpoint, /db\.rpc\("manage_existing_user_authority"/);
  assert.match(relationshipEndpoint, /Remove Hub Leader authority before removing this Hub membership/);
});
