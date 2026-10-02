// Offline harness: transpile real server modules with an allowlisted fake database.
// No environment files, credentials, network calls, participant answers or signed URLs.
import assert from 'node:assert/strict';
import { load as loadOffline } from './offline-module.mjs';
import { execFileSync } from 'node:child_process';
const baseline = process.argv.includes('--baseline');
const load = (file, imports) => loadOffline(file, imports, baseline ? execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' }) : undefined);
console.log(baseline ? 'Committed baseline (HEAD), offline fixtures' : 'Working tree, offline fixtures');
import { performance } from 'node:perf_hooks';
const section = { id: 'section', module_id: 'module', lesson_id: 'lesson', section_key: 'page', renderer_mode: 'builder', legacy: false, completion_rule: 'response_submitted', layout: { columns: [{ blocks: [{ id: 'block', block_key: 'response', block_type: 'custom_component', custom_renderer_key: 'personal-impact-statement.v1', status: 'active', visibility: 'visible', requirement_level: 'required' }] }] } };
const ready = { status: 'ready', participantId: 'fixture-participant', enrollmentId: 'fixture-enrollment', requirementsBypassed: false, structure: { experience: { id: 'experience' }, version: { id: 'version' }, modules: [{ module_key: 'group', lessons: [{ lesson_key: 'lesson', sections: [section] }] }] }, responses: { block: { definition: { id: 'definition', response_type: 'structured_response', is_required: true } } } };
let resolves = 0, queries = 0, failed = false;
const db = { from(table) { let select = ''; const chain = new Proxy({}, { get(_, key) { if (key === 'then') return (done) => { queries++; const data = table === 'response_definitions' ? [{ id: 'definition', is_required: true }] : table === 'participant_responses' ? [{ response_definition_id: 'definition', status: 'submitted' }] : table === 'section_progress' && select === 'section_id,status' ? [] : []; return Promise.resolve({ data, error: null }).then(done); }; return (...args) => { if (key === 'select') select = args[0]; return chain; }; } }); return chain; } };
const runtime = { async resolveParticipantCourse() { resolves++; return ready; }, async resolveParticipantCourseForMutation() { resolves++; return ready; } };
const progress = load('lib/experiences/builder/progress-mutations.ts', {
  '@/lib/supabase/admin': { createAdminSupabaseClient: () => db }, './performance-measurement': { measureOperation: (_, work) => work() }, './participant-runtime': runtime,
  './progress': { normalizeSectionProgress: (x) => x, summarizeParticipantProgress: () => ({ experience: { status: 'in_progress' } }) },
  './block-registry': { getBlockDefinition: () => ({ response: {} }) }, './shared-assessment-completion': {}, './prebuilt-assessment': {},
});
const pis = load('lib/experiences/builder/personal-impact-statement-mutations.ts', {
  './performance-measurement': { measureOperation: (_, work) => work() }, './participant-runtime': runtime, './progress-mutations': progress,
  './personal-impact-statement': { PERSONAL_IMPACT_RENDERER_KEY: 'personal-impact-statement.v1', projectPersonalImpactSave() {} },
  './assessment-response-save': { async persistAssessmentResponse() { if (failed) throw new Error('Fixture persistence failure'); return { completedAt: null }; }, async confirmAssessmentCompletion() {} },
});
for (const finish of [false, true]) {
  resolves = queries = 0;
  const start = performance.now();
  await pis.savePersonalImpactStatement('course', 'group', 'lesson', 'page', 'response', null, {}, finish);
  assert.equal(resolves, baseline ? finish ? 3 : 2 : 1);
  console.log(JSON.stringify({ fixture: finish ? 'pis-finish' : 'pis-draft', courseResolutions: resolves, progressRequests: queries, harnessMs: +(performance.now() - start).toFixed(2) }));
}
failed = true; resolves = queries = 0;
await assert.rejects(() => pis.savePersonalImpactStatement('course', 'group', 'lesson', 'page', 'response', null, {}), /Fixture persistence failure/);
assert.equal(queries, 0, 'failed persistence must not write progress');
await assert.rejects(() => pis.savePersonalImpactStatement('../invalid', 'group', 'lesson', 'page', 'response', null, {}), /unavailable/);
failed = false;
for (let i = 0; i < 2; i++) await pis.savePersonalImpactStatement('course', 'group', 'lesson', 'page', 'response', null, {});
const resources = Array.from({ length: 8 }, (_, i) => ({ id: `asset-${i}`, storage_bucket: 'fixture-bucket', storage_path: `path-${i}`, original_filename: `file-${i}.pdf` }));
let signing = 0, metadata = 0;
const assetDb = { from() { return { select() { return this; }, in() { return this; }, then(done) { metadata++; return Promise.resolve({ data: resources, error: null }).then(done); } }; }, storage: { from() { return { async createSignedUrl(path, expiry, options) { signing++; assert.equal(expiry, 900); if (options) assert.match(options.download, /^file-\d.pdf$/); return { data: { signedUrl: 'https://fixture.invalid/' }, error: null }; }, async createSignedUrls(paths, expiry) { signing++; assert.equal(expiry, 900); return { data: paths.map(path => ({ path, signedUrl: 'https://fixture.invalid/', error: null })), error: null }; } }; } } };
const assets = load('lib/experiences/builder/resource-assets.ts', { 'node:crypto': { randomUUID() {} } });
const start = performance.now();
assert.equal((await assets.resolveResourceIds(assetDb, resources.map(x => x.id))).size, 8);
console.log(JSON.stringify({ fixture: 'eight-private-assets-one-bucket', metadataRequests: metadata, signingRequests: signing, harnessMs: +(performance.now() - start).toFixed(2) }));
assert.equal(signing, baseline ? 16 : 9);
console.log('Offline fixture assertions passed. Harness time is not database, network or render latency.');

resolves = 0;
let cardRequests = 0;
const cardDb = { from() {
  let single = false;
  const query = new Proxy({}, { get(_, key) {
    if (key === 'then') return done => { cardRequests++; return Promise.resolve({ data: single ? { status: 'completed' } : [], error: null }).then(done); };
    return () => { if (key === 'maybeSingle') single = true; return query; };
  } });
  return query;
} };
const cards = load('components/experiences/builder/PrebuiltAssessmentBlock.tsx', {
  'react/jsx-runtime': { jsx: (_, props) => props }, '@/lib/supabase/admin': { createAdminSupabaseClient: () => cardDb },
  '@/lib/experiences/builder/participant-runtime': runtime,
  '@/lib/experiences/builder/prebuilt-assessment': { PREBUILT_ASSESSMENT_BLOCK_TYPE: 'prebuilt_assessment', parsePrebuiltAssessmentConfiguration: () => ({ ok: true, value: { assessmentExperienceId: 'assessment' } }) },
  './AssessmentLaunchCard': { assessmentLaunchLabel: status => status }, './EmbeddedAssessmentLauncher': {},
});
const blocks = [1, 2, 3].map(id => ({ id: String(id), block_type: 'prebuilt_assessment', status: 'active', visibility: 'visible', configuration: { assessmentExperienceId: 'assessment' } }));
if (baseline) await Promise.all(blocks.map(block => cards.PrebuiltAssessmentBlock({ blockId: block.id, configuration: block.configuration, route: { slug: 'course' }, preview: false })));
else await cards.loadAssessmentCards({ layout: { columns: [{ blocks }] } }, 'participant', 'enrollment');
assert.equal(resolves, baseline ? 3 : 0);
assert.equal(cardRequests, baseline ? 9 : 3);
console.log(JSON.stringify({ fixture: 'three-assessment-cards', extraCourseResolutions: resolves, cardRequests }));
