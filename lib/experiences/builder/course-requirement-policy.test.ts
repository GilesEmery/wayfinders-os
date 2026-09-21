import assert from "node:assert/strict";
import test from "node:test";
import { canBypassCourseRequirements } from "./course-requirement-policy.ts";

const base = { globalRole: null, cohortId: "cohort-a", cohortMembershipRole: null, assignments: [] } as const;

test("global admins bypass requirements in personal and cohort live courses", () => {
  assert.equal(canBypassCourseRequirements({ ...base, globalRole: "admin", cohortId: null }), true);
  assert.equal(canBypassCourseRequirements({ ...base, globalRole: "super_admin" }), true);
});

test("every active cohort facilitator can bypass requirements in their cohort", () => {
  assert.equal(canBypassCourseRequirements({ ...base, cohortMembershipRole: "facilitator" }), true);
  assert.equal(canBypassCourseRequirements({ ...base, assignments: [{ role: "facilitator", scope_type: "cohort", scope_id: "cohort-a" }] }), true);
});

test("participants and facilitators from other cohorts cannot bypass requirements", () => {
  assert.equal(canBypassCourseRequirements({ ...base, cohortMembershipRole: "participant" }), false);
  assert.equal(canBypassCourseRequirements({ ...base, assignments: [{ role: "facilitator", scope_type: "cohort", scope_id: "cohort-b" }] }), false);
  assert.equal(canBypassCourseRequirements({ ...base, cohortId: null, cohortMembershipRole: "facilitator" }), false);
});
