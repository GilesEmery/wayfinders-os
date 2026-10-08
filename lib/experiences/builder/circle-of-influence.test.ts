import test from "node:test";
import assert from "node:assert/strict";
import { CIRCLE_AREAS, normalizeCircleData, normalizeCircleEnvelope, projectCircleSave, circleCounts, circleSaveError } from "./circle-of-influence.ts";
import { completedGenericResult } from "../../assessment-results-policy.ts";

test("all worksheet areas and named Other are preserved with at most 15 names", () => {
  assert.deepEqual(CIRCLE_AREAS.map(area => area.title), ["Family", "Friends", "Work", "Church Body", "Hobbies / Activities", "Neighbors", "School", "Other"]);
  const data = normalizeCircleData({ people: { family: Array.from({ length: 20 }, (_, i) => `Person ${i}`), friends: [null, 1, "Friend"], other: ["Neighbor"] }, otherLabel: "Volunteering" });
  assert.equal(data.people.family.length, 15);
  assert.deepEqual(data.people.friends, ["", "", "Friend"]);
  assert.equal(circleCounts(data).at(-1)?.title, "Volunteering");
  assert.equal(circleSaveError(data), null);
});
test("empty applicable areas are optional but Other with names needs a label", () => {
  const empty = normalizeCircleData({});
  assert.ok(circleSaveError(empty));
  assert.equal(circleSaveError(normalizeCircleData({ people: { family: ["Maya"] } })), null);
  assert.match(circleSaveError(normalizeCircleData({ people: { other: ["Maya"] } }))!, /Name your Other/);
});
test("finishing preserves an immutable result while later drafts remain resumable", () => {
  const first = normalizeCircleData({ people: { family: ["Maya"] } });
  const saved = projectCircleSave({}, first, true, "2026-10-08T12:00:00Z");
  const later = projectCircleSave(saved, { people: { family: ["Theo"] } }, false, "2026-10-08T13:00:00Z");
  assert.deepEqual(later.finished?.participantMaterial.people.family, ["Maya"]);
  assert.deepEqual(later.draft.people.family, ["Theo"]);
  assert.equal(completedGenericResult("circle_of_influence", saved, saved.finished!.completedAt)?.kind, "circle-of-influence");
  assert.equal(completedGenericResult("circle_of_influence", saved, "2026-10-09T00:00:00Z"), null);
  assert.equal(normalizeCircleEnvelope({ finished: { completedAt: "invalid", sourceVersion: "circle-of-influence.v1" } }).finished, null);
  assert.throws(() => projectCircleSave({}, {}, true, "now"), /Add at least one/);
});
