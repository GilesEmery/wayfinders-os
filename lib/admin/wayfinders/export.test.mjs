import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as csv from './export-csv.ts';
import * as policy from '../../platform/response-library-policy.ts';

function fixture(admin = true, person = { id: 'person', auth_user_id: 'account', full_name: 'Test person' }) {
  const queries = [], audits = [];
  const db = { from(table) {
    const q = { table, filters: [] }; queries.push(q);
    const b = {};
    for (const method of ['select', 'eq', 'order', 'range', 'in', 'maybeSingle']) b[method] = (...args) => { if (method === 'eq' || method === 'in') q.filters.push(args); if (method === 'select') q.select = args[0]; return b; };
    b.then = resolve => resolve({ data: table === 'participants' ? person : [], error: null });
    return b;
  } };
  const deps = { 'server-only': {}, '@/lib/admin/auth': { getAdmin: async () => admin ? { id: 'admin' } : null, auditSecurityEvent: async (...args) => audits.push(args) }, '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './export-csv': csv, '@/lib/platform/response-library-policy': policy };
  const compiled = ts.transpileModule(readFileSync(new URL('./export.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => { assert.ok(deps[name], name); return deps[name]; }, exports);
  return { run: exports.exportWayfinder, queries, audits };
}
test('CSV export denies non-admin users before accessing any records', async () => {
  const f = fixture(false);
  await assert.rejects(f.run('person'), error => error.status === 403);
  assert.equal(f.queries.length, 0);
});
test('CSV export returns 404 for missing people', async () => {
  const f = fixture(true, null);
  await assert.rejects(f.run('person'), error => error.status === 404);
  assert.equal(f.queries.length, 1);
});
test('CSV queries scope all person and account records, exclude authentication secrets, and audit downloads', async () => {
  const f = fixture();
  const result = await f.run('person');
  assert.ok(result.csv.includes('"full_name","Test person"'));
  assert.match(result.filename, /^wayfinder-person-\d{4}-\d{2}-\d{2}\.csv$/);
  for (const q of f.queries) {
    if (q.table === 'participants') assert.deepEqual(q.filters, [['id', 'person']]);
    else if (['platform_role_assignments', 'authorization_entitlement_overrides', 'authorization_permission_overrides', 'admin_members'].includes(q.table)) assert.deepEqual(q.filters, [['auth_user_id', 'account']]);
    else if (q.table === 'admin_audit_log') assert.deepEqual(q.filters, [['entity_type', 'participant'], ['entity_id', 'person']]);
    else assert.deepEqual(q.filters, [['participant_id', 'person']], q.table);
  }
  assert.ok(!f.queries.some(q => /session|password|credential/.test(q.table)));
  assert.ok(!f.queries.find(q => q.table === 'admin_members').select.includes('invitation'));
  assert.equal(f.audits[0][1], 'wayfinder.full_csv_exported');
});
