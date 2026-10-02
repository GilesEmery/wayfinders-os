import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from './offline-module.mjs';

function fakeDb(rows, calls) {
  return { from(table) {
    const call = { table, filters: [], operation: 'select' };
    let single = false;
    const chain = new Proxy({}, { get(_, key) {
      if (key === 'then') return done => { calls.push(call); const data = rows[table] ?? []; return Promise.resolve({ data: single ? data[0] ?? null : data, error: null }).then(done); };
      return (...args) => { if (['insert', 'update', 'upsert', 'delete'].includes(key)) throw new Error('Unexpected write in read-only fixture'); if (['eq', 'in', 'is'].includes(key)) call.filters.push([key, ...args]); if (['maybeSingle', 'single'].includes(key)) single = true; return chain; };
    } });
    return chain;
  } };
}
const experience = { id: 'experience', slug: 'course', status: 'active', current_published_version_id: 'version', delivery_mode: 'builder', default_theme_id: 'theme' };
const version = { id: 'version', status: 'published', experience_id: 'experience', theme_id: 'theme' };
const structure = { experience, version, modules: [] };
function runtimeFixture(passwordDenied = false, user = { id: 'user', email: 'fixture@example.test' }) {
  const calls = [];
  const rows = { experiences: [experience], participants: [{ id: 'participant' }], experience_versions: [version], experience_enrollments: [{ id: 'enrollment', status: 'in_progress', experience_version_id: 'version', updated_at: '2026-10-02T00:00:00Z' }] };
  const db = fakeDb(rows, calls);
  const never = () => { throw new Error('Display-only loader reached by a mutation'); };
  const runtime = load('lib/experiences/builder/participant-runtime.ts', {
    './performance-measurement': { measureOperation: (_, work) => work() }, '@/lib/experiences/access/server': { requireExperiencePassword() { if (passwordDenied) throw new Error('Password required'); } },
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, '@/lib/platform/auth': { getPlatformUser: async () => user },
    './data': { getExperienceStructure: async () => structure }, './progress': { loadParticipantProgress: never, summarizeParticipantProgress: () => ({ sections: {}, lessons: {}, modules: {}, experience: {} }) },
    './runtime': { resolveExperienceRuntime: () => ({ kind: 'builder' }) }, './course-templates': { resolveCourseTemplate: () => ({}) },
    './course-cover': { resolveCourseCoverUrl: never, resolveCourseLogoUrl: never, resolveCourseHeaderLogoUrl: never },
    './resource-assets': { resolveCourseAssets: never }, './companion-data': { loadCompanionRuntime: never },
    '@/lib/platform/authorization': { getAuthorizationContext: async () => ({ globalRole: null, assignments: [] }), canAccessCohortContext: () => false },
    './cohort-context': {}, './course-requirement-policy': { canBypassCourseRequirements: () => false },
  });
  return { runtime, calls, rows };
}
test('mutation runtime preserves fresh authorization and pinning without display reads', async () => {
  const { runtime, calls, rows } = runtimeFixture();
  const result = await runtime.resolveParticipantCourseForMutation('course');
  assert.equal(result.status, 'ready');
  assert.equal(result.enrollmentId, 'enrollment');
  assert.ok(calls.some(call => call.table === 'experience_versions' && call.filters.some(filter => filter[1] === 'status' && filter[2] === 'published')));
  assert.ok(!calls.some(call => ['resources', 'experience_themes', 'companion_modules', 'content_block_resources', 'section_progress'].includes(call.table)));
  rows.experience_enrollments = [];
  assert.equal((await runtime.resolveParticipantCourseForMutation('course')).status, 'denied', 'authorization is not reused across operations');
});
test('mutation runtime retains password gate and signed-out denial', async () => {
  await assert.rejects(() => runtimeFixture(true).runtime.resolveParticipantCourseForMutation('course'), /Password required/);
  const { runtime, calls } = runtimeFixture(false, null);
  assert.equal((await runtime.resolveParticipantCourseForMutation('course')).status, 'signed_out');
  assert.ok(!calls.some(call => call.table === 'experience_enrollments'));
});
test('companion updates deny before hierarchy reads; delivery hiding denies before chat', async () => {
  let access = { status: 'denied' }, hidden = false, liveReads = 0;
  const calls = [];
  const rows = { experience_modules: [{ id: 'm' }], experience_lessons: [{ id: 'l', module_id: 'm' }], experience_sections: [{ id: 's', module_id: 'm', lesson_id: 'l' }] };
  const updates = load('lib/experiences/builder/companion-updates.ts', {
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => fakeDb(rows, calls) },
    './participant-runtime': { authorizeParticipantCourse: async () => access, effectiveDeliveryStructure: async outline => hidden ? { modules: [] } : outline },
    './companion-data': { loadCompanionRuntime: async input => { liveReads++; assert.deepEqual(JSON.parse(JSON.stringify(input.liveLocation)), { moduleId: 'm', lessonId: 'l', sectionId: 's' }); return { hasCohortContext: true, modules: [{ id: 'chat', effective_configuration: {}, call_session: null, chat_messages: [{ id: 'old', created_at: '2026-10-02T00:00:00.000Z' }, { id: 'new', created_at: '2026-10-02T01:00:00.000Z' }] }] }; } },
  });
  const run = () => updates.loadParticipantCompanionUpdates('course', 'group', 'lesson', 'page', 'cohort', '2026-10-02T00:30:00.000Z');
  assert.equal(await run(), null); assert.equal(calls.length, 0);
  access = { status: 'ready', version, experience, participantId: 'participant', access: { enrollment: { id: 'enrollment', experience_version_id: 'version' }, offering: { cohort_id: 'cohort' } } };
  hidden = true; assert.equal(await run(), null); assert.equal(liveReads, 0);
  hidden = false; const result = await run();
  assert.deepEqual(Array.from(result[0].messageIds), ['old', 'new']);
  assert.deepEqual(Array.from(result[0].messages, message => message.id), ['new']);
  assert.ok(calls.every(call => call.filters.some(filter => filter[1] === 'experience_version_id' && filter[2] === 'version')));
  access.access.enrollment.experience_version_id = 'other-version';
  assert.equal(await run(), null); assert.equal(liveReads, 1);
});
test('incremental window deduplicates tied messages, reconciles deletions and orders deterministically', () => {
  const { reconcileMessageWindow } = load('lib/experiences/builder/companion-incremental.ts', {});
  const a = { id: 'a', created_at: '2026-10-02T00:00:00Z' }, b = { id: 'b', created_at: a.created_at }, removed = { id: 'removed', created_at: a.created_at };
  const result = reconcileMessageWindow([b, removed], [a, b, a], ['a', 'b']);
  assert.deepEqual(Array.from(result, message => message.id), ['a', 'b']);
});
test('assessment cards batch canonical statuses and keep preview free of participant reads', async () => {
  const calls = [];
  const rows = { experiences: [{ id: 'assessment', name: 'Fixture', description: null }], embedded_assessment_attempts: [{ parent_content_block_id: 'first', status: 'in_progress' }], experience_enrollments: [{ experience_id: 'assessment', status: 'completed' }] };
  const { loadAssessmentCards } = load('components/experiences/builder/PrebuiltAssessmentBlock.tsx', {
    'react/jsx-runtime': {}, '@/lib/supabase/admin': { createAdminSupabaseClient: () => fakeDb(rows, calls) },
    '@/lib/experiences/builder/prebuilt-assessment': { PREBUILT_ASSESSMENT_BLOCK_TYPE: 'prebuilt_assessment', parsePrebuiltAssessmentConfiguration: () => ({ ok: true, value: { assessmentExperienceId: 'assessment' } }) },
    './AssessmentLaunchCard': {}, './EmbeddedAssessmentLauncher': {},
  });
  const section = { layout: { columns: [{ blocks: ['first', 'second', 'third'].map(id => ({ id, block_type: 'prebuilt_assessment', status: 'active', visibility: 'visible', configuration: {} })) }] } };
  const result = await loadAssessmentCards(section, 'participant', 'enrollment');
  assert.equal(calls.length, 3);
  assert.deepEqual(Object.values(result).map(card => card.status), ['completed', 'completed', 'completed']);
  for (const call of calls.filter(call => call.table !== 'experiences')) assert.ok(call.filters.some(filter => filter[1] === 'participant_id' && filter[2] === 'participant'));
  calls.length = 0;
  const preview = await loadAssessmentCards(section, null, null);
  assert.equal(calls.length, 1); assert.ok(Object.values(preview).every(card => card.status === 'not_started'));
});
test('live companion read keeps offering history separate and never provisions or signs assets', async () => {
  const calls = [];
  const definitions = ['chat', 'leader', 'notes', 'elsewhere'].map(id => ({ id, module_key: id, module_type: id === 'notes' ? 'personal_notes' : 'chat', visibility: 'visible', availability_context: 'cohort', audience: id === 'leader' ? 'leaders' : 'group', scope: id === 'elsewhere' ? 'page' : 'course', target_section_id: 'other-section', configuration: {} }));
  const rows = { companion_modules: definitions, cohort_memberships: [{ membership_role: 'participant' }], companion_delivery_overrides: [{ id: 'current-delivery', companion_module_id: 'chat', offering_id: 'offering-one', visibility: 'inherit', configuration: {} }], experience_versions: [{ id: 'version' }], companion_chat_messages: [{ id: 'message', companion_module_id: 'chat', delivery_override_id: 'current-delivery', author_participant_id: 'author', created_at: '2026-10-02T00:00:00Z' }], participants: [{ id: 'author', full_name: 'Fixture Author' }] };
  const db = fakeDb(rows, calls);
  const { loadCompanionRuntime } = load('lib/experiences/builder/companion-data.ts', {
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './companion': load('lib/experiences/builder/companion.ts', {}), './companion-live': load('lib/experiences/builder/companion-live.ts', {}),
    './resource-assets': { resolveResourceIds: async (_, ids) => { assert.equal(ids.length, 0); return new Map(); } },
  });
  const result = await loadCompanionRuntime({ versionId: 'version', offering: { id: 'offering-one', cohort_id: 'cohort-one', experience_id: 'experience' }, participantId: 'participant', enrollmentId: 'enrollment', liveLocation: { moduleId: 'm', lessonId: 'l', sectionId: 's' }, db });
  assert.deepEqual(Array.from(result.modules, item => item.id), ['chat']);
  assert.ok(!calls.some(call => ['resources', 'companion_module_resources', 'participant_personal_notes'].includes(call.table)));
  assert.ok(calls.filter(call => call.table === 'cohort_memberships').every(call => call.filters.some(filter => filter[1] === 'cohort_id' && filter[2] === 'cohort-one')));
  const history = calls.find(call => call.table === 'companion_delivery_overrides' && call.filters.some(filter => filter[1] === 'offering_id'));
  assert.ok(history.filters.some(filter => filter[1] === 'offering_id' && filter[2] === 'offering-one'));
  const messages = calls.find(call => call.table === 'companion_chat_messages');
  assert.ok(messages.filters.some(filter => filter[1] === 'delivery_override_id' && filter[2].includes('current-delivery')));
});
