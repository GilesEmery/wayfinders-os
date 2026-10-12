import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { load } from '../performance/offline-module.mjs';
import { createAcknowledgedSaveQueue } from '../../lib/experiences/lmu/acknowledged-save-queue.ts';

// VM loader denies every import not explicitly mocked. No process, environment,
// fetch, sockets, Supabase SDK, or application bootstrap is exposed to the VM.
const sharing = load('lib/platform/response-sharing-policy.ts', {});
const policy = load('lib/platform/effective-access-policy.ts', {});
function fakeDb(handler) {
  const queries = [];
  return { queries, from(table) {
    const q = { table, calls: [] }; queries.push(q);
    const builder = {};
    for (const method of ['select','eq','in','order','limit','range','not','neq','is','insert','update','upsert','delete','single','maybeSingle']) builder[method] = (...args) => { q.calls.push([method, ...args]); return builder; };
    builder.then = (resolve, reject) => Promise.resolve().then(() => handler(q)).then(result => q.calls.some(([method, , options]) => method === "select" && options?.count === "exact") && result.count === undefined ? { ...result, count: Array.isArray(result.data) ? result.data.length : null } : result).then(resolve, reject);
    return builder;
  } };
}
const has = (q, method, key, value) => q.calls.some(([m, k, v]) => m === method && (key === undefined || k === key) && (value === undefined || v === value));
const ok = data => ({ data, error: null });
function authorization(db) {
  return load('lib/platform/authorization.ts', { '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, '@/lib/platform/auth': { getPlatformUser: () => { throw Error('Unexpected identity lookup'); } } });
}
function access(db) {
  return load('lib/platform/effective-access.ts', { '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, '@/lib/platform/authorization': authorization(db), '@/lib/platform/effective-access-policy': policy });
}
const authorityRows = {
  participants: { id: 'member' }, admin_members: null,
  platform_role_assignments: [{ role: 'hub_leader', scope_type: 'hub', scope_id: 'hub-a' }],
  authorization_role_entitlements: [{ role_key: 'member', entitlement_key: 'my_tasks' }],
  authorization_role_permissions: [{ role_key: 'hub_leader', permission_key: 'hub.manage_members' }],
  authorization_entitlement_overrides: [], authorization_permission_overrides: [],
};
for (const table of Object.keys(authorityRows)) test(`failed ${table} read cannot produce a grant, including Super Admin`, async () => {
  const db = fakeDb(q => q.table === table ? { data: authorityRows[q.table], error: { message: 'sensitive database detail' } } : ok(q.table === 'admin_members' ? { role: 'super_admin' } : authorityRows[q.table]));
  await assert.rejects(access(db).resolveEffectiveAccess('auth'), /Access could not be verified\. Please try again\./);
});
test('grants, explicit deny, empty reads, scope isolation and fresh revocation', async () => {
  let denied = false;
  const db = fakeDb(q => ok(q.table === 'authorization_permission_overrides' && denied ? [{ permission_key: 'hub.manage_members', effect: 'deny', scope_type: 'hub', scope_id: 'hub-a' }] : authorityRows[q.table]));
  const resolver = access(db);
  let snapshot = await resolver.resolveEffectiveAccess('auth');
  assert.equal(policy.hasPermission(snapshot, 'hub.manage_members', { scope: { type: 'hub', id: 'hub-a' } }), true);
  assert.equal(policy.hasPermission(snapshot, 'hub.manage_members', { scope: { type: 'hub', id: 'hub-b' } }), false);
  denied = true;
  snapshot = await resolver.resolveEffectiveAccess('auth');
  assert.equal(policy.hasPermission(snapshot, 'hub.manage_members', { scope: { type: 'hub', id: 'hub-a' } }), false);
  const empty = access(fakeDb(q => ok(q.table === 'participants' ? { id: 'member' } : q.table === 'admin_members' ? null : [])));
  assert.equal(policy.hasPermission(await empty.resolveEffectiveAccess('auth'), 'hub.manage_members'), false);
});
for (const assignment of [{ role: 'hub_leader', scope_type: 'hub', scope_id: null }, { role: 'admin', scope_type: 'made-up', scope_id: 'x' }, { role: 'admin', scope_type: 'global', scope_id: 'x' }]) test(`invalid scope fails closed: ${assignment.scope_type}/${assignment.scope_id}`, async () => {
  const db = fakeDb(q => ok(q.table === 'platform_role_assignments' ? [assignment] : authorityRows[q.table]));
  await assert.rejects(access(db).resolveEffectiveAccess('auth'), /Access could not be verified/);
});
test('successful Administrator and ordinary Member snapshots preserve grants', async () => {
  for (const role of ['admin', 'super_admin', null]) {
    const db = fakeDb(q => ok(q.table === 'admin_members' ? role ? { role } : null : authorityRows[q.table]));
    const snapshot = await access(db).resolveEffectiveAccess('auth');
    assert.equal(policy.hasEntitlement(snapshot, 'my_tasks'), true);
    assert.equal(snapshot.isSuperAdmin, role === 'super_admin');
  }
});
const audience = { viewerParticipantId: 'facilitator', respondentParticipantId: 'person', cohortId: 'cohort', experienceId: 'course', responseCohortId: 'cohort', enrollmentExperienceId: 'course', activeEnrollment: true, activeRespondentMembership: true, assignedFacilitator: true, currentVersion: true, participantSharingConfirmed: true };
const shared = { raw_visibility: 'participant_and_facilitator', result_visibility: 'participant_only', share_mode: 'required' };
test('privacy separates raw and result; legacy, anonymous, group and unrelated audiences denied', () => {
  assert.equal(sharing.canReadResponseContent(audience, shared, 'raw'), true);
  assert.equal(sharing.canReadResponseContent(audience, shared, 'result'), false);
  for (const patch of [{ viewerParticipantId: null }, { assignedFacilitator: false }, { activeRespondentMembership: false }, { activeEnrollment: false }, { currentVersion: false }, { responseCohortId: 'other-cohort' }, { enrollmentExperienceId: 'other-course' }]) assert.equal(sharing.canReadResponseContent({ ...audience, ...patch }, shared, 'raw'), false);
  for (const visibility of ['participant_only','participant_and_leader','cohort_members','administrators','custom','group_shared']) assert.equal(sharing.canReadResponseContent(audience, { ...shared, raw_visibility: visibility }, 'raw'), false);
  for (const mode of ['disabled','optional','invalid']) assert.equal(sharing.canReadResponseContent(audience, { ...shared, share_mode: mode }, 'raw'), false);
  assert.equal(sharing.canReadResponseContent({ ...audience, viewerParticipantId: 'person' }, null, 'raw'), true);
});
function libraryFixture({ visibility = shared, assigned = true, member = true, enrollmentCohort = 'cohort', user = true, adminOwner = false } = {}) {
  const definition = { id: 'def', block_id: 'block', response_key: 'reflection', label: 'Reflection', configuration: {}, ...visibility };
  const block = { id: 'block', block_type: 'reflection', custom_renderer_key: null };
  const canonical = { experience: { id: 'course', name: 'Course', slug: 'course', experience_type: 'course' }, version: { id: 'version', version_label: 'v1' }, modules: [{ id: 'module', title: 'Week', lessons: [{ title: 'Lesson', sections: [{ title: 'Section', layout: { columns: [{ blocks: [block, { id: 'embedded', block_type: 'prebuilt_assessment' }] }] } }] }] }] };
  const db = fakeDb(q => {
    if (q.table === 'participants') return ok(has(q,'eq','auth_user_id') ? { id: adminOwner ? 'person' : 'facilitator' } : { full_name: 'Person' });
    if (q.table === 'cohorts') return ok({ id: 'cohort', experience_id: 'course', status: 'active' });
    if (q.table === 'cohort_memberships') return ok(member ? has(q,'eq','participant_id','person') ? { participant_id: 'person' } : { membership_role: 'member' } : null);
    if (q.table === 'experience_enrollments') return ok({ id: 'enrollment', experience_id: 'course', experience_version_id: 'version', cohort_id: enrollmentCohort, status: 'in_progress' });
    if (q.table === 'experience_offerings') return ok([{ id: 'offering', experience_version_id: 'version', cohort_id: 'cohort' }]);
    if (q.table === 'response_definitions') return ok([definition]);
    if (q.table === 'participant_responses') return ok([{ id: 'answer', response_definition_id: 'def', response_data: { value: 'secret' }, status: 'finalized', updated_at: 'today' }]);
    if (q.table === 'admin_audit_log') return ok(null);
    throw Error(`Unexpected table ${q.table}`);
  });
  const mod = load('lib/platform/response-library.ts', {
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './auth': { getPlatformUser: async () => user ? { id: 'auth', email: 'fixture' } : null },
    './authorization': { getAuthorizationContext: async () => ({ globalRole: 'admin', assignments: assigned ? [{ role: 'facilitator', scope_type: 'cohort', scope_id: 'cohort' }] : [] }) },
    '@/lib/experiences/access/server': { needsExperiencePassword: async () => false }, '@/lib/experiences/builder/data': { getExperienceStructure: async () => canonical },
    '@/lib/experiences/builder/participant-runtime': { effectiveDeliveryStructure: async c => c }, '@/lib/experiences/builder/prebuilt-assessment': { parsePrebuiltAssessmentConfiguration: () => { throw Error('Must not load linked assessment for facilitator'); } },
    './response-library-policy': { weekTitle: title => title, isAssessmentActivity: () => false, activityResponseItems: (_, data) => data ? [{ question: 'Reflection', response: data.value }] : [], activityResultItems: () => [{ question: 'Result', response: 'derived secret' }] },
    './response-sharing-policy': sharing, '@/lib/admin/auth': { getAdmin: async () => ({ id: 'admin' }) },
  });
  return { db, mod };
}
test('facilitator route loader excludes legacy private bodies and archived/embedded data before read', async () => {
  const f = libraryFixture({ visibility: { ...shared, raw_visibility: 'participant_only' } });
  const result = await f.mod.loadCohortMemberResponses('cohort','person');
  assert.equal(result.courses[0].weeks[0].activities.length, 0);
  assert.ok(!f.db.queries.some(q => ['participant_responses','experience_enrollment_version_history','lmu_responses','lmu_results','embedded_assessment_attempts'].includes(q.table)));
});
test('legacy enrollment cohort pointer cannot authorize facilitator sharing', async () => {
  const f = libraryFixture();
  const result = await f.mod.loadCohortMemberResponses('cohort','person');
  assert.equal(result.courses[0].weeks[0].activities.length, 0);
  assert.ok(!f.db.queries.some(q => q.table === 'participant_responses'));
});
test('revoked facilitator, withdrawn member, anonymous and other cohort do not leak', async () => {
  for (const patch of [{ assigned: false }, { member: false }, { user: false }]) {
    const f = libraryFixture(patch);
    await assert.rejects(f.mod.loadCohortMemberResponses('cohort','person'), e => [401,403,404].includes(e.status));
    assert.ok(!f.db.queries.some(q => q.table === 'participant_responses'));
  }
  const f = libraryFixture({ enrollmentCohort: 'other' });
  assert.equal((await f.mod.loadCohortMemberResponses('cohort','person')).courses[0].weeks[0].activities.length, 0);
});
test('admin Journey direct content request denies unrelated admin before body queries', async () => {
  const f = libraryFixture();
  await assert.rejects(f.mod.loadAdminJourneyResponses('person', { assessmentId: 'assessment' }), e => e.status === 403);
  assert.ok(!f.db.queries.some(q => q.table === 'lmu_assessments'));
});
test('CSV export refuses unrelated operational admin before fetching any private source', async () => {
  const db = fakeDb(() => ok({ id: 'other' }));
  const mod = load('lib/admin/wayfinders/export.ts', { '@/lib/admin/auth': { getAdmin: async () => ({ id: 'admin' }) }, '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, '@/lib/platform/response-library-policy': {}, './export-csv': {}, '@/lib/platform/response-sharing-policy': sharing });
  await assert.rejects(mod.exportWayfinder('person'), e => e.status === 403);
  assert.equal(db.queries.length, 1);
});
function responseFixture({ revision = 'revision', status = 'draft', write = ok({ id: 'answer' }), progress = true } = {}) {
  let progressCalls = 0;
  const db = fakeDb(() => write);
  const block = { id: 'block', block_key: 'block', block_type: 'reflection', status: 'active', visibility: 'visible', configuration: {} };
  const resolution = { status: 'ready', enrollmentId: 'enrollment', participantId: 'person', structure: { version: { id: 'version' }, modules: [{ module_key: 'module', lessons: [{ id: 'lesson', lesson_key: 'lesson', sections: [{ section_key: 'section', layout: { columns: [{ blocks: [block] }] } }] }] }] }, responses: { block: { definition: { id: 'def', response_type: 'text', lesson_id: 'lesson', experience_version_id: 'version', configuration: {}, is_required: false }, response: revision === null ? null : { id: 'answer', updated_at: revision, status } } } };
  const mod = load('lib/experiences/builder/response-mutations.ts', { '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './block-registry': { getBlockDefinition: () => ({ response: { responseType: 'text', responseKind: 'short_text' } }) }, './participant-runtime': { resolveParticipantCourseForMutation: async () => resolution }, './progress-mutations': { recordSectionVisitForAuthorizedCourse: async () => { progressCalls++; if (progress === 'throw') throw Error('failure'); return { ok: progress }; } }, './response-registry': { validateResponseData: (_, input) => ({ ok: true, value: input }), responseDataJson: value => value } });
  // Minimal FormData fake; VM never has network or browser APIs.
  const run = (expected = revision ?? '') => mod.saveParticipantResponseDraft('course','module','lesson','section','block',null,{ get: key => key === 'response_revision' ? expected : 'answer', getAll: () => [] });
  return { run, db, progressCalls: () => progressCalls };
}
test('stale revision, zero-row CAS, network error and duplicate insert never acknowledge save', async () => {
  for (const [options, expected] of [[{}, 'stale'], [{ write: ok(null) }, 'revision'], [{ write: { data: null, error: { message: 'network' } } }, 'revision'], [{ revision: null, write: { data: null, error: { code: '23505', message: 'duplicate' } } }, '']]) {
    const f = responseFixture(options); await assert.rejects(f.run(expected)); assert.equal(f.progressCalls(), 0);
  }
});
test('CAS writes confirm a row, partial progress failure reports saved response separately', async () => {
  const f = responseFixture(); await f.run();
  assert.ok(has(f.db.queries[0], 'eq','updated_at','revision'));
  assert.ok(has(f.db.queries[0], 'eq','status','draft'));
  for (const progress of [false, 'throw']) await assert.rejects(responseFixture({ progress }).run(), /response is saved, but progress could not be confirmed/);
});
function saveQueueFixture() {
  const timers = new Map(), statuses = []; let id = 0;
  const queue = createAcknowledgedSaveQueue({ delay: 1200, setTimer: fn => { timers.set(++id,fn); return id; }, clearTimer: timer => timers.delete(timer), onStatus: (key,status) => statuses.push([key,status]) });
  return { queue, statuses, flush() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); } };
}
test('debounced save stays pending until actual acknowledgement; superseded promises settle', async () => {
  const f = saveQueueFixture(); let resolve; let done = false;
  const first = f.queue.schedule('section', () => { throw Error('Superseded draft ran'); });
  const second = f.queue.schedule('section', () => new Promise(r => { resolve = r; }));
  void second.then(() => { done = true; });
  assert.equal(await first, false); f.flush(); await Promise.resolve();
  assert.equal(done, false); assert.equal(f.statuses.at(-1)[1], 'pending');
  resolve(true); assert.equal(await second, true); assert.equal(f.statuses.at(-1)[1], 'saved');
});
test('failure/timeout/cancel never report saved; draft cannot overtake finalization', async () => {
  const f = saveQueueFixture();
  assert.equal(await f.queue.schedule('section', async () => { throw Error('timeout'); }, true), false);
  assert.equal(f.statuses.at(-1)[1], 'failed');
  const order = []; let finish;
  const draft = f.queue.schedule('section', () => { order.push('draft'); return new Promise(r => { finish = r; }); }, true);
  await Promise.resolve();
  const final = f.queue.schedule('section', async () => { order.push('final'); return true; }, true);
  assert.equal(await draft, false); assert.deepEqual(order, ['draft']);
  finish(true); assert.equal(await final, true); assert.deepEqual(order, ['draft','final']);
  const canceled = f.queue.schedule('section', async () => true); f.queue.cancel('section'); assert.equal(await canceled, false);
});
test('resource association inspection covers image/PDF/video/document and rejects cross-course or missing assets', async () => {
  for (const kind of ['image','pdf','video','download']) {
    const db = fakeDb(q => ok(q.table === 'content_block_resources' ? [{ resource_id: kind, sort_order: 2 }] : [{ id: kind, status: 'active', storage_path: 'courses/course/asset' }]));
    const mod = load('lib/experiences/admin/resource-copy.ts', {});
    assert.equal((await mod.inspectBlockResourceLinks(db,'source','course'))[0].resource_id, kind);
  }
  for (const resources of [[], [{ id: 'asset', status: 'active', storage_path: 'courses/other/asset' }], [{ id: 'asset', status: 'archived', storage_path: 'library/asset' }]]) {
    const db = fakeDb(q => ok(q.table === 'content_block_resources' ? [{ resource_id: 'asset', sort_order: 0 }] : resources));
    await assert.rejects(load('lib/experiences/admin/resource-copy.ts', {}).inspectBlockResourceLinks(db,'source','course'));
  }
});

test('own assessment result guard stops direct admin URL from reading answer bodies', async () => {
  const db = fakeDb(() => ok({ id: 'other' }));
  const mod = load('lib/assessment-results.ts', {
    '@/lib/platform/auth': { getPlatformUser: async () => ({ id: 'auth' }) }, '@/lib/platform/response-sharing-policy': sharing,
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, '@/lib/experiences/access/server': { requireExperiencePasswordBySlug: async () => { throw Error('No password call before ownership'); } },
    '@/lib/experiences/builder/circle-of-influence': { CIRCLE_RESPONSE_KEY: 'circle' }, '@/lib/experiences/builder/personal-impact-statement': { PERSONAL_IMPACT_RESPONSE_KEY: 'pis' }, '@/lib/experiences/builder/start-something': { START_SOMETHING_RESPONSE_KEY: 'start' },
    '@/lib/platform/journey-policy': {}, '@/lib/assessment-results-policy': { NATIVE_ASSESSMENT_RESULTS: {} },
  });
  assert.equal(await mod.loadCompletedAssessmentResult('person','life-mapping-u','assessment'), null);
  assert.equal(db.queries.length, 1);
});

test('LMU admin page statically separates progress and owner-only result queries', () => {
  const source = readFileSync('app/admin/life-mapping-u/[assessmentId]/page.tsx', 'utf8');
  assert.ok(source.includes('lmu_section_progress').valueOf());
  assert.match(source, /const allowed = canReadResponseContent/);
  assert.match(source, /const resultsRead = allowed \? await admin.from\("lmu_results"\)/);
  assert.ok(source.indexOf('const allowed') < source.indexOf('const resultsRead'));
});

test('cohort API statically retains safe denial and no-store contract without route execution', () => {
  const source = readFileSync('app/api/cohorts/[cohortId]/members/[participantId]/responses/route.ts', 'utf8');
  assert.match(source, /private, no-store/);
  assert.match(source, /Saved responses are unavailable\./);
  assert.match(source, /ResponseLibraryAccessError/);
  assert.match(source, /error.status/);
});

function blockFixture({ links = true, failLink = false, failOrder = false } = {}) {
  const resourceCopy = load('lib/experiences/admin/resource-copy.ts', {});
  const auditCalls = [];
  let copied = false;
  const db = fakeDb(q => {
    if (q.table === 'content_blocks' && has(q,'insert')) { copied = true; return ok({ id: 'copy' }); }
    if (q.table === 'content_blocks' && has(q,'eq','block_key')) return ok(null);
    if (q.table === 'content_blocks' && has(q,'delete')) return ok(null);
    if (q.table === 'content_blocks' && has(q,'update')) return failOrder ? { data: null, error: { message: 'ordering failed' } } : ok(null);
    if (q.table === 'content_blocks') return has(q,'eq','id','source') ? ok({ id: 'source', section_id: 'section', column_id: 'column', lesson_id: 'lesson', block_type: 'pdf_reader', content: {}, settings: {}, metadata: {} }) : ok(copied ? [{ id: 'copy', lesson_id: 'lesson', sort_order: 1 }, { id: 'source', lesson_id: 'lesson', sort_order: 0 }] : [{ id: 'source', lesson_id: 'lesson', sort_order: 0 }]);
    if (q.table === 'content_block_resources') return has(q,'insert') ? failLink ? { data: null, error: {} } : ok(null) : has(q,'delete') ? ok(null) : ok(links ? [{ resource_id: 'asset', sort_order: 0 }] : []);
    if (q.table === 'resources') return ok([{ id: 'asset', status: 'active', storage_path: 'courses/course/asset' }]);
    if (q.table === 'experience_versions') return ok({ id: 'version', experience_id: 'course', status: 'draft' });
    if (q.table === 'experience_sections') return ok({ id: 'section', lesson_id: 'lesson', module_id: 'module', experience_version_id: 'version' });
    if (q.table === 'experience_lessons') return ok({ id: 'lesson', module_id: 'module', experience_version_id: 'version' });
    if (q.table === 'experience_modules') return ok({ id: 'module', experience_version_id: 'version' });
    if (q.table === 'section_columns') return ok([{ id: 'column', section_id: 'section' }]);
    if (q.table === 'section_layouts') return ok({ id: 'layout', section_id: 'section' });
    throw Error(`Unexpected block query ${q.table}`);
  });
  const mod = load('lib/experiences/admin/block-mutations.ts', {
    '@/lib/admin/auth': { requireAdmin: async () => ({ id: 'admin' }), audit: async (...args) => auditCalls.push(args) }, '@/lib/platform/authorization': { getAuthorizationContext: async () => ({}), canBuildExperienceById: async () => true }, '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
    '../builder/block-presentation': {}, './inline-draft': {}, '../builder/block-registry': { getBlockDefinition: () => ({ duplicable: true, validateConfiguration: () => ({ ok: true, value: {} }) }) }, '../builder/validation': { assertVersionEditable: () => {}, validateBuilderBlockPlacement: () => {} }, '../builder/resource-assets': { uploadCourseAsset: () => { throw Error('No Storage upload allowed'); } }, './resource-copy': resourceCopy,
  });
  return { mod, db, auditCalls };
}
test('actual block duplication copies independent links without Storage requests', async () => {
  const f = blockFixture(); await f.mod.duplicateBlock('course','version','section','source');
  const insert = f.db.queries.find(q => q.table === 'content_block_resources' && has(q,'insert'));
  const payload = insert.calls.find(c => c[0] === 'insert')[1][0];
  assert.equal(payload.content_block_id, 'copy'); assert.equal(payload.resource_id, 'asset');
  assert.ok(!f.db.queries.some(q => q.table === 'resources' && has(q,'insert')));
  assert.equal(f.auditCalls.at(-1)[1], 'section.block.duplicated');
});
test('resource-copy and reorder failures reject instead of reporting a successful copy', async () => {
  for (const options of [{ failLink: true }, { failOrder: true }]) {
    const f = blockFixture(options);
    await assert.rejects(f.mod.duplicateBlock('course','version','section','source'));
    assert.equal(f.auditCalls.length, 0);
    if (options.failLink) assert.ok(f.db.queries.some(q => q.table === 'content_blocks' && has(q,'delete')));
  }
});

test('publication companion inspection and activation failures describe already-published outcome', async () => {
  for (const failure of ['companion','activation']) {
    const db = fakeDb(q => {
      if (q.table === 'experience_versions') return ok({ id: 'version', experience_id: 'course', status: 'draft' });
      if (q.table === 'experiences') return has(q,'update') ? { data: null, error: {} } : ok({ id: 'course', current_published_version_id: 'old' });
      if (q.table === 'companion_modules') return ok([{ id: has(q,'eq','experience_version_id','old') ? 'old-module' : 'new-module', module_key: 'key' }]);
      if (q.table === 'companion_delivery_overrides') return has(q,'in') ? ok(failure === 'companion' ? [{ companion_module_id: 'old-module', offering_id: 'offering' }] : []) : { data: null, error: {} };
      throw Error(`Unexpected release query ${q.table}`);
    });
    db.rpc = async () => ok('version');
    const mod = load('lib/experiences/admin/version-release.ts', { '@/lib/admin/auth': { requireAdmin: async () => ({ id: 'admin' }) }, '@/lib/platform/authorization': { getAuthorizationContext: async () => ({}), canPublishExperienceById: async () => true }, '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './publish-validation': { validatePublishRuntime: async () => {} } });
    await assert.rejects(mod.publishVersion('course','version'), /Version was Published, but/);
  }
});

test('transport rejection is converted to a controlled authorization failure', async () => {
  const db = fakeDb(() => { throw Error('sensitive transport failure'); });
  await assert.rejects(access(db).resolveEffectiveAccess('auth'), /Access could not be verified\. Please try again\./);
});
test('raw and derived result permissions are independently evaluated with verified scope', () => {
  const resultOnly = { raw_visibility: 'participant_only', result_visibility: 'participant_and_facilitator', share_mode: 'required' };
  assert.equal(sharing.canReadResponseContent(audience,resultOnly,'raw'),false);
  assert.equal(sharing.canReadResponseContent(audience,resultOnly,'result'),true);
  assert.equal(sharing.canReadResponseContent({ ...audience, responseCohortId: null },resultOnly,'result'),false);
});

test('actual LMU persistence draft acknowledgement and failed HTTP receipt use fake fetch only', async () => {
  const timers = new Map(); let id = 0, resolveFetch, fail = false;
  const network = [];
  const fixture = {
    setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key),
    AbortSignal: { timeout: ms => { assert.equal(ms,15000); return 'fake-timeout-signal'; } },
    fetch: (path, init) => { network.push([path, init]); return new Promise(resolve => { resolveFetch = () => resolve({ ok: !fail, status: fail ? 503 : 200, json: async () => ({ ok: true }) }); }); },
  };
  const mod = load('lib/experiences/lmu/persistence.ts', { './acknowledged-save-queue': { createAcknowledgedSaveQueue }, fixture }, 'const { fetch, setTimeout, clearTimeout, AbortSignal } = require("fixture");\n' + readFileSync('lib/experiences/lmu/persistence.ts','utf8'));
  const progress = { moduleId: 'values', status: 'in-progress', responses: { answer: 'draft' }, derivedResults: {} };
  const pending = mod.scheduleSectionSave(progress, 'assessment'); let done = false; void pending.then(() => { done = true; });
  assert.equal(network.length, 0); assert.equal(mod.saveStatusSnapshot(), 'pending');
  [...timers.values()][0](); timers.clear(); await Promise.resolve();
  assert.equal(done, false); assert.equal(network[0][0], '/api/lmu/sections/values');
  resolveFetch(); assert.equal(await pending, true); assert.equal(mod.saveStatusSnapshot(), 'saved');
  fail = true;
  const failed = mod.scheduleSectionSave(progress, 'assessment'); [...timers.values()][0](); timers.clear(); await Promise.resolve();
  resolveFetch(); assert.equal(await failed, false); assert.equal(mod.saveStatusSnapshot(), 'failed');
});

test('participant form shows pending, confirmed and failure only after corresponding receipt', async () => {
  for (const behavior of ['saved','failure','network']) {
    const states = []; let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    const jsx = (_,props) => props;
    const mod = load('components/experiences/builder/ParticipantResponseForm.tsx', {
      'react': { useEffect: () => {}, useRef: () => ({ current: false }), useState: () => [{ pending: false, message: '', failed: false }, state => states.push(state)] },
      'react/jsx-runtime': { jsx, jsxs: jsx }, '@/lib/experiences/builder/response-actions': { persistResponseAction: () => promise }, fixture: { FormData: class {} },
    }, 'const FormData = require("fixture").FormData;\n' + readFileSync('components/experiences/builder/ParticipantResponseForm.tsx','utf8'));
    const form = mod.ParticipantResponseForm({ route: {}, children: null });
    const submit = form.onSubmit({ preventDefault() {}, currentTarget: {}, nativeEvent: { submitter: { dataset: { saveMode: 'draft' } } } });
    assert.equal(states.at(-1).pending, true); assert.equal(states.at(-1).message, 'Saving…');
    if (behavior === 'network') reject(Error('network')); else resolve({ ok: behavior === 'saved', message: behavior === 'saved' ? 'Draft saved.' : 'Conflict: keep your text' });
    await submit;
    assert.equal(states.at(-1).pending, false); assert.equal(states.at(-1).failed, behavior !== 'saved');
    if (behavior !== 'saved') assert.ok(!states.at(-1).message.includes('Draft saved.'));
  }
});

test('LMU completion stays pending until receipt, failed draft survives, old failure cannot undo newer module', async () => {
  const local = new Map(); const receipts = [];
  const fixture = { window: { localStorage: { getItem: key => local.get(key), setItem: (key,value) => local.set(key,value) }, dispatchEvent() {} }, Event: class {} };
  const mod = load('lib/experiences/lmu/storage.ts', {
    './persistence': { SECTION_TO_MODULE: {}, scheduleSectionSave: () => new Promise(resolve => receipts.push(resolve)), deleteServerSection: () => {} }, './original-journey': { LMU_ORIGINAL_EXPERIENCE_ID: 'course' }, fixture,
  }, 'const { window, Event } = require("fixture");\n' + readFileSync('lib/experiences/lmu/storage.ts','utf8'));
  mod.bindAssessment('assessment');
  const completed = mod.saveModuleProgress('course', { moduleId: 'values', status: 'completed', responses: { answer: 'value' }, result: { summary: 'result' } });
  assert.equal(mod.getModuleProgress('course','values').status, 'in-progress');
  receipts[0](true); assert.equal(await completed,true);
  assert.equal(mod.getModuleProgress('course','values').status, 'completed');
  const old = mod.saveModuleProgress('course', { moduleId: 'growth', status: 'in-progress', responses: { answer: 'old' } });
  const fresh = mod.saveModuleProgress('course', { moduleId: 'growth', status: 'in-progress', responses: { answer: 'fresh' } });
  receipts[1](false); await old;
  assert.equal(mod.getModuleProgress('course','growth').responses.answer, 'fresh');
  assert.equal(mod.getModuleProgress('course','values').status, 'completed');
  receipts[2](false); assert.equal(await fresh,false);
  assert.equal(mod.getModuleProgress('course','growth').responses.answer, 'fresh');
});

test('publication transport ambiguity never promises unchanged version state', async () => {
  const db = fakeDb(q => ok(q.table === 'experience_versions' ? { id: 'version', experience_id: 'course', status: 'draft' } : { id: 'course' }));
  db.rpc = async () => ({ data: null, error: { message: 'Failed to fetch', code: 'transport' } });
  const mod = load('lib/experiences/admin/version-release.ts', { '@/lib/admin/auth': { requireAdmin: async () => ({ id: 'admin' }) }, '@/lib/platform/authorization': { getAuthorizationContext: async () => ({}), canPublishExperienceById: async () => true }, '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './publish-validation': { validatePublishRuntime: async () => {} } });
  await assert.rejects(mod.publishVersion('course','version'), /Publication could not be confirmed/);
});

test('ambiguous LMU transport failure blocks newer section writes/reset until reload verification', async () => {
  const timers = new Map(); let id = 0, requests = 0;
  const fixture = { setTimeout: fn => { timers.set(++id,fn); return id; }, clearTimeout: key => timers.delete(key), AbortSignal: { timeout: () => 'fake' }, fetch: async () => { requests++; throw Error('timeout'); } };
  const mod = load('lib/experiences/lmu/persistence.ts', { './acknowledged-save-queue': { createAcknowledgedSaveQueue }, fixture }, 'const { fetch, setTimeout, clearTimeout, AbortSignal } = require("fixture");\n' + readFileSync('lib/experiences/lmu/persistence.ts','utf8'));
  const draft = { moduleId: 'values', status: 'in-progress', responses: {}, derivedResults: {} };
  const first = mod.scheduleSectionSave(draft, 'assessment'); [...timers.values()][0](); timers.clear(); assert.equal(await first,false);
  assert.equal(await mod.scheduleSectionSave({ ...draft, status: 'completed', result: {} }, 'assessment'), false);
  assert.equal(await mod.deleteServerSection('values', 'assessment'), false);
  assert.equal(requests,1); assert.equal(mod.saveStatusSnapshot(),'failed');
  assert.equal(await mod.scheduleSectionSave({ ...draft, moduleId: 'unmapped' }),false);
});
