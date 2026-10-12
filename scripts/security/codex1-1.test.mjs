import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from '../performance/offline-module.mjs';

// No app route/page execution. Imports are denied unless explicitly supplied.
const sharing = load('lib/platform/response-sharing-policy.ts', {});
const ok = data => ({ data, error: null });
function fakeDb(handler) {
  const queries = [];
  return { queries, from(table) {
    const q = { table, calls: [] }; queries.push(q);
    const b = {};
    for (const m of ['select','eq','in','order','limit','not','neq','is','single','maybeSingle']) b[m] = (...args) => { q.calls.push([m,...args]); return b; };
    b.then = (resolve,reject) => Promise.resolve().then(() => handler(q)).then(resolve,reject);
    return b;
  } };
}
const auth = db => load('lib/platform/authorization.ts', {
  '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
  '@/lib/platform/auth': { getPlatformUser: () => { throw Error('No identity lookup expected'); } },
});
const member = { authUserId: 'auth', globalRole: null, assignments: [] };
const leader = { ...member, assignments: [{ role: 'hub_leader', scope_type: 'hub', scope_id: 'hub' }] };
const admin = { ...member, globalRole: 'admin' };
const baseAudience = { viewerParticipantId: 'viewer', respondentParticipantId: 'person', cohortId: 'cohort', experienceId: 'course', responseCohortId: 'cohort', enrollmentExperienceId: 'course', activeEnrollment: true, activeRespondentMembership: true, assignedFacilitator: true, currentVersion: true };
for (const level of ['Private','Facilitator Shared','Group Shared']) for (const role of ['respondent','assigned facilitator','same-cohort participant','unrelated participant','Hub leader','Course Creator','Admin','Super Admin','anonymous']) {
  test(`${level}/${role}: absent durable consent never grants nonowner raw or result`, () => {
    const definition = { raw_visibility: level === 'Private' ? 'participant_only' : level === 'Facilitator Shared' ? 'participant_and_facilitator' : 'cohort_members', result_visibility: level === 'Private' ? 'participant_only' : level === 'Facilitator Shared' ? 'participant_and_facilitator' : 'cohort_members', share_mode: 'required' };
    const audience = { ...baseAudience, viewerParticipantId: role === 'respondent' ? 'person' : role === 'anonymous' ? null : role, assignedFacilitator: role === 'assigned facilitator' };
    for (const kind of ['raw','result']) assert.equal(sharing.canReadResponseContent(audience, definition, kind), role === 'respondent');
  });
}
test('only explicit trusted consent enables pure facilitator contract; group remains disabled', () => {
  const def = { raw_visibility: 'participant_and_facilitator', result_visibility: 'participant_only', share_mode: 'required' };
  for (const consent of [undefined,false,'true']) assert.equal(sharing.canReadResponseContent({ ...baseAudience, participantSharingConfirmed: consent },def,'raw'),false);
  assert.equal(sharing.canReadResponseContent({ ...baseAudience, participantSharingConfirmed: true },def,'raw'),true);
  assert.equal(sharing.canReadResponseContent({ ...baseAudience, participantSharingConfirmed: true },def,'result'),false);
  assert.equal(sharing.canReadResponseContent({ ...baseAudience, participantSharingConfirmed: true },{ ...def, raw_visibility: 'cohort_members' },'raw'),false);
});
for (const table of ['participants','hub_memberships']) test(`Hub visibility denies partial data plus ${table} error`, async () => {
  const db = fakeDb(q => q.table === table ? { data: { id: 'present' }, error: { message: 'sensitive' } } : ok({ id: 'present' }));
  await assert.rejects(auth(db).canViewHub(member,'hub'), /Access could not be verified/);
});
test('Hub target membership error cannot grant leader management', async () => {
  const db = fakeDb(() => ({ data: { id: 'present' }, error: {} }));
  await assert.rejects(auth(db).canManageWayfinderInHub(leader,'person','hub'));
});
for (const table of ['experience_offerings','cohorts']) test(`offering management denies partial ${table} error even for Admin`, async () => {
  const db = fakeDb(q => q.table === table ? { data: { hub_id: null, cohort_id: 'cohort' }, error: {} } : ok({ hub_id: null, cohort_id: 'cohort' }));
  await assert.rejects(auth(db).canManageExperienceOffering(admin,'offering'));
});
test('missing cohort cannot fall back to platform privilege', async () => {
  const db = fakeDb(q => ok(q.table === 'cohorts' ? null : { cohort_id: 'missing', hub_id: null }));
  assert.equal(await auth(db).canManageExperienceOffering(admin,'offering'),false);
});
for (const operation of ['canViewHub','canManageWayfinderInHub','canManageExperienceOffering']) test(`${operation} rejected lookup never resolves a grant`, async () => {
  const db = fakeDb(() => { throw Error('rejected lookup'); });
  const args = operation === 'canManageWayfinderInHub' ? [leader,'person','hub'] : [member,'hub'];
  await assert.rejects(auth(db)[operation](...args));
});
test('successful member, exact Hub leader and verified offering retain legitimate access', async () => {
  const db = fakeDb(q => ok(q.table === 'experience_offerings' ? { hub_id: 'hub' } : { id: 'membership' }));
  const mod = auth(db);
  assert.equal(await mod.canViewHub(member,'hub'),true);
  assert.equal(await mod.canManageWayfinderInHub(leader,'person','hub'),true);
  assert.equal(await mod.canManageWayfinderInHub(leader,'person','other'),false);
  assert.equal(await mod.canManageExperienceOffering(leader,'offering'),true);
});
function storageFixture() {
  const local = new Map(), receipts = [];
  const fixture = { window: { localStorage: { getItem: k => local.get(k), setItem: (k,v) => local.set(k,v) }, dispatchEvent() {} }, Event: class {} };
  const mod = load('lib/experiences/lmu/storage.ts', {
    './persistence': { SECTION_TO_MODULE: {}, scheduleSectionSave: () => new Promise(resolve => receipts.push(resolve)), deleteServerSection: () => false }, './original-journey': { LMU_ORIGINAL_EXPERIENCE_ID: 'course' }, fixture,
  }, 'const { window, Event } = require("fixture");\n' + readFileSync('lib/experiences/lmu/storage.ts','utf8'));
  mod.bindAssessment('a');
  return { mod, receipts };
}
const completion = { moduleId: 'values', status: 'completed', responses: { answer: 'old' }, result: { summary: 'old' } };
for (const reset of ['remove','clear','switch-and-return']) test(`late completion receipt after ${reset} cannot restore discarded local work`, async () => {
  const { mod, receipts } = storageFixture();
  const pending = mod.saveModuleProgress('course',completion);
  if (reset === 'remove') mod.removeModuleProgress('course','values');
  if (reset === 'clear') mod.clearExperienceProgress('course');
  if (reset === 'switch-and-return') { mod.bindAssessment('b'); mod.bindAssessment('a'); }
  receipts[0](true);
  assert.equal(await pending,false);
  assert.equal(mod.getModuleProgress('course','values'),undefined);
});
test('new completion survives older acknowledged completion', async () => {
  const { mod, receipts } = storageFixture();
  const old = mod.saveModuleProgress('course',completion);
  const fresh = mod.saveModuleProgress('course',{ ...completion, responses: { answer: 'new' } });
  receipts[0](true); assert.equal(await old,false);
  receipts[1](true); assert.equal(await fresh,true);
  assert.equal(mod.getModuleProgress('course','values').responses.answer,'new');
});
function assessmentFixture({ owner = true, identityError = false, anonymous = false } = {}) {
  const db = fakeDb(q => q.table === 'participants' ? { data: { id: owner ? 'person' : 'other' }, error: identityError ? {} : null } : ok(q.table === 'lmu_assessments' ? { id: 'assessment', completed_at: '2026-10-10' } : [{ section_key: 'values', result_data: { secret: 'own result' } }]));
  let passwords = 0;
  const mod = load('lib/assessment-results.ts', {
    '@/lib/platform/auth': { getPlatformUser: async () => anonymous ? null : { id: 'auth' } }, '@/lib/platform/response-sharing-policy': sharing,
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, '@/lib/experiences/access/server': { requireExperiencePasswordBySlug: async () => { passwords++; } },
    '@/lib/experiences/builder/circle-of-influence': { CIRCLE_RESPONSE_KEY: 'circle' }, '@/lib/experiences/builder/personal-impact-statement': { PERSONAL_IMPACT_RESPONSE_KEY: 'pis' }, '@/lib/experiences/builder/start-something': { START_SOMETHING_RESPONSE_KEY: 'start' },
    '@/lib/platform/journey-policy': {}, '@/lib/assessment-results-policy': { NATIVE_ASSESSMENT_RESULTS: {} },
  });
  return { mod, db, passwords: () => passwords };
}
test('respondent own LMU result works and checks password before private queries', async () => {
  const f = assessmentFixture(); const result = await f.mod.loadCompletedAssessmentResult('person','life-mapping-u','assessment');
  assert.equal(result.data[0].result_data.secret,'own result'); assert.equal(f.passwords(),1);
  assert.equal(f.db.queries[0].table,'participants');
  assert.ok(f.db.queries[1].calls.some(([m,k,v]) => m === 'eq' && k === 'participant_id' && v === 'person'));
});
test('identity error with owner-shaped data denies before any assessment body query', async () => {
  const f = assessmentFixture({ identityError: true });
  await assert.rejects(f.mod.loadCompletedAssessmentResult('person','life-mapping-u','assessment'));
  assert.equal(f.db.queries.length,1); assert.equal(f.passwords(),0);
});
test('anonymous assessment request performs no database reads', async () => {
  const f = assessmentFixture({ anonymous: true });
  assert.equal(await f.mod.loadCompletedAssessmentResult('person','life-mapping-u','assessment'),null);
  assert.equal(f.db.queries.length,0);
});
test('Hub route source rejects membership errors before private metadata/profile queries', () => {
  const hub = readFileSync('app/hubs/[hubSlug]/page.tsx','utf8');
  assert.ok(hub.indexOf('membershipRead.error') < hub.indexOf('const { data: offerings }'));
  const profile = readFileSync('app/hubs/[hubSlug]/members/[participantId]/page.tsx','utf8');
  assert.ok(profile.indexOf('if (membershipError)') < profile.indexOf('const { data: person'));
});
for (const failing of ['content_block_resources','resources']) test(`resource association ${failing} error cannot produce copy links`, async () => {
  const db = fakeDb(q => q.table === failing ? { data: [{ resource_id: 'asset', id: 'asset', status: 'active', storage_path: 'courses/course/asset' }], error: {} } : ok([{ resource_id: 'asset', sort_order: 0 }]));
  await assert.rejects(load('lib/experiences/admin/resource-copy.ts',{}).inspectBlockResourceLinks(db,'block','course'));
});
for (const failure of ['identity','admin_members','participants','rejected']) test(`global admin identity ${failure} read cannot yield a grant`, async () => {
  const db = fakeDb(q => {
    if (failure === 'rejected') throw Error('sensitive transport');
    return { data: q.table === 'admin_members' ? { role: 'super_admin', id: 'admin', email_normalized: 'synthetic' } : { full_name: 'Owner' }, error: q.table === failure ? {} : null };
  });
  const mod = load('lib/admin/auth.ts', {
    'next/navigation': { redirect: () => { throw Error('redirect'); } },
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
    '@/lib/supabase/server': { createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'auth', email: 'synthetic' } }, error: failure === 'identity' ? {} : null }) } }) },
  });
  await assert.rejects(mod.getAdmin());
  if (failure === 'identity') assert.equal(db.queries.length,0);
});
test('global admin successful identity remains available', async () => {
  const db = fakeDb(q => ok(q.table === 'admin_members' ? { role: 'admin', id: 'admin', email_normalized: 'synthetic' } : { full_name: 'Owner' }));
  const mod = load('lib/admin/auth.ts', {
    'next/navigation': { redirect: () => { throw Error('unexpected redirect'); } },
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
    '@/lib/supabase/server': { createServerSupabaseClient: async () => ({ auth: { getUser: async () => ok({ user: { id: 'auth', email: 'synthetic' } }) } }) },
  });
  assert.equal((await mod.getAdmin()).role,'admin');
});
test('owner-admin Journey LMU content succeeds through ownership gate', async () => {
  const db = fakeDb(q => ok(q.table === 'participants' ? { id: 'person' } : q.table === 'lmu_assessments' ? q.calls.some(([m]) => m === 'maybeSingle') ? { id: 'assessment' } : [{ id: 'assessment', status: 'completed', started_at: 'today' }] : q.table === 'lmu_responses' ? [{ assessment_id: 'assessment', section_key: 'values', response_data: { value: 'own text' } }] : []));
  const mod = load('lib/platform/response-library.ts', {
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './auth': {}, './authorization': {},
    '@/lib/experiences/access/server': {}, '@/lib/experiences/builder/data': {}, '@/lib/experiences/builder/participant-runtime': {}, '@/lib/experiences/builder/prebuilt-assessment': {},
    './response-library-policy': { readableResponseFields: d => [{ question: 'Value', response: d.value }] }, './response-sharing-policy': sharing,
    '@/lib/admin/auth': { getAdmin: async () => ({ id: 'admin-auth' }) },
  });
  const result = await mod.loadAdminJourneyResponses('person',{ assessmentId: 'assessment' });
  assert.equal(result.courses[0].weeks[0].activities[0].items[0].response,'own text');
  assert.equal(db.queries[0].table,'participants');
});
test('duplicate generic form submit while receipt pending invokes persistence once', async () => {
  let finish, calls = 0;
  const pending = new Promise(resolve => { finish = resolve; });
  const jsx = (_,props) => props;
  const mod = load('components/experiences/builder/ParticipantResponseForm.tsx', {
    react: { useEffect: () => {}, useRef: () => ({ current: false }), useState: () => [{ pending: false, message: '', failed: false }, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx }, '@/lib/experiences/builder/response-actions': { persistResponseAction: () => { calls++; return pending; } }, fixture: { FormData: class {} },
  }, 'const FormData = require("fixture").FormData;\n' + readFileSync('components/experiences/builder/ParticipantResponseForm.tsx','utf8'));
  const form = mod.ParticipantResponseForm({ route: {}, children: null });
  const event = { preventDefault() {}, currentTarget: {}, nativeEvent: { submitter: { dataset: { saveMode: 'draft' } } } };
  const first = form.onSubmit(event); await form.onSubmit(event);
  assert.equal(calls,1); finish({ ok: true, message: 'Draft saved.' }); await first;
});
