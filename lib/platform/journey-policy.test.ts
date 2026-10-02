import assert from "node:assert/strict";
import test from "node:test";
import { activeJourneyEnrollments, completedJourneyRecords, activeCanonicalJourneyEnrollment, visibleCanonicalJourneyCompletion } from "./journey-policy.ts";
const base = { experience_version_id: "v1", completed_at: null };
test("all actual active assessment and course enrollments appear; catalog and expired items do not", () => {
  const enrolled = ["personal-impact-statement", "start-something", "life-mapping-u", "regular-course"].map((id) => ({ ...base, id, experience_id: id, status: "enrolled" }));
  assert.equal(activeJourneyEnrollments(enrolled).length, 4);
  assert.equal(activeJourneyEnrollments([...enrolled, { ...base, id: "old", experience_id: "old", status: "expired" }]).length, 4);
  assert.equal(activeJourneyEnrollments(enrolled.map((item) => ({ ...item, status: "in_progress" }))).length, 4);
});
test("canonical completion leaves active list and appears once despite alternate timestamp formatting", () => {
  const row = { ...base, id: "enrollment", experience_id: "assessment", status: "completed", completed_at: "2026-10-02T12:00:00+00:00" };
  const history = { id: "history", enrollment_id: row.id, experience_id: row.experience_id, experience_version_id: "v1", artifact_snapshot: { completion: { completed_at: "2026-10-02T12:00:00.000Z" } } };
  assert.equal(activeJourneyEnrollments([row]).length, 0);
  assert.equal(completedJourneyRecords([row], [history]).length, 1);
});
test("retakes preserve earlier version completion without completing an active parent", () => {
  const rows = [{ ...base, id: "retake", experience_id: "assessment", status: "in_progress", experience_version_id: "v2" }, { ...base, id: "parent", experience_id: "course", status: "enrolled" }];
  const history = [{ id: "first", enrollment_id: "retake", experience_id: "assessment", experience_version_id: "v1", artifact_snapshot: { completion: { completed_at: "2026-09-01T12:00:00Z" } } }];
  assert.equal(activeJourneyEnrollments(rows).length, 2);
  assert.deepEqual(completedJourneyRecords(rows, history).map((item) => item.experienceId), ["assessment"]);
});
test("incomplete or malformed history is not a completion; same-version historical attempts are retained", () => {
  const make = (id: string, date: string | null) => ({ id, enrollment_id: "e", experience_id: "x", experience_version_id: "v", artifact_snapshot: date ? { completion: { completed_at: date } } : {} });
  assert.equal(completedJourneyRecords([], [make("initial", null), make("bad", "invalid"), make("first", "2026-09-01"), make("second", "2026-10-01")]).length, 2);
});

test("LMU provider and enrollment use the same active and completed projections", () => {
  assert.equal(activeCanonicalJourneyEnrollment({ status: "in_progress" }, "life-mapping-u", true), false);
  assert.equal(activeCanonicalJourneyEnrollment({ status: "in_progress" }, "life-mapping-u", false), true);
  assert.equal(activeCanonicalJourneyEnrollment({ status: "enrolled" }, "personal-impact-statement", true), true);
  assert.equal(visibleCanonicalJourneyCompletion("life-mapping-u", true), false);
  assert.equal(visibleCanonicalJourneyCompletion("life-mapping-u", false), true);
});
