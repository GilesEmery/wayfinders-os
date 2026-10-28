import assert from "node:assert/strict";
import test from "node:test";
import { EMOTIONAL_HEALTH_DOMAINS, EMOTIONAL_HEALTH_QUESTIONS, EMOTIONAL_HEALTH_SCALE, emotionalHealthBand, emotionalHealthResults, normalizeEmotionalHealthAnswers, normalizeEmotionalHealthOrder, projectEmotionalHealthSave, shuffleEmotionalHealthQuestions } from "./emotional-health.ts";
import { completedGenericResult } from "../../assessment-results-policy.ts";
import { activityResponseItems, activityResultItems } from "../../platform/response-library-policy.ts";
import { getParticipantBlockDefinition } from "./block-registry.ts";

const answers = (value = 3) => Object.fromEntries(EMOTIONAL_HEALTH_QUESTIONS.map(q => [q.key, value]));
const first = "2026-10-28T14:00:00.000Z", second = "2026-10-28T15:00:00.000Z";
test("forty original statements retain four fixed groups through shuffled presentation", () => {
  assert.equal(EMOTIONAL_HEALTH_QUESTIONS.length, 40);
  assert.equal(new Set(EMOTIONAL_HEALTH_QUESTIONS.map(q => q.key)).size, 40);
  for (let index = 0; index < 40; index++) assert.equal(EMOTIONAL_HEALTH_QUESTIONS[index].domain, EMOTIONAL_HEALTH_DOMAINS[Math.floor(index / 10)].key);
  for (let run = 0; run < 10; run++) {
    const order = shuffleEmotionalHealthQuestions();
    assert.equal(new Set(order).size, 40);
    const reordered = Object.fromEntries(order.map(key => [key, Number(key.slice(1)) <= 10 ? 5 : 1]));
    assert.deepEqual(emotionalHealthResults(reordered)?.scores.map(s => s.score), [50, 10, 10, 10]);
  }
  assert.deepEqual(normalizeEmotionalHealthOrder(["q1", "q1"]), EMOTIONAL_HEALTH_QUESTIONS.map(q => q.key));
  assert.equal(EMOTIONAL_HEALTH_QUESTIONS[4].text, "My moods are easily affected by external events.");
});
test("integer 1–5 stops sum directly, including item five; untouched or invalid answers cannot finish", () => {
  assert.deepEqual(EMOTIONAL_HEALTH_SCALE.map(s => s.value), [1, 2, 3, 4, 5]);
  for (const { value } of EMOTIONAL_HEALTH_SCALE) assert.deepEqual(emotionalHealthResults(answers(value))?.scores.map(s => s.score), Array(4).fill(value * 10));
  const value = answers(1); value.q5 = 5;
  assert.equal(emotionalHealthResults(value)?.scores[0].score, 14);
  const partial = answers(); delete partial.q40;
  assert.equal(emotionalHealthResults(partial), null);
  for (const invalid of ["3", 0, 6, 2.5, NaN, Infinity, null]) assert.equal(emotionalHealthResults(normalizeEmotionalHealthAnswers({ ...answers(), q2: invalid })), null);
  assert.deepEqual(normalizeEmotionalHealthAnswers({ q1: 1, injected: 5 }), { q1: 1 });
  assert.throws(() => projectEmotionalHealthSave({}, { answers: partial }, true, first), /all 40/);
});
test("owner's inclusive interpretation boundaries are exact and independent", () => {
  assert.deepEqual([0, 10, 25, 26, 38, 39, 50].map(s => emotionalHealthBand(s).key), ["enrichment", "enrichment", "enrichment", "effective", "effective", "enhanced", "enhanced"]);
  for (const bad of [-1, 51, NaN, 25.5]) assert.throws(() => emotionalHealthBand(bad));
  for (const total of [25, 26, 38, 39]) {
    const value = answers(1); let remainder = total - 10;
    for (let i = 1; i <= 10; i++) { const extra = Math.min(4, remainder); value[`q${i}`] += extra; remainder -= extra; }
    const result = emotionalHealthResults(value)!;
    assert.equal(result.scores[0].score, total);
    assert.equal(result.scores[0].band.key, emotionalHealthBand(total).key);
    assert.deepEqual(result.scores.slice(1).map(s => s.score), [10,10,10]);
  }
});
test("server projections recompute client totals and retain draft order", () => {
  const order = shuffleEmotionalHealthQuestions(() => 0.2);
  const draft = projectEmotionalHealthSave({}, { answers: answers(), order, scores: { self_awareness: 500 } }, false, first);
  assert.equal(draft.finished, null); assert.deepEqual(draft.order, order);
  const saved = projectEmotionalHealthSave(draft, draft, true, first);
  assert.deepEqual(saved.finished?.scores, { self_awareness:30, self_management:30, social_awareness:30, relationship_management:30 });
  assert.deepEqual(saved.finished?.order, order);
  assert.deepEqual(projectEmotionalHealthSave(saved, { answers: answers(1) }, false, second), saved);
});
test("retakes preserve old results, archive once, and reject stale replacement", () => {
  const saved = projectEmotionalHealthSave({}, { answers: answers(5) }, true, first);
  const draft = projectEmotionalHealthSave(saved, { answers: { q1: 1 } }, false, second, first);
  assert.equal(draft.finished?.completedAt, first); assert.equal(draft.retakeOf, first);
  const retaken = projectEmotionalHealthSave(draft, { answers: answers(1) }, true, second, first);
  assert.equal(retaken.history.length, 1); assert.equal(retaken.history[0].scores.self_awareness, 50);
  assert.equal(retaken.finished?.scores.self_awareness, 10);
  assert.throws(() => projectEmotionalHealthSave(retaken, { answers: answers(3) }, true, second, first), /newer result/);
  assert.deepEqual(projectEmotionalHealthSave(retaken, { answers: answers(1) }, true, second, first), retaken);
});
test("My Journey and response exports expose completed scores and all forty answers", () => {
  const saved = projectEmotionalHealthSave({}, { answers: answers(4) }, true, first);
  assert.equal(completedGenericResult("emotional_health_assessment", saved, first)?.kind, "emotional-health");
  assert.equal(completedGenericResult("emotional_health_assessment", saved, second), null);
  assert.equal(completedGenericResult("emotional_health_assessment", { answers: answers() }, first), null);
  assert.equal(activityResponseItems("emotional_health_assessment", saved, {}, true).length, 40);
  assert.equal(activityResultItems("emotional_health_assessment", saved, "draft", null).length, 0);
  const results = activityResultItems("emotional_health_assessment", saved, "submitted", first);
  assert.equal(results.length, 4);
  assert.ok(results.every(item => item.response.includes("40 / 50 · Enhanced skills area")));
  assert.equal(getParticipantBlockDefinition("custom_component", "emotional-health-assessment.v1")?.participantRendererKey, "emotional-health-assessment.v1");
  assert.equal(getParticipantBlockDefinition("system_component", "emotional-health-assessment.v1"), null);
});
