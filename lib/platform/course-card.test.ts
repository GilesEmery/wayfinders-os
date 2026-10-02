import assert from "node:assert/strict";
import test from "node:test";
import { participantCardEyebrow } from "./course-card-policy.ts";

test("presents generic assessment labels as Guided Experience", () => {
  assert.equal(participantCardEyebrow(null, "assessment"), "Guided Experience");
  assert.equal(participantCardEyebrow("Assessment", "assessment"), "Guided Experience");
  assert.equal(participantCardEyebrow("PurposeOS Assessment", "assessment"), "Guided Experience");
});

test("preserves specific assessment labels and non-assessment taxonomy", () => {
  assert.equal(participantCardEyebrow("Career Discernment", "assessment"), "Career Discernment");
  assert.equal(participantCardEyebrow(null, "course"), "Course");
});
