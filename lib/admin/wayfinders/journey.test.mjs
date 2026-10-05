import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { completedJourneyRecords } from '../../platform/journey-policy.ts';

function fixture({ admin = true, person = true, fail = null, rows = {} } = {}) {
  const queries = [], audits = [], details = [];
  class AccessError extends Error { constructor(status) { super(); this.status = status; } }
  const db = { from(table) {
    const query = { table, filters: [] }; queries.push(query);
    const builder = {};
    for (const method of ['select', 'eq', 'order', 'in', 'maybeSingle']) builder[method] = (...args) => { if (method === 'select') query.select = args[0]; if (method === 'eq' || method === 'in') query.filters.push(args); return builder; };
    builder.then = resolve => resolve({ data: table === 'participants' ? person ? { id: 'person' } : null : rows[table] ?? [], error: fail === table ? new Error('failure') : null });
    return builder;
  } };
  const deps = {
    'server-only': {},
    '@/lib/admin/auth': { getAdmin: async () => admin ? { id: 'admin' } : null, auditSecurityEvent: async (...args) => audits.push(args) },
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
    '@/lib/platform/journey-policy': { completedJourneyRecords },
    '@/lib/platform/response-library': { ResponseLibraryAccessError: AccessError, loadAdminJourneyResponses: async (...args) => { details.push(args); return { name: 'Journey', courses: [] }; } },
  };
  const source = readFileSync(new URL('./journey.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => { assert.ok(deps[name], name); return deps[name]; }, exports);
  return { load: exports.loadWayfinderJourney, queries, audits, details };
}
test('non-admin requests cannot read Journey data', async () => {
  const f = fixture({ admin: false });
  await assert.rejects(f.load('person'), error => error.status === 403);
  assert.equal(f.queries.length, 0);
});
test('missing people return 404 before response data is loaded', async () => {
  const f = fixture({ person: false });
  await assert.rejects(f.load('person', { enrollmentId: 'enrollment' }), error => error.status === 404);
  assert.equal(f.details.length, 0);
});
test('Journey summaries load completion metadata without any answer payloads', async () => {
  const f = fixture({ rows: {
    experience_enrollments: [{ id: 'enrollment', experience_id: 'course', experience_version_id: 'current', cohort_id: null, status: 'in_progress', enrolled_at: '2026-01-01', completed_at: null }],
    experience_enrollment_version_history: [{ id: 'history', enrollment_id: 'enrollment', experience_id: 'course', experience_version_id: 'old', artifact_snapshot: { completed_at: '2026-02-01' } }],
    experiences: [{ id: 'course', name: 'Hub leader course', slug: 'hub-leader', experience_type: 'course' }],
    cohort_memberships: [{ cohort_id: 'cohort' }], cohorts: [{ id: 'cohort', name: 'Hub leader cohort', experience_id: 'course' }],
  } });
  const data = await f.load('person');
  assert.equal(data.records.length, 2);
  assert.equal(data.records[0].cohort, 'Hub leader cohort');
  assert.equal(data.records[1].historical, true);
  assert.equal(data.records[1].versionId, 'old');
  assert.equal(f.details.length, 0);
  assert.ok(!f.queries.some(query => ['participant_responses', 'lmu_responses', 'lmu_results'].includes(query.table)));
  assert.equal(f.queries.find(query => query.table === 'experience_enrollment_version_history').select, 'id,enrollment_id,experience_id,experience_version_id,artifact_snapshot:artifact_snapshot->completion');
  for (const table of ['experience_enrollments', 'experience_enrollment_version_history', 'lmu_assessments', 'cohort_memberships']) assert.ok(f.queries.find(query => query.table === table).filters.some(filter => filter[0] === 'participant_id' && filter[1] === 'person'));
});
test('opening a record delegates participant-scoped loading and audits access', async () => {
  const f = fixture();
  const selection = { enrollmentId: 'enrollment', versionId: 'version' };
  await f.load('person', selection);
  assert.deepEqual(f.details, [['person', selection]]);
  assert.equal(f.audits[0][1], 'wayfinder.journey_responses_viewed');
  assert.equal(f.audits[0][3], 'person');
});
test('database failures do not become misleading empty records', async () => {
  const f = fixture({ fail: 'experience_enrollments' });
  await assert.rejects(f.load('person'), /Unable to load Journey records/);
});
