import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function fixture({ author = 'me', status = 'ready', deleted = true, messageDelivery = 'delivery', visible = true } = {}) {
  const filters = [];
  let mutations = 0;
  const chatModule = { id: 'chat', module_type: 'chat', availability_context: 'cohort', audience: 'cohort', delivery_override_id: 'delivery', chat_messages: visible ? [{ id: 'message', author_participant_id: author, delivery_override_id: messageDelivery }] : [] };
  const query = { eq(key, value) { filters.push([key, value]); return this; }, select() { return this; }, async maybeSingle() { return { data: deleted ? { id: 'message' } : null, error: null }; } };
  const dependencies = {
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect(url) { throw new Error(url); } },
    '@/lib/supabase/admin': { createAdminSupabaseClient() { return { from(table) { assert.equal(table, 'companion_chat_messages'); return { delete() { mutations++; return query; } }; } }; } },
    '@/lib/platform/auth': {},
    './companion': { availabilityApplies: () => true, audienceAllowsParticipant: () => true, moduleApplies: () => true },
    './participant-runtime': { participantSectionHref: () => '/course', appendParticipantQuery: (href, key, value) => `${href}?${key}=${value}`, resolveParticipantCourse: async () => ({ status, participantId: 'me', enrollmentId: 'enrollment', structure: { modules: [{ id: 'week', module_key: 'week', lessons: [{ id: 'lesson', lesson_key: 'lesson', sections: [{ id: 'section', section_key: 'section' }] }] }] }, companion: { modules: [chatModule], hasCohortContext: true } }) },
  };
  const source = readFileSync(new URL('./companion-actions.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name) => { assert.ok(dependencies[name], name); return dependencies[name]; }, exports);
  return { run: () => exports.deleteCompanionChatMessageAction('course', 'week', 'lesson', 'section', 'chat', 'cohort', 'message'), filters, mutations: () => mutations };
}

test('own chat deletion scopes the database mutation to author and delivery', async () => {
  const f = fixture();
  await assert.rejects(f.run(), /companionSaved=Message deleted/);
  assert.equal(f.mutations(), 1);
  assert.deepEqual(f.filters, [['id', 'message'], ['author_participant_id', 'me'], ['delivery_override_id', 'delivery']]);
});
test('another member message cannot be deleted with a forged action request', async () => {
  const f = fixture({ author: 'other' });
  await assert.rejects(f.run(), /companionError/);
  assert.equal(f.mutations(), 0);
});
test('own historical message is deleted from its original delivery', async () => {
  const f = fixture({ messageDelivery: 'previous-version-delivery' });
  await assert.rejects(f.run(), /companionSaved=Message deleted/);
  assert.equal(f.mutations(), 1);
  assert.deepEqual(f.filters, [['id', 'message'], ['author_participant_id', 'me'], ['delivery_override_id', 'previous-version-delivery']]);
});
test('a message outside the resolved chat cannot be deleted', async () => {
  const f = fixture({ visible: false });
  await assert.rejects(f.run(), /companionError/);
  assert.equal(f.mutations(), 0);
});
test('inactive course access cannot delete messages', async () => {
  const f = fixture({ status: 'unavailable' });
  await assert.rejects(f.run(), /companionError/);
  assert.equal(f.mutations(), 0);
});
test('a missing database row reports failure instead of success', async () => {
  const f = fixture({ deleted: false });
  await assert.rejects(f.run(), /companionError/);
});
