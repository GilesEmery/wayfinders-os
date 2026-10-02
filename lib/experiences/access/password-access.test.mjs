import assert from 'node:assert/strict';
import { test, before, beforeEach } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';


const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const id = '24fd0477-2a16-4ca1-98bb-c090931895c3';
const second = '24fd0477-2a16-4ca1-98bb-c090931895c4';
const blockId = '24fd0477-2a16-4ca1-98bb-c090931895c5';
const secret = 'test-only-signing-secret-never-production-1234';
const route = { slug: 'fixture-course', moduleKey: 'module', lessonKey: 'lesson', sectionKey: 'section', cohortId: '24fd0477-2a16-4ca1-98bb-c090931895c6' };
let fixture, hash;
const cookieMap = new Map();
const tables = {};
globalThis.__experienceAccessTest = {
  cookies: { get: (name) => cookieMap.has(name) ? { value: cookieMap.get(name) } : undefined, set: (name, value) => cookieMap.set(name, value) },
  headers: { get: () => fixture.path },
  user: () => fixture.user,
  authorized: () => fixture.authorized,
  profile: () => { fixture.profileCalls++; return { participant: { id: 'fixture-participant' } }; },
  course: () => fixture.course,
  db: {
    from(table) {
      let filters = [], fields, operation = 'read', payload;
      const execute = () => {
        fixture.operations.push({ table, operation });
        const rows = tables[table] ?? [];
        const matching = rows.filter(row => filters.every(([key, value]) => row[key] === value));
        if (operation === 'delete') tables[table] = rows.filter(row => !matching.includes(row));
        if (operation === 'upsert') {
          const entry = { ...payload, credential_revision: randomUUID(), password_updated_at: new Date().toISOString() };
          tables[table] = [...rows.filter(row => row.experience_id !== payload.experience_id), entry];
        }
        if (operation === 'insert') tables[table] = [...rows, payload];
        const project = (row) => fields ? Object.fromEntries(fields.split(',').map(key => [key, row[key]])) : row;
        return { data: matching.map(project), error: null };
      };
      const query = {
        select(value) { fields = value; return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        maybeSingle: async () => { const result = execute(); return { ...result, data: result.data[0] ?? null }; },
        delete() { operation = 'delete'; return query; },
        upsert(value) { operation = 'upsert'; payload = value; return query; },
        insert(value) { operation = 'insert'; payload = value; return query; },
        then(yes, no) { return Promise.resolve(execute()).then(yes, no); },
      };
      return query;
    },
    async rpc() { fixture.rpcCalls++; return { data: [{ launch_path: '/experiences/personal-impact-statement', attempt_id: 'fixture-attempt' }], error: null }; },
  },
};
const mocks = {
  'server-only': 'export {};',
  'next/server': 'export class NextResponse { static json(body,options={}) { return {body,status:options.status??200,headers:new Headers(options.headers)}; } static redirect(url,status=307) { return {url:String(url),status,headers:new Headers()}; } }',
  '@supabase/ssr': 'export const createServerClient=()=>({auth:{getUser:async()=>({data:{user:globalThis.__experienceAccessTest.user()}})}});',
  'next/headers': 'export const cookies=async()=>globalThis.__experienceAccessTest.cookies; export const headers=async()=>globalThis.__experienceAccessTest.headers;',
  'next/navigation': 'export function redirect(url) { const error=new Error("redirect"); error.url=url; throw error; }',
  'next/cache': 'export const revalidatePath=()=>{};',
  '@/lib/supabase/admin': 'export const createAdminSupabaseClient=()=>globalThis.__experienceAccessTest.db;',
  '@/lib/platform/auth': 'export const getPlatformUser=async()=>globalThis.__experienceAccessTest.user(); export const ensurePlatformProfile=async()=>globalThis.__experienceAccessTest.profile();',
  '@/lib/platform/authorization': 'export const getAuthorizationContext=async()=>({}); export const canAdminExperienceById=async()=>globalThis.__experienceAccessTest.authorized();',
  './participant-runtime': 'export const resolveParticipantCourse=async()=>globalThis.__experienceAccessTest.course();',
  '@/lib/supabase/server': 'export const createServerSupabaseClient=async()=>({auth:{getUser:async()=>({data:{user:globalThis.__experienceAccessTest.user()}})}});',
};
registerHooks({
  resolve(specifier, context, next) {
    if (mocks[specifier]) return { url: `mock:${specifier}`, shortCircuit: true };
    let path;
    if (specifier.startsWith('@/')) path = resolve(root, specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) path = resolve(dirname(fileURLToPath(context.parentURL)), specifier);
    if (path && !existsSync(path) && existsSync(path + '.ts')) path += '.ts';
    if (path && existsSync(path)) return { url: pathToFileURL(path).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('mock:')) return { format: 'module', source: mocks[url.slice(5)], shortCircuit: true };
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const security = await import('./security.ts');
const server = await import('./server.ts');
const { experiencePasswordProxy } = await import('./proxy.ts');
const { loadCompletedAssessmentResult } = await import('../../assessment-results.ts');
const { submitExperiencePassword } = await import('../../../app/experience-access/[slug]/actions.ts');
const { updateExperiencePassword } = await import('./admin-actions.ts');
const { preparePrebuiltAssessmentAction } = await import('../builder/prebuilt-assessment-actions.ts');
const { ensureParticipantContext } = await import('../lmu/server/account.ts');
const { selfEnrollAction } = await import('../../../app/experiences/[slug]/actions.ts');
process.env.EXPERIENCE_ACCESS_SIGNING_SECRET = secret;
before(async () => { hash = await security.hashExperiencePassword('fixture password'); });
beforeEach(() => {
  cookieMap.clear();
  for (const key of Object.keys(tables)) delete tables[key];
  tables.experiences = [{ id, slug: 'personal-impact-statement', name: 'Fixture', status: 'active', experience_type: 'assessment' }, { id: second, slug: 'life-mapping-u', status: 'active', experience_type: 'assessment' }];
  tables.experience_password_credentials = [{ experience_id: id, password_hash: hash, credential_revision: 'revision-1' }];
  tables.content_blocks = [{ id: blockId, content: { assessmentExperienceId: id } }];
  fixture = { path: '/experiences/personal-impact-statement/course/module/lesson/section?embeddedAttempt=fixture&returnTo=%2Fexperiences%2Ffixture-course', user: { id: 'fixture-user', email: 'fixture@example.invalid' }, authorized: false, profileCalls: 0, rpcCalls: 0, operations: [], course: { status: 'ready', enrollmentId: 'existing-enrollment', participantId: 'fixture-participant', structure: { modules: [{ module_key: 'module', lessons: [{ lesson_key: 'lesson', sections: [{ section_key: 'section', layout: { columns: [{ blocks: [{ id: blockId, block_type: 'prebuilt_assessment', status: 'active', visibility: 'visible', configuration: { assessmentExperienceId: id } }] }] } }] }] }] } } };
});
const form = (password) => { const data = new FormData(); data.set('password', password); return data; };
const redirectOf = async (operation) => { try { await operation(); assert.fail('Expected redirect'); } catch (error) { assert.ok(error.url, error.stack); return error.url; } };

test('1. Open Experience requires no password', async () => { tables.experience_password_credentials = []; assert.equal(await server.needsExperiencePassword(id), false); });
test('2. Protected Experience requires password', async () => { assert.equal(await server.needsExperiencePassword(id), true); });
test('3. Correct password issues a valid grant', async () => { await redirectOf(() => submitExperiencePassword('personal-impact-statement', '/experiences/personal-impact-statement', undefined, form('fixture password'))); assert.equal(await server.needsExperiencePassword(id), false); });
test('4. Incorrect password creates no grant or state', async () => { const url = await redirectOf(() => submitExperiencePassword('personal-impact-statement', '/experiences/personal-impact-statement', undefined, form('incorrect'))); assert.match(url, /error=incorrect/); assert.equal(cookieMap.size, 0); assert.equal(fixture.operations.some(op => op.operation !== 'read'), false); assert.equal(fixture.rpcCalls, 0); });
test('5. Gate response contains no hash or salt', async () => { const url = await redirectOf(() => server.requireExperiencePassword(tables.experiences[0])); assert.ok(!url.includes(hash)); assert.ok(!url.includes(hash.split('$')[4])); });
test('6. Password storage is salted scrypt, never plaintext', async () => { const another = await security.hashExperiencePassword('fixture password'); assert.notEqual(another, hash); assert.match(hash, /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/); assert.ok(!hash.includes('fixture password')); });
test('7. Grant is scoped to one Experience', () => { const token = security.issueGrant(id, 'revision-1', secret); assert.equal(security.validGrant(token, second, 'revision-1', secret), false); });
test('8. Grant survives deep-link navigation', async () => { cookieMap.set(security.grantCookieName(id), security.issueGrant(id, 'revision-1', secret)); await server.requireExperiencePassword(tables.experiences[0], fixture.path); assert.equal(await server.needsExperiencePassword(id), false); });
test('9. Deep links require the gate and preserve full context', async () => { const url = new URL(await redirectOf(() => server.requireExperiencePassword(tables.experiences[0])), 'https://fixture.invalid'); assert.equal(url.pathname, '/experience-access/personal-impact-statement'); assert.equal(url.searchParams.get('returnTo'), fixture.path); });
test('10. Credential changes invalidate old grants', async () => { cookieMap.set(security.grantCookieName(id), security.issueGrant(id, 'revision-1', secret)); tables.experience_password_credentials[0].credential_revision = 'revision-2'; assert.equal(await server.needsExperiencePassword(id), true); });
test('11. Removing/recreating credential cannot revive a grant', async () => { cookieMap.set(security.grantCookieName(id), security.issueGrant(id, 'revision-1', secret)); tables.experience_password_credentials = []; assert.equal(await server.needsExperiencePassword(id), false); tables.experience_password_credentials = [{ experience_id: id, password_hash: hash, credential_revision: randomUUID() }]; assert.equal(await server.needsExperiencePassword(id), true); });
test('12. Password policy never modifies restricted admission or visibility', async () => { fixture.authorized = true; tables.experiences[0].admission_policy = 'admin_assigned'; tables.experiences[0].visibility = 'private'; const original = structuredClone(tables.experiences); const data = form('another fixture password'); data.set('confirm_password', 'another fixture password'); data.set('operation', 'set'); await redirectOf(() => updateExperiencePassword(id, data)); assert.deepEqual(tables.experiences, original); });
test('13. Enrollment is preserved during password changes', async () => { fixture.authorized = true; tables.experience_enrollments = [{ id: 'existing', experience_id: id, status: 'completed' }]; const original = structuredClone(tables.experience_enrollments); const data = form(''); data.set('operation', 'remove'); await redirectOf(() => updateExperiencePassword(id, data)); assert.deepEqual(tables.experience_enrollments, original); });
test('14. Progress and responses are preserved', async () => { fixture.authorized = true; tables.experience_progress = [{ completed: true }]; tables.participant_responses = [{ response_data: { answer: 'fixture' } }]; const original = structuredClone([tables.experience_progress, tables.participant_responses]); const data = form(''); data.set('operation', 'remove'); await redirectOf(() => updateExperiencePassword(id, data)); assert.deepEqual([tables.experience_progress, tables.participant_responses], original); });
test('15. LMU gate runs before participant or assessment creation', async () => { tables.experience_password_credentials.push({ experience_id: second, password_hash: hash, credential_revision: 'lmu-revision' }); const result = await ensureParticipantContext(fixture.user); assert.equal(result.code, 'experience_password_required'); assert.equal(fixture.profileCalls, 0); assert.equal(fixture.operations.some(op => op.operation !== 'read'), false); });
test('16. Personal Impact self-enrollment cannot bypass password', async () => { await redirectOf(() => selfEnrollAction('personal-impact-statement')); assert.equal(fixture.profileCalls, 0); assert.equal(fixture.operations.some(op => op.operation !== 'read'), false); });
test('17. Prebuilt target gate runs before enrollment RPC', async () => { const url = await preparePrebuiltAssessmentAction(blockId, route); assert.match(url, /^\/experience-access\/personal-impact-statement/); assert.equal(fixture.rpcCalls, 0); });
test('18. Course return context survives gate and successful launch', async () => { const gate = new URL(await preparePrebuiltAssessmentAction(blockId, route), 'https://fixture.invalid'); const result = new URL(await redirectOf(() => submitExperiencePassword('personal-impact-statement', gate.searchParams.get('returnTo'), gate.searchParams.get('launchBlock'), form('fixture password'))), 'https://fixture.invalid'); assert.equal(fixture.rpcCalls, 1); assert.equal(result.searchParams.get('embeddedAttempt'), 'fixture-attempt'); assert.equal(result.searchParams.get('returnTo'), '/experiences/fixture-course/course/module/lesson/section?cohort=' + route.cohortId); });
test('19. Authorized admin bypass creates no grant or participant state; preview stays independent', async () => { fixture.authorized = true; await server.requireExperiencePassword(tables.experiences[0]); assert.equal(cookieMap.size, 0); assert.equal(fixture.profileCalls, 0); const preview = readFileSync(resolve(root, 'app/admin/trainings/[experienceId]/versions/[versionId]/preview/page.tsx'), 'utf8'); assert.ok(!preview.includes('submitExperiencePassword')); });
test('20. Unauthorized builder cannot mutate credentials', async () => { const original = structuredClone(tables.experience_password_credentials); const data = form('new fixture password'); data.set('operation', 'set'); await assert.rejects(updateExperiencePassword(id, data), /not authorized/); assert.deepEqual(tables.experience_password_credentials, original); });
test('21. Catalog and admin UI only select safe credential identifiers', () => { const catalog = readFileSync(resolve(root, 'lib/platform/training-catalog.ts'), 'utf8'); const ui = readFileSync(resolve(root, 'components/admin/ExperiencePasswordControls.tsx'), 'utf8'); for (const source of [catalog, ui]) { assert.match(source, /from\("experience_password_credentials"\)\.select\("experience_id"\)/); assert.ok(!source.includes('password_hash')); } });
test('22. Multiple protected Experiences remain isolated', async () => { tables.experience_password_credentials.push({ experience_id: second, password_hash: hash, credential_revision: 'revision-1' }); cookieMap.set(security.grantCookieName(id), security.issueGrant(id, 'revision-1', secret)); assert.equal(await server.needsExperiencePassword(id), false); assert.equal(await server.needsExperiencePassword(second), true); });
test('Expired, tampered, wrong-key and oversized grants fail closed', () => { const now = 1000000; const token = security.issueGrant(id, 'revision-1', secret, now); assert.equal(security.validGrant(token, id, 'revision-1', secret, now + security.GRANT_SECONDS * 1000), false); assert.equal(security.validGrant(token + 'x', id, 'revision-1', secret, now), false); assert.equal(security.validGrant(token, id, 'revision-1', 'different-secret-that-is-also-long-enough', now), false); assert.equal(security.validGrant('x'.repeat(2048), id, 'revision-1', secret, now), false); });
test('Return URL validation rejects external, protocol-relative, encoded and looping paths', () => { for (const url of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/%2f%2fevil.invalid', '/experiences/%5cevil', '/experience-access/test', '/admin', '/experiences/%0atest']) assert.equal(security.safeReturnPath(url, '/experiences/fixture'), '/experiences/fixture'); });
test('Cookie flags are HttpOnly, expiring and Secure in production', () => { assert.deepEqual(security.grantCookieOptions(true), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: security.GRANT_SECONDS }); });
test('Unsafe or mismatched pending launches create no state', async () => { tables.content_blocks[0].content.assessmentExperienceId = second; const result = await redirectOf(() => submitExperiencePassword('personal-impact-statement', '/experiences/fixture-course/course/module/lesson/section', blockId, form('fixture password'))); assert.equal(result, '/experiences/fixture-course/course/module/lesson/section'); assert.equal(fixture.rpcCalls, 0); });

const request = (path) => { const url = new URL(path, 'https://fixture.invalid'); return { url: url.href, nextUrl: url, cookies: { get: (name) => cookieMap.has(name) ? { value: cookieMap.get(name) } : undefined, getAll: () => [] } }; };
test('Proxy protects every LMU deep URL, API and participant result request', async () => {
  tables.experience_password_credentials.push({ experience_id: second, password_hash: hash, credential_revision: 'lmu' });
  for (const path of ['/experiences/life-mapping-u/original', '/experiences/life-mapping-u/module/story', '/experiences/life-mapping-u/life-map/print', '/account/results/life-mapping-u/fixture-result']) {
    const response = await experiencePasswordProxy(request(path)); assert.equal(response.status, 303); assert.match(response.url, /experience-access/);
  }
  const api = await experiencePasswordProxy(request('/api/lmu/sections/story')); assert.equal(api.status, 403); assert.equal(api.body.code, 'experience_password_required'); assert.equal(fixture.profileCalls, 0);
});
test('Proxy grants work across paths and revoke immediately after a revision change', async () => {
  cookieMap.set(security.grantCookieName(id), security.issueGrant(id, 'revision-1', secret));
  for (const path of ['/experiences/personal-impact-statement', '/experiences/personal-impact-statement/course/module/lesson/section', '/account/results/personal-impact-statement/fixture']) assert.equal(await experiencePasswordProxy(request(path)), null);
  tables.experience_password_credentials[0].credential_revision = 'revision-2';
  assert.equal((await experiencePasswordProxy(request('/account/results/personal-impact-statement/fixture'))).status, 303);
});
test('Participant result loader gates before reading protected response data', async () => {
  await redirectOf(() => loadCompletedAssessmentResult('fixture-participant', 'personal-impact-statement', 'fixture-result'));
  assert.ok(!fixture.operations.some(op => ['participant_responses', 'lmu_results'].includes(op.table)));
});
test('Admin bypass at proxy does not create a browser grant', async () => {
  fixture.authorized = true;
  assert.equal(await experiencePasswordProxy(request('/experiences/personal-impact-statement')), null);
  assert.equal(cookieMap.size, 0);
});
test('Existing valid grant resumes pending Course launch without re-entering password', async () => {
  cookieMap.set(security.grantCookieName(id), security.issueGrant(id, 'revision-1', secret));
  const result = await redirectOf(() => submitExperiencePassword('personal-impact-statement', '/experiences/fixture-course/course/module/lesson/section', blockId, new FormData()));
  assert.match(result, /embeddedAttempt=fixture-attempt/); assert.equal(fixture.rpcCalls, 1);
});
