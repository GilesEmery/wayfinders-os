import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from './offline-module.mjs';

function fixture(slug) {
  let writes = 0;
  const section = { id: 'first', section_key: 'first', renderer_mode: 'builder', completion_rule: 'manual', legacy: false };
  const last = { ...section, id: 'last', section_key: 'last' };
  const course = { status: 'ready', participantId: 'fixture', enrollmentId: 'enrollment', requirementsBypassed: false, structure: { experience: { id: 'experience', slug }, version: { id: 'version' }, modules: [{ module_key: 'group', lessons: [{ lesson_key: 'lesson', sections: [section, last] }] }] } };
  const db = { from() {
    const chain = new Proxy({}, { get(_, key) {
      if (key === 'then') return done => Promise.resolve({ data: { status: 'in_progress' }, error: null }).then(done);
      return () => { if (['update', 'upsert', 'insert'].includes(key)) writes++; return chain; };
    } }); return chain;
  } };
  const progress = load('lib/experiences/builder/progress-mutations.ts', {
    '@/lib/supabase/admin': { createAdminSupabaseClient: () => db },
    './participant-runtime': { resolveParticipantCourseForMutation: async () => course },
    './progress': {}, './block-registry': {}, './shared-assessment-completion': {}, './prebuilt-assessment': {},
  });
  return { progress, course, writes: () => writes };
}
const forward = { moduleKey: 'group', lessonKey: 'lesson', sectionKey: 'last' };
test('Hub Leader Cohort can browse past unfinished required work without completion writes', async () => {
  const fixtureData = fixture('hub-leader-cohort');
  const result = await fixtureData.progress.completeParticipantSectionForForwardNavigation('hub-leader-cohort', 'group', 'lesson', 'first', forward);
  assert.equal(result.ok, true); assert.equal(result.courseCompleted, false); assert.equal(fixtureData.writes(), 0);
});
test('Hub Leader Cohort final completion still rejects unfinished work', async () => {
  const fixtureData = fixture('hub-leader-cohort');
  const result = await fixtureData.progress.completeParticipantSectionForForwardNavigation('hub-leader-cohort', 'group', 'lesson', 'last');
  assert.equal(result.ok, false); assert.equal(fixtureData.writes(), 0);
});
test('other courses retain their forward-navigation completion gate', async () => {
  const fixtureData = fixture('another-course');
  assert.equal((await fixtureData.progress.completeParticipantSectionForForwardNavigation('another-course', 'group', 'lesson', 'first', forward)).ok, false);
  assert.equal(fixtureData.writes(), 0);
});
test('browsing preserves authorization and valid forward-destination checks', async () => {
  const fixtureData = fixture('hub-leader-cohort');
  assert.equal((await fixtureData.progress.completeParticipantSectionForForwardNavigation('hub-leader-cohort', 'group', 'lesson', 'first', { ...forward, sectionKey: 'missing' })).ok, false);
  fixtureData.course.status = 'denied';
  assert.equal((await fixtureData.progress.completeParticipantSectionForForwardNavigation('hub-leader-cohort', 'group', 'lesson', 'first', forward)).ok, false);
  assert.equal(fixtureData.writes(), 0);
});
