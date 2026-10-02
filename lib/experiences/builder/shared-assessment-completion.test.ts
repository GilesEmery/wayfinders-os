import test from "node:test";
import assert from "node:assert/strict";
import { sharedAssessmentCompleted } from "./shared-assessment-completion.ts";
import { projectAssessmentResponse } from "./activate-purpose-completion.ts";

test("retreat completion satisfies multiple course blocks without another attempt", () => {
  const completed = [{ experience_id: "ethos", status: "completed", completed_at: "2026-10-02" }];
  for (const block of ["cohort-one", "cohort-two"]) assert.equal(sharedAssessmentCompleted("ethos", block, [], completed), true);
});
test("draft, absent, incomplete timestamp and unrelated completions do not satisfy requirements", () => {
  for (const rows of [[], [{ experience_id: "ethos", status: "in_progress", completed_at: null }], [{ experience_id: "ethos", status: "completed", completed_at: null }], [{ experience_id: "other", status: "completed", completed_at: "2026-10-02" }]]) assert.equal(sharedAssessmentCompleted("ethos", "block", [], rows), false);
});
test("historical completed attempts survive a new retake, but cannot satisfy a different assessment", () => {
  const attempts = [{ parent_content_block_id: "block", assessment_experience_id: "ethos", status: "completed" }];
  assert.equal(sharedAssessmentCompleted("ethos", "block", attempts, []), true);
  assert.equal(sharedAssessmentCompleted("launching", "block", attempts, []), false);
});
test("numeric assessment saves require explicit finish and preserve the finished answers", () => {
  const answers = { q1: 5, q2: 3 };
  assert.equal(projectAssessmentResponse({}, answers, false, "now").finished, null);
  const finished = projectAssessmentResponse({}, answers, true, "first");
  assert.deepEqual(projectAssessmentResponse(finished, { q1: 1 }, false, "late"), finished);
  assert.deepEqual(projectAssessmentResponse(finished, { q1: 1 }, true, "later"), finished);
});
