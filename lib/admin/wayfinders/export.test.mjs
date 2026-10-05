import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as csv from './export-csv.ts';
import * as policy from '../../platform/response-library-policy.ts';

function fixture(admin = true, person = { id: 'person', full_name: 'Test person' }, tables = {}) {
  const queries = [], audits = [];
  const db = { from(table) {
    const q = { table, filters: [] }; queries.push(q);
    const b = {};
    for (const method of ['select', 'eq', 'order', 'range', 'in', 'maybeSingle']) b[method] = (...args) => { if (method === 'eq' || method === 'in') q.filters.push(args); if (method === 'select') q.select = args[0]; return b; };
    b.then = resolve => resolve({ data: table === 'participants' ? person : tables[table] ?? [], error: null });
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
test('CSV exports responses, excludes activity and account records, and audits downloads', async () => {
  const f = fixture(true, undefined, {
    participant_responses: [{ id: 'answer', participant_id: 'person', response_data: { answer: 'My response' }, created_at: 'tracking-date', finalized_at: 'tracking-finalized',  }],
    lmu_assessments: [{ id: 'assessment', participant_id: 'person' }],
    lmu_responses: [{ id: 'lmu-answer', assessment_id: 'assessment', response_data: { answer: 'Assessment response' } }],
    lmu_results: [{ id: 'result', assessment_id: 'assessment', result_data: { score: 42 } }],
    participant_companion_entries: [{ id: 'entry', entry_data: { reflection: 'My reflection' } }],
    participant_personal_notes: [{ id: 'note', content: 'My note' }],
    experience_enrollment_version_history: [
      { id: 'history', artifact_snapshot: { removed_responses: [{ response_data: { answer: 'Archived answer' } }], removed_sections: [{ clicks: 99 }], completion: { completed_at: 'old' } } },
      { id: 'activity-only', artifact_snapshot: { completion: { completed_at: 'old' } } },
    ],
  });
  const result = await f.run('person');
  for (const value of ['Test person', 'My response', 'Assessment response', '42', 'My reflection', 'My note', 'Archived answer']) assert.ok(result.csv.includes(value), value);
  for (const value of ['removed_sections', 'clicks', 'activity-only', 'completed_at', 'tracking-date', 'tracking-enrollment', 'tracking-finalized', 'created_at', 'participant_id']) assert.ok(!result.csv.includes(value), value);
  assert.match(result.filename, /^wayfinder-person-\d{4}-\d{2}-\d{2}\.csv$/);
  for (const q of f.queries) {
    if (q.table === 'participants') {
      assert.deepEqual(q.filters, [['id', 'person']]);
      assert.equal(q.select, 'id,full_name');
    } else if (['lmu_responses', 'lmu_results'].includes(q.table)) assert.deepEqual(q.filters, [['assessment_id', ['assessment']]]);
    else assert.deepEqual(q.filters, [['participant_id', 'person']], q.table);
  }
  assert.ok(!f.queries.some(q => /progress|audit_log|membership|preferences|roles|overrides|admin_members/.test(q.table)));
  assert.equal(f.audits[0][1], 'wayfinder.responses_csv_exported');
});
