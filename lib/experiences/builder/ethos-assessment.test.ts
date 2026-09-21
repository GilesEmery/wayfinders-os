import assert from "node:assert/strict";
import test from "node:test";
import { ETHOS_CATEGORIES, ETHOS_QUESTION_KEYS, ethosComplete, ethosResults, normalizeEthosAnswers } from "./ethos-assessment.ts";

const answers = (scores: readonly number[]) => Object.fromEntries(scores.flatMap((score, category) => [1, 2, 3].map((offset) => [`q${category * 3 + offset}`, score])));

test("defines five Ethos steps with three questions and fifteen stable keys", () => {
  assert.equal(ETHOS_CATEGORIES.length, 5);
  assert.ok(ETHOS_CATEGORIES.every((category) => category.questions.length === 3));
  assert.equal(ETHOS_QUESTION_KEYS.length, 15);
  assert.equal(new Set(ETHOS_QUESTION_KEYS).size, 15);
});

test("accepts only integer scores from one through five", () => {
  assert.deepEqual(normalizeEthosAnswers({ answers: { q1: 1, q2: 5, q3: 0, q4: 6, q5: 2.5, q6: "3" } }), { q1: 1, q2: 5 });
});

test("requires all fifteen answers and calculates category bounds", () => {
  assert.equal(ethosComplete(answers([1, 1, 1, 1, 1])), true);
  assert.equal(ethosComplete({ ...answers([1, 1, 1, 1, 1]), q15: 0 }), false);
  assert.deepEqual(ethosResults(answers([1, 5, 3, 4, 2]))?.scores.map((item) => item.score), [3, 15, 9, 12, 6]);
});

test("preserves strongest and growth ties without arbitrarily breaking them", () => {
  const result = ethosResults(answers([5, 5, 2, 1, 1]));
  assert.deepEqual(result?.strongest.map((item) => item.category.key), ["purpose-driven-identity", "abundance-over-scarcity"]);
  assert.deepEqual(result?.growth.map((item) => item.category.key), ["pathways-not-programs", "multiplication-through-empowerment"]);
});

test("detects the all-five-equal balanced state", () => {
  const result = ethosResults(answers([3, 3, 3, 3, 3]));
  assert.equal(result?.allEqual, true);
  assert.equal(result?.scores.every((item) => item.score === 9), true);
});
