import assert from "node:assert/strict";
import test from "node:test";
import { APEST_QUESTIONS, APEST_SCALE, apestResults, normalizeApestAnswers, normalizeApestOrder, projectApestSave, shuffleApestQuestions } from "./apest.ts";
import { completedGenericResult } from "../../assessment-results-policy.ts";
import { activityResponseItems, activityResultItems } from "../../platform/response-library-policy.ts";
const answers = (value = 2) => Object.fromEntries(APEST_QUESTIONS.map(q => [q.key, value]));
const first = "2026-10-27T14:00:00.000Z", second = "2026-10-27T15:00:00.000Z";

test("paper mapping remains five fixed groups regardless of presentation", () => {
  assert.equal(APEST_QUESTIONS.length, 25);
  assert.equal(new Set(APEST_QUESTIONS.map(q => q.key)).size, 25);
  for (let index = 0; index < 25; index++) assert.equal(APEST_QUESTIONS[index].domain, "APEST"[Math.floor(index / 5)]);
  for (let run = 0; run < 20; run++) {
    const order = shuffleApestQuestions();
    assert.equal(order.length, 25); assert.equal(new Set(order).size, 25);
    const reordered = Object.fromEntries(order.map(key => [key, Number(key.slice(1)) <= 5 ? 3 : 1]));
    assert.deepEqual(apestResults(reordered)?.scores.map(s => s.score), [15, 5, 5, 5, 5]);
  }
  assert.deepEqual(normalizeApestOrder(["q1", "q1"]), APEST_QUESTIONS.map(q => q.key));
});
test("all five stops, half points, missing responses and ties", () => {
  assert.deepEqual(APEST_SCALE.map(s => s.value), [1, 1.5, 2, 2.5, 3]);
  for (const { value } of APEST_SCALE) assert.deepEqual(apestResults(answers(value))?.scores.map(s => s.score), Array(5).fill(value * 5));
  assert.equal(apestResults(answers())?.strongest.length, 5);
  const partial = answers(); delete partial.q25;
  assert.equal(apestResults(partial), null);
  assert.equal(apestResults(normalizeApestAnswers({ ...answers(), q2: "2", q3: 4, q4: 1.25 })), null);
  assert.throws(() => projectApestSave({}, { answers: partial }, true, first), /all 25/);
});
test("server computes all category scores and preserves order through drafts and finalization", () => {
  const order = shuffleApestQuestions(() => 0.2);
  const draft = projectApestSave({}, { answers: answers(2.5), order, scores: { A: 100 } }, false, first);
  assert.equal(draft.finished, null); assert.deepEqual(draft.order, order);
  const saved = projectApestSave(draft, draft, true, first);
  assert.deepEqual(saved.finished?.scores, { A: 12.5, P: 12.5, E: 12.5, S: 12.5, T: 12.5 });
  assert.deepEqual(saved.finished?.order, order);
  assert.deepEqual(projectApestSave(saved, { answers: answers(1) }, false, second), saved);
});
test("retake drafts preserve previous results and explicit finish archives them", () => {
  const saved = projectApestSave({}, { answers: answers(3) }, true, first);
  const draft = projectApestSave(saved, { answers: { q1: 1 } }, false, second, first);
  assert.equal(draft.finished?.completedAt, first); assert.equal(draft.retakeOf, first);
  const retaken = projectApestSave(draft, { answers: answers(1.5) }, true, second, first);
  assert.equal(retaken.history.length, 1); assert.equal(retaken.history[0].scores.A, 15);
  assert.equal(retaken.finished?.scores.A, 7.5);
  assert.throws(() => projectApestSave(retaken, { answers: answers(3) }, true, second, first), /newer result/);
});
test("My Journey only exposes finalized complete answers; shared results and exports include all domains", () => {
  const saved = projectApestSave({}, { answers: answers(2.5) }, true, first);
  assert.equal(completedGenericResult("apest_assessment", saved, first)?.kind, "apest");
  assert.equal(completedGenericResult("apest_assessment", saved, second), null);
  assert.equal(completedGenericResult("apest_assessment", { answers: answers() }, first), null);
  assert.equal(activityResponseItems("apest_assessment", saved, {}, true).length, 25);
  assert.equal(activityResultItems("apest_assessment", saved, "draft", null).length, 0);
  const results = activityResultItems("apest_assessment", saved, "submitted", first);
  assert.equal(results.length, 5);
  assert.ok(results.every(item => item.question.startsWith("Primary · tied")));
  assert.ok(results.every(item => !item.response.includes("/ 15")));
});

test("results rank by score, keeping equal scores at the same rank", () => {
  const values = { A: 2, P: 1, E: 3, S: 2.5, T: 1.5 };
  const result = apestResults(Object.fromEntries(APEST_QUESTIONS.map(q => [q.key, values[q.domain]])));
  assert.deepEqual(result?.ranked.map(item => item.domain.key), ["E", "S", "A", "T", "P"]);
  assert.deepEqual(result?.ranked.map(item => item.label), ["Primary", "Secondary", "Rank 3", "Rank 4", "Rank 5"]);
  assert.ok(apestResults(answers())?.ranked.every(item => item.rank === 1 && item.label === "Primary · tied"));
});
