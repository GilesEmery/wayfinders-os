import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const participantId = '00000000-0000-4000-8000-000000000010';
function fixture(options = {}) {
  const calls = [];
  const actor = options.actor === undefined ? { id: 'actor', role: 'super_admin', email: 'actor@example.test' } : options.actor;
  const db = {
    rpc: async (name, args) => { calls.push({ name, args }); return name === 'prepare_wayfinder_deletion' ? { data: { authUserId: options.unactivated ? null : options.self ? 'actor' : 'target', email: 'test@example.test' }, error: options.prepareError ?? null } : { error: options.profileError ?? null }; },
    auth: { admin: { deleteUser: async (...args) => { calls.push({ name: 'auth.deleteUser', args }); return { error: options.authError ?? null }; } } },
  };
  const dependencies = {
    'next/server': { NextResponse: { json: (body) => ({ status: 200, body }) } },
    '@/lib/admin/auth': { getAdmin: async () => actor, auditSecurityEvent: async (_actor, action) => { calls.push({ name: action }); if (options.auditError) throw new Error('Audit failure'); } },
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
    '@/lib/experiences/lmu/server/http': { apiError: (error, status) => ({ body: { error }, status }), readJsonObject: async () => options.body ?? { confirmationEmail: 'test@example.test' }, PayloadError: class extends Error {} },
  };
  const source = readFileSync(new URL('../../app/api/admin/wayfinders/[participantId]/delete/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name) => dependencies[name], exports);
  return { calls, run: () => exports.DELETE({}, { params: Promise.resolve({ participantId }) }) };
}
for (const actor of [null, { id: 'admin', role: 'admin' }]) test(`only Super Admins can invoke deletion: ${actor?.role ?? 'signed out'}`, async () => {
  const f = fixture({ actor }); assert.equal((await f.run()).status, 403); assert.deepEqual(f.calls, []);
});
test('confirmation is required before any database mutation', async () => {
  const f = fixture({ body: {} }); assert.equal((await f.run()).status, 400); assert.deepEqual(f.calls, []);
});
for (const reason of ['super_admin_is_protected', 'self_deletion_not_allowed', 'confirmation_email_mismatch']) test(`database guard blocks deletion: ${reason}`, async () => {
  const f = fixture({ prepareError: { message: reason } }); assert.ok((await f.run()).status >= 400); assert.equal(f.calls.length, 1);
});
test('missing cleanup migration prevents login-only deletion', async () => {
  const f = fixture({ prepareError: { message: 'Missing function', code: 'PGRST202' } }); assert.equal((await f.run()).status, 503); assert.equal(f.calls.length, 1);
});
test('activated users use hard Auth deletion after a mandatory audit', async () => {
  const f = fixture(); assert.equal((await f.run()).status, 200);
  assert.deepEqual(f.calls.map((call) => call.name), ['prepare_wayfinder_deletion', 'wayfinder.deletion_requested', 'auth.deleteUser', 'wayfinder.deleted']);
  assert.deepEqual(f.calls[2].args, ['target', false]);
});
test('unactivated profiles use the authorized transactional RPC', async () => {
  const f = fixture({ unactivated: true }); assert.equal((await f.run()).status, 200);
  assert.deepEqual(f.calls.map((call) => call.name), ['prepare_wayfinder_deletion', 'delete_unactivated_wayfinder']);
  assert.equal(f.calls[1].args.p_actor_id, 'actor');
});
test('a self target returned by the database cannot reach Auth deletion', async () => {
  const f = fixture({ self: true }); assert.equal((await f.run()).status, 403); assert.equal(f.calls.length, 1);
});
test('audit failure prevents account deletion', async () => {
  const f = fixture({ auditError: true }); assert.equal((await f.run()).status, 500); assert.ok(!f.calls.some((call) => call.name === 'auth.deleteUser'));
});
test('Auth failure reports failure without running a separate profile delete', async () => {
  const f = fixture({ authError: { message: 'Database constraint failure' } }); assert.equal((await f.run()).status, 409); assert.ok(!f.calls.some((call) => call.name === 'delete_unactivated_wayfinder' || call.name === 'wayfinder.deleted'));
});
