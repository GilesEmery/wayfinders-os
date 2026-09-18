import assert from "node:assert/strict";
import test from "node:test";
import { cohortVersionMatchesCanonicalEnrollment, participantCourseHref, selectExplicitCohortOffering } from "./cohort-context.ts";

const versionId = "version-a";
const tuesday = { id: "offering-tuesday", cohort_id: "tuesday", experience_version_id: versionId };
const thursday = { id: "offering-thursday", cohort_id: "thursday", experience_version_id: versionId };

test("one canonical enrollment can address two Cohort contexts deterministically", () => {
  assert.deepEqual(selectExplicitCohortOffering([tuesday, thursday], "tuesday"), { ok: true, offering: tuesday });
  assert.deepEqual(selectExplicitCohortOffering([tuesday, thursday], "thursday"), { ok: true, offering: thursday });
  assert.equal(participantCourseHref("kaleo", "tuesday"), "/experiences/kaleo?cohort=tuesday");
  assert.equal(participantCourseHref("kaleo", "thursday"), "/experiences/kaleo?cohort=thursday");
});

test("invalid or ambiguous Cohort contexts never fall back", () => {
  assert.deepEqual(selectExplicitCohortOffering([tuesday], "unknown"), { ok: false, reason: "invalid" });
  assert.deepEqual(selectExplicitCohortOffering([tuesday, { ...tuesday, id: "duplicate" }], "tuesday"), { ok: false, reason: "ambiguous_delivery" });
});

test("a Cohort pinned to another Version cannot drive the canonical journey", () => {
  assert.equal(cohortVersionMatchesCanonicalEnrollment(versionId, tuesday), true);
  assert.equal(cohortVersionMatchesCanonicalEnrollment(versionId, { ...tuesday, experience_version_id: "version-b" }), false);
  assert.equal(cohortVersionMatchesCanonicalEnrollment(null, tuesday), false);
});

test("a follow-current Cohort offering remains compatible after Course publication", () => {
  assert.equal(cohortVersionMatchesCanonicalEnrollment(versionId, { ...tuesday, experience_version_id: null }), true);
});

test("the personal Course route remains independent from Cohort context", () => {
  assert.equal(participantCourseHref("kaleo"), "/experiences/kaleo");
});
