import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activityResultItems, activityResponseItems, canReviewMemberResponses, isAssessmentActivity, readableResponseFields, weekTitle } from "./response-library-policy.ts";

test("assessments are expandable even when stored as structured responses", () => {
  for (const key of ["wayfinders_ethos_assessment", "activate_your_purpose_assessment", "launching_wayfinders_hub_assessment", "another_assessment"]) {
    assert.equal(isAssessmentActivity(key, "structured_response", null, "course"), true);
  }
  assert.equal(isAssessmentActivity("reflection", "structured_response", "wayfinders-ethos-assessment.v1", "course"), true);
  assert.equal(isAssessmentActivity("question", "structured_response", null, "assessment"), true);
  for (const type of ["structured_response", "reflection", "checklist"]) {
    assert.equal(isAssessmentActivity("reflection_question", type, null, "course"), false);
  }
});

test("cohort review requires verified facilitator capacity, scoped authority, or active global administration", () => {
  for (const memberRole of [null, "participant", "member", "hub_leader"]) assert.equal(canReviewMemberResponses({ globalRole: null, scopedFacilitator: false, memberRole }), false);
  assert.equal(canReviewMemberResponses({ globalRole: null, scopedFacilitator: false, memberRole: "facilitator" }), true);
  assert.equal(canReviewMemberResponses({ globalRole: null, scopedFacilitator: true, memberRole: null }), true);
  for (const globalRole of ["admin", "super_admin"]) assert.equal(canReviewMemberResponses({ globalRole, scopedFacilitator: false, memberRole: null }), true);
});
test("weeks retain existing names and repeated questions are not combined", () => {
  assert.equal(weekTitle("Week 2: Calling", 1), "Week 2: Calling");
  assert.equal(weekTitle("Calling", 1), "Week 2 · Calling");
  assert.equal(weekTitle("Ethos", 0, true), "Ethos");
  const first = activityResponseItems("prompt", { value: "Disciple" });
  const second = activityResponseItems("prompt", { value: "Impact" });
  assert.notDeepEqual(first, second);
});
test("choice responses use display labels, and negative/empty answers are represented correctly", () => {
  assert.deepEqual(activityResponseItems("choice", { value: "impact" }, { options: [{ key: "impact", label: "Everyday Impact" }] }), [{ question: "", response: "Everyday Impact" }]);
  assert.equal(activityResponseItems("boolean", { value: false })[0].response, "No");
  assert.deepEqual(activityResponseItems("text", { value: "" }), []);
  assert.equal(activityResponseItems("multi", { values: ["impact", "leader"] }, { options: [{ key: "impact", label: "Impact" }, { key: "leader", label: "Leader" }] })[0].response, "Impact · Leader");
});
test("native assessment responses show all real prompts and immutable completed answers", () => {
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, 4]));
  const items = activityResponseItems("wayfinders_ethos_assessment", { answers, finished: { answers } });
  assert.equal(items.length, 15);
  assert.ok(items[0].question.includes("I know who I am"));
  assert.equal(items[0].response, "4 / 5");
  assert.equal(activityResponseItems("launching_wayfinders_hub_assessment", { answers }).length, 10);
  assert.equal(activityResponseItems("activate_your_purpose_assessment", { answers: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, "C"])) }).length, 15);
});
test("personal impact shows one completed statement instead of later drafts", () => {
  const items = activityResponseItems("personal_impact_statement", { finished: { participantMaterial: { final_impact_statement: "Preserved result" } }, draft: { final_impact_statement: "Draft work" } });
  assert.deepEqual(items, [{ question: "Personal Impact Statement", response: "Preserved result" }]);
});
test("personal impact shows the latest statement and keeps supporting reflections", () => {
  const draft = { area_of_influence: "Neighbors", rough_1_to: "serve", rough_1_by: "listening", rough_1_so_that: "people belong", rough_2_i_will: "connect", rough_2_help: "neighbors", rough_2_provides: "community", distilled_statement: "Build belonging", final_impact_statement: "Help neighbors belong" };
  const items = activityResponseItems("personal_impact_statement", { draft });
  assert.deepEqual(items, [{ question: "What is your area of influence?", response: "Neighbors" }, { question: "Personal Impact Statement", response: "Help neighbors belong" }]);
  assert.equal(activityResponseItems("personal_impact_statement", { draft: { ...draft, final_impact_statement: "" } }).at(-1)?.response, "Build belonging");
  assert.deepEqual(activityResponseItems("personal_impact_statement", { draft: {} }), []);
});
test("nested assessment forms include filled fields without exposing envelope metadata", () => {
  const items = readableResponseFields({ schemaVersion: 1, idea: { idea_summary: "Serve neighbors" }, vision: { keywords: ["Hope", "Community"] } });
  assert.equal(items.length, 3);
  assert.ok(items[0].question.includes("Summarize your idea"));
  assert.deepEqual(readableResponseFields({ empty: "", nothing: null }), []);
});
test("server queries enforce ownership, cohort/course scope, password gates and historical retention", () => {
  const source = readFileSync(new URL("./response-library.ts", import.meta.url), "utf8");
  assert.match(source, /eq\("participant_id", participantId\)\.eq\("enrollment_id", enrollment.id!?\)\.eq\("experience_version_id", versionId\)/);
  assert.match(source, /eq\("cohort_id", cohortId\)\.eq\("participant_id", participantId\)\.eq\("status", "active"\)/);
  assert.match(source, /eq\("auth_user_id", user.id\)/);
  assert.match(source, /needsExperiencePassword\(cohort.data.experience_id\)/);
  assert.match(source, /context.passwordRequired\(childExperience.id\)/);
  assert.match(source, /pending = needsExperiencePassword\(experienceId\)/);
  assert.match(source, /removed_responses/);
  assert.doesNotMatch(source, /participant_personal_notes|companion_chat_messages/);
  const route = readFileSync(new URL("../../app/api/cohorts/[cohortId]/members/[participantId]/responses/route.ts", import.meta.url), "utf8");
  assert.match(route, /private, no-store/);
});

test("purpose results show highest and lowest areas, scores and participant growth stages", () => {
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, i < 5 ? "D" : i < 10 ? "B" : "A"]));
  const results = activityResultItems("activate_your_purpose_assessment", { answers }, "submitted", "2026-10-02T19:00:00Z");
  assert.equal(results.length, 5);
  assert.match(results[0].response, /20 \/ 20/);
  assert.match(results[1].response, /5 \/ 20/);
  assert.match(results[2].response, /Multiplier/);
  assert.match(results[3].response, /Participant/);
  assert.match(results[4].response, /Onlooker/);
});
test("purpose results preserve ties rather than choosing an arbitrary highest or lowest area", () => {
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, i < 10 ? "D" : "A"]));
  assert.equal(activityResultItems("activate_your_purpose_assessment", { answers }, "submitted", "date")[0].response.split("; ").length, 2);
  const equal = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, "C"]));
  assert.deepEqual(activityResultItems("activate_your_purpose_assessment", { answers: equal }, "submitted", "date")[0], { question: "Area comparison", response: "All areas are tied." });
});
test("results require completed submissions and prefer the finalized snapshot over draft work", () => {
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, "D"]));
  const key = "activate_your_purpose_assessment";
  assert.deepEqual(activityResultItems(key, { answers }, "draft", "date"), []);
  assert.deepEqual(activityResultItems(key, { answers }, "submitted", null), []);
  assert.deepEqual(activityResultItems(key, { answers: { q1: "D" } }, "submitted", "date"), []);
  assert.deepEqual(activityResultItems(key, { finished: { completedAt: "other", answers } }, "submitted", "date"), []);
  const results = activityResultItems(key, { answers: { q1: "A" }, finished: { completedAt: "date", answers } }, "finalized", "date");
  assert.equal(results.length, 4);
  assert.match(results[1].response, /20 \/ 20/);
});
test("ethos and hub summaries use participant scoring and include development guidance", () => {
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, i < 3 ? 5 : 1]));
  const ethos = activityResultItems("wayfinders_ethos_assessment", { answers }, "submitted", "date");
  assert.match(ethos[0].response, /15 \/ 15/);
  assert.match(ethos[1].response, /3 \/ 15/);
  const hub = activityResultItems("launching_wayfinders_hub_assessment", { answers: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, 5])) }, "submitted", "date");
  assert.match(hub[0].response, /50 \/ 50/);
  assert.equal(hub[1].question, "Focus");
  assert.ok(hub[1].response.length > 0);
});

test("facilitator assessment questions include every unanswered prompt", () => {
  for (const [key, answer, count] of [["wayfinders_ethos_assessment", 4, 15], ["activate_your_purpose_assessment", "C", 15], ["launching_wayfinders_hub_assessment", 3, 10]] as const) {
    const empty = activityResponseItems(key, undefined, {}, true);
    assert.equal(empty.length, count);
    assert.ok(empty.every((item) => item.answered === false && item.response === "Not answered"));
    const partial = activityResponseItems(key, { answers: { q1: answer } }, {}, true);
    assert.equal(partial.length, count);
    assert.equal(partial.filter((item) => item.answered).length, 1);
    assert.equal(partial[1].response, "Not answered");
  }
});
test("facilitator course questions retain empty fields and count false as answered", () => {
  assert.deepEqual(activityResponseItems("reflection", undefined, {}, true), [{ question: "", response: "Not answered", answered: false }]);
  assert.equal(activityResponseItems("reflection", { value: "   " }, {}, true)[0].answered, false);
  assert.equal(activityResponseItems("choice", { values: [] }, {}, true)[0].answered, false);
  const negative = activityResponseItems("boolean", { value: false }, {}, true)[0];
  assert.equal(negative.answered, true);
  assert.equal(negative.response, "No");
  const statement = activityResponseItems("personal_impact_statement", { draft: { area_of_influence: "Neighbors" } }, {}, true);
  assert.ok(statement.some((item) => item.question === "Final Personal Impact Statement" && !item.answered));
  assert.ok(statement.some((item) => item.response === "Neighbors" && item.answered));
  const start = activityResponseItems("start_something", undefined, {}, true);
  assert.ok(start.some((item) => item.question === "Summarize your idea here." && !item.answered));
});
test("Ethos summary explicitly names highest and lowest and preserves tied growth areas", () => {
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, i < 3 ? 5 : 1]));
  const items = activityResultItems("wayfinders_ethos_assessment", { answers }, "submitted", "date");
  assert.equal(items[0].question, "Highest Ethos · Strongest areas");
  assert.equal(items[1].question, "Lowest Ethos · Growth areas");
  assert.equal(items[1].response.split("; ").length, 4);
});
