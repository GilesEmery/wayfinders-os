import assert from "node:assert/strict";
import test from "node:test";
import { isAssessmentRetake } from "./assessment-retake.ts";

test("retakes preserve saved results until an explicit submission", () => {
  const prior = { finished: { completedAt: "first", answers: { q1: 5 } } };
  assert.equal(isAssessmentRetake(prior, "first", false), false);
  assert.equal(isAssessmentRetake(prior, undefined, true), false);
  assert.equal(isAssessmentRetake(prior, "first", true), true);
});

test("duplicate or stale retakes cannot replace a newer completed result", () => {
  assert.equal(isAssessmentRetake({ finished: { completedAt: "second" } }, "first", true), false);
  assert.equal(isAssessmentRetake(null, "first", true), false);
  assert.equal(isAssessmentRetake({}, "first", true), false);
});

import { projectAssessmentResponse } from "./activate-purpose-completion.ts";
import { emptyStartSomethingData, projectStartSomethingSave } from "./start-something.ts";
import { PERSONAL_IMPACT_FIELDS, normalizePersonalImpactData, projectPersonalImpactSave } from "./personal-impact-statement.ts";

test("explicit retakes replace results while repeated submissions preserve the new snapshot", () => {
  const oldEthos = projectAssessmentResponse({}, { q1: 1 }, true, "first");
  const newEthos = projectAssessmentResponse(isAssessmentRetake(oldEthos, "first", true) ? {} : oldEthos, { q1: 5 }, true, "second");
  assert.equal(newEthos.finished?.answers.q1, 5);
  assert.deepEqual(projectAssessmentResponse(isAssessmentRetake(newEthos, "first", true) ? {} : newEthos, { q1: 2 }, true, "third"), newEthos);
  const oldStart = projectStartSomethingSave({}, emptyStartSomethingData(), true, "first");
  const nextStart = emptyStartSomethingData();
  nextStart.idea.idea_summary = "New idea";
  const newStart = projectStartSomethingSave(isAssessmentRetake(oldStart, "first", true) ? {} : oldStart, nextStart, true, "second");
  assert.equal(newStart.finished?.participantMaterial.idea.idea_summary, "New idea");
  const completePis = normalizePersonalImpactData({ ...Object.fromEntries(PERSONAL_IMPACT_FIELDS.map(key => [key, "Reflection"])), causes: ["Education"] });
  const oldPis = projectPersonalImpactSave({}, completePis, "first", null, true);
  const nextPis = { ...completePis, final_impact_statement: "New statement" };
  const newPis = projectPersonalImpactSave(isAssessmentRetake(oldPis, "first", true) ? {} : oldPis, nextPis, "second", null, true);
  assert.equal(newPis.finished?.participantMaterial.final_impact_statement, "New statement");
});
