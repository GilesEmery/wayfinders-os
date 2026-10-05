import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as policy from './response-library-policy.ts';

function fixture(enrolled, lmu = {}, admin = true) {
  let structureReads = 0;
  const queries = [];
  const block = { id: 'block', block_type: 'system_component', custom_renderer_key: 'wayfinders-ethos-assessment.v1' };
  const structure = { experience: { id: 'experience', name: 'Ethos', slug: 'wayfinders-ethos', experience_type: 'assessment' }, version: { version_label: 'Published' }, modules: [{ id: 'module', title: 'Ethos', lessons: [{ title: 'Reflection', sections: [{ title: '', layout: { columns: [{ blocks: [block] }] } }] }] }] };
  const db = { from(table) {
    const query = { table, filters: [] }; queries.push(query);
    const builder = {};
    for (const method of ['select', 'eq', 'order', 'in', 'maybeSingle']) builder[method] = (...args) => { if (method === 'eq' || method === 'in') query.filters.push(args); if (method === 'select') query.selection = args[0]; return builder; };
    builder.then = (resolve) => resolve({ data: table === 'response_definitions' ? [{ id: 'definition', block_id: 'block', response_key: 'wayfinders_ethos_assessment', label: 'Ethos', configuration: {} }] : (Object.hasOwn(lmu, table) ? lmu[table] : []), error: null });
    return builder;
  } };
  const dependencies = {
    'server-only': {},
    '@/lib/admin/auth': { getAdmin: async () => admin ? { id: 'admin' } : null },
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
    './auth': {}, './authorization': {},
    '@/lib/experiences/access/server': { needsExperiencePassword: async () => false },
    '@/lib/experiences/builder/data': { getExperienceStructure: async () => { structureReads++; return structure; } },
    '@/lib/experiences/builder/participant-runtime': { effectiveDeliveryStructure: async (value) => value },
    '@/lib/experiences/builder/prebuilt-assessment': {},
    './response-library-policy': policy,
  };
  const source = readFileSync(new URL('./response-library.ts', import.meta.url), 'utf8').replace('async function loadCourse(', 'export async function loadCourse(').replace('function responseLoadContext(', 'export function responseLoadContext(').replace('async function lmuActivities(', 'export async function lmuActivities(');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name) => { assert.ok(dependencies[name], name); return dependencies[name]; }, exports);
  return { queries, exports, structureReads: () => structureReads, load: () => exports.loadCourse('member', { id: enrolled ? 'enrollment' : null, experience_id: 'experience' }, 'version', null, true, exports.responseLoadContext(true)) };
}
test('cohort loader keeps every assessment question when the enrollment has no saved answers', async () => {
  const f = fixture(true);
  const course = await f.load();
  const activity = course.weeks[0].activities[0];
  assert.equal(activity.status, 'not_started');
  assert.equal(activity.items.length, 15);
  assert.ok(activity.items.every((item) => item.answered === false));
  assert.deepEqual(activity.results, []);
  const responses = f.queries.find((query) => query.table === 'participant_responses');
  assert.deepEqual(responses.filters, [['participant_id', 'member'], ['enrollment_id', 'enrollment'], ['experience_version_id', 'version'], ['response_definition_id', ['definition']]]);
});
test('an unstarted linked assessment loads authored questions without querying other enrollments', async () => {
  const f = fixture(false);
  const course = await f.load();
  assert.equal(course.weeks[0].activities[0].items.length, 15);
  assert.deepEqual(f.queries.map((query) => query.table), ['response_definitions']);
});

test('course structures are reused only inside the same response request', async () => {
  const f = fixture(true);
  const context = f.exports.responseLoadContext(true);
  await Promise.all([context.structure('experience', 'version'), context.structure('experience', 'version')]);
  assert.equal(f.structureReads(), 1);
  await f.exports.responseLoadContext(true).structure('experience', 'version');
  assert.equal(f.structureReads(), 2);
});
test('history reads fetch only archived responses instead of full artifact snapshots', async () => {
  const f = fixture(true);
  await f.load();
  assert.equal(f.queries.find((query) => query.table === 'experience_enrollment_version_history').selection, 'id,artifact_snapshot:artifact_snapshot->removed_responses,ended_at');
});
test('Life Mapping U attempts use two batched reads and keep each attempt separate', async () => {
  const f = fixture(true, {
    lmu_assessments: [{ id: 'first', status: 'completed' }, { id: 'second', status: 'in_progress' }],
    lmu_responses: [{ assessment_id: 'first', section_key: 'reflection', response_data: { answer: 'First answer' } }, { assessment_id: 'second', section_key: 'reflection', response_data: { answer: 'Second answer' } }],
  });
  const activities = await f.exports.lmuActivities('member');
  assert.equal(activities.length, 2);
  assert.equal(activities[0].items[0].response, 'First answer');
  assert.equal(activities[1].items[0].response, 'Second answer');
  assert.equal(f.queries.length, 3);
  assert.deepEqual(f.queries[1].filters, [['assessment_id', ['first', 'second']]]);
});
test('projected archived response arrays still restore saved submissions', async () => {
  const f = fixture(true, {
    experience_enrollment_version_history: [{ id: 'archive', ended_at: '2026-10-02', artifact_snapshot: [{ response_definition_id: 'definition', response_data: {}, status: 'submitted', finalized_at: '2026-10-01' }] }],
  });
  const course = await f.load();
  const activity = course.weeks[0].activities[0];
  assert.equal(activity.id, 'history:archive:definition');
  assert.equal(activity.status, 'submitted');
  assert.equal(activity.updatedAt, '2026-10-01');
});

test('outline loads headings without any participant answers or archived snapshots', async () => {
  const f = fixture(true);
  const course = await f.exports.loadCourse('member', { id: 'enrollment', experience_id: 'experience' }, 'version', null, false, f.exports.responseLoadContext(true, { outline: true }));
  assert.equal(course.weeks[0].activities[0].loadKey, 'version:assessment:block');
  assert.deepEqual(course.weeks[0].activities[0].items, []);
  assert.ok(f.queries.every((query) => !['participant_responses', 'experience_enrollment_version_history', 'experience_enrollments', 'lmu_responses', 'lmu_results'].includes(query.table)));
});
test('opening an unrelated box reads no participant answers', async () => {
  const f = fixture(true);
  const course = await f.exports.loadCourse('member', { id: 'enrollment', experience_id: 'experience' }, 'version', null, false, f.exports.responseLoadContext(true, { box: 'version:assessment:other-block' }));
  assert.deepEqual(course.weeks[0].activities, []);
  assert.ok(f.queries.every((query) => query.table !== 'participant_responses'));
});
test('opening the assessment restricts the answer query to that definition', async () => {
  const f = fixture(true);
  await f.exports.loadCourse('member', { id: 'enrollment', experience_id: 'experience' }, 'version', null, false, f.exports.responseLoadContext(true, { box: 'version:assessment:block' }));
  assert.deepEqual(f.queries.find((query) => query.table === 'participant_responses').filters.at(-1), ['response_definition_id', ['definition']]);
});


test('CRM response reads reject non-admin viewers before querying answers', async () => {
  const f = fixture(true, {}, false);
  await assert.rejects(f.exports.loadAdminJourneyResponses('member', { enrollmentId: 'foreign' }), error => error.status === 403);
  assert.equal(f.queries.length, 0);
});
test('CRM response reads require the enrollment to belong to the requested person', async () => {
  const f = fixture(true, { experience_enrollments: null });
  await assert.rejects(f.exports.loadAdminJourneyResponses('member', { enrollmentId: 'foreign' }), error => error.status === 404);
  assert.deepEqual(f.queries[0].filters, [['participant_id', 'member'], ['id', 'foreign']]);
  assert.ok(!f.queries.some(query => query.table === 'participant_responses'));
});
test('CRM response reads reject versions outside the participant enrollment history', async () => {
  const f = fixture(true, { experience_enrollments: { id: 'enrollment', experience_id: 'experience', experience_version_id: 'current' }, experience_enrollment_version_history: [{ experience_version_id: 'previous' }] });
  await assert.rejects(f.exports.loadAdminJourneyResponses('member', { enrollmentId: 'enrollment', versionId: 'foreign' }), error => error.status === 404);
  assert.ok(!f.queries.some(query => query.table === 'participant_responses'));
});
test('CRM Life Mapping U reads require attempt ownership before loading responses', async () => {
  const f = fixture(true, { lmu_assessments: null });
  await assert.rejects(f.exports.loadAdminJourneyResponses('member', { assessmentId: 'foreign' }), error => error.status === 404);
  assert.deepEqual(f.queries[0].filters, [['id', 'foreign'], ['participant_id', 'member']]);
  assert.ok(!f.queries.some(query => query.table === 'lmu_responses'));
});
