import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ACTIVATE_PURPOSE_AREAS,
  ACTIVATE_PURPOSE_QUESTIONS,
  ACTIVATE_PURPOSE_RENDERER_KEY,
  ACTIVATE_PURPOSE_RESPONSE_KEY,
  ACTIVATE_PURPOSE_SCORE,
  activatePurposeComplete,
  activatePurposeResults,
  activatePurposeStatus,
  firstIncompleteActivatePurposeQuestion,
  growthStage,
  normalizeActivatePurposeAnswers,
  type ActivatePurposeAnswer,
} from "./activate-purpose-assessment.ts";
import { canBypassCourseRequirements } from "./course-requirement-policy.ts";

const all = (answer: ActivatePurposeAnswer) => Object.fromEntries(ACTIVATE_PURPOSE_QUESTIONS.map((question) => [question.key, answer]));

test("uses the stable renderer and response identifiers", () => {
  assert.equal(ACTIVATE_PURPOSE_RENDERER_KEY, "activate-your-purpose-assessment.v1");
  assert.equal(ACTIVATE_PURPOSE_RESPONSE_KEY, "activate_your_purpose_assessment");
});

test("defines exactly fifteen questions with four scored choices", () => {
  assert.equal(ACTIVATE_PURPOSE_QUESTIONS.length, 15);
  assert.ok(ACTIVATE_PURPOSE_QUESTIONS.every((question) => Object.keys(question.options).join("") === "ABCD"));
  assert.deepEqual(ACTIVATE_PURPOSE_SCORE, { A: 1, B: 2, C: 3, D: 4 });
});

test("assigns five questions to each area in the required order", () => {
  assert.deepEqual(ACTIVATE_PURPOSE_AREAS.map((area) => area.title), ["Everyday Disciple", "Everyday Leader", "Everyday Impact"]);
  assert.deepEqual(ACTIVATE_PURPOSE_AREAS.map((area) => area.description), [
    "Discovering who I am and growing in my relationship with God and others.",
    "Developing my influence and guiding others toward growth and purpose.",
    "Living out my purpose through service, generosity, and multiplying good.",
  ]);
  assert.deepEqual(ACTIVATE_PURPOSE_AREAS.map((area) => area.questions.map((question) => question.key)), [
    ["q1", "q2", "q3", "q4", "q5"],
    ["q6", "q7", "q8", "q9", "q10"],
    ["q11", "q12", "q13", "q14", "q15"],
  ]);
});

test("does not substitute editorial area labels for the source-controlled language", () => {
  const assessment = readFileSync(new URL("./activate-purpose-assessment.ts", import.meta.url), "utf8");
  assert.doesNotMatch(assessment, /title: "(?:Awareness|Alignment|Activation)"/);
});

test("derives each area minimum and maximum without storing score truth", () => {
  assert.deepEqual(activatePurposeResults(all("A"))?.map((result) => result.score), [5, 5, 5]);
  assert.deepEqual(activatePurposeResults(all("D"))?.map((result) => result.score), [20, 20, 20]);
});

test("maps every score boundary to the correct growth stage", () => {
  assert.deepEqual([5, 8].map((score) => growthStage(score).title), ["Onlooker", "Onlooker"]);
  assert.deepEqual([9, 13].map((score) => growthStage(score).title), ["Participant", "Participant"]);
  assert.deepEqual([14, 17].map((score) => growthStage(score).title), ["Leader", "Leader"]);
  assert.deepEqual([18, 20].map((score) => growthStage(score).title), ["Multiplier", "Multiplier"]);
});

test("normalizes valid answers and resumes at the first incomplete question", () => {
  const normalized = normalizeActivatePurposeAnswers({ answers: { q1: "A", q2: "D", q3: "E", q4: 2 } });
  assert.deepEqual(normalized, { q1: "A", q2: "D" });
  assert.equal(firstIncompleteActivatePurposeQuestion(normalized), 2);
});

test("moves from draft to submitted only after all fifteen answers", () => {
  const incomplete = { ...all("B") };
  delete incomplete.q15;
  assert.equal(activatePurposeComplete(incomplete), false);
  assert.equal(activatePurposeStatus(incomplete), "draft");
  assert.equal(activatePurposeComplete(all("B")), true);
  assert.equal(activatePurposeStatus(all("B")), "submitted");
});

test("changing a prior answer recalculates its score and stage", () => {
  const initial = all("B");
  const changed = { ...initial, q1: "D", q2: "D", q3: "D", q4: "D", q5: "D" } as const;
  assert.equal(activatePurposeResults(initial)?.[0].score, 10);
  assert.equal(activatePurposeResults(initial)?.[0].stage.title, "Participant");
  assert.equal(activatePurposeResults(changed)?.[0].score, 20);
  assert.equal(activatePurposeResults(changed)?.[0].stage.title, "Multiplier");
});

test("registers the custom renderer as participant-runtime-ready", () => {
  const registry = readFileSync(new URL("./block-registry.ts", import.meta.url), "utf8");
  assert.match(registry, /blockType: "custom_component"/);
  assert.match(registry, /participantRendererKey: "activate-your-purpose-assessment\.v1"/);
  assert.match(registry, /participantRuntime: "available"/);
  assert.match(registry, /responseType: "structured_response"/);
});

test("central admin and leader bypass remains the only requirement override", () => {
  assert.equal(canBypassCourseRequirements({ globalRole: "admin", cohortId: null, cohortMembershipRole: null, assignments: [] }), true);
  assert.equal(canBypassCourseRequirements({ globalRole: null, cohortId: "cohort-a", cohortMembershipRole: "facilitator", assignments: [] }), true);
  assert.equal(canBypassCourseRequirements({ globalRole: null, cohortId: "cohort-a", cohortMembershipRole: "participant", assignments: [] }), false);
});

test("participant UI contains autosave, result cards, analysis dialog, and mobile choice contracts", () => {
  const component = readFileSync(new URL("../../../components/experiences/builder/ActivatePurposeAssessment.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.match(component, /saveActivatePurposeAssessmentAction/);
  assert.match(component, /setTimeout/);
  assert.match(component, /purpose-result-card/);
  assert.match(component, /createPortal/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /Your responses/);
  assert.match(component, /question\.options\[answer\]/);
  assert.match(component, /<AreaDialog answers=\{answers\}/);
  assert.match(component, /aria-live="polite"/);
  assert.equal(css.includes("@media(max-width:600px)"), true);
  assert.equal(css.includes(".purpose-options label"), true);
});

test("admin preview starts empty and never invokes persistence", () => {
  const component = readFileSync(new URL("../../../components/experiences/builder/ActivatePurposeAssessment.tsx", import.meta.url), "utf8");
  assert.match(component, /if \(!preview\)/);
  assert.match(component, /Preview only · responses are not saved/);
});

test("persistence uses canonical enrollment ownership and deterministic answer data", () => {
  const mutation = readFileSync(new URL("./activate-purpose-assessment-mutations.ts", import.meta.url), "utf8");
  assert.match(mutation, /enrollment_id: resolution\.enrollmentId/);
  assert.match(mutation, /response_data: \{ answers \}/);
  assert.doesNotMatch(mutation, /cohort_id:/);
  assert.match(mutation, /status: complete \? "submitted" : "draft"/);
});

test("existing requirement and publish safeguards recognize the registered response", () => {
  const progress = readFileSync(new URL("./progress-mutations.ts", import.meta.url), "utf8");
  const publish = readFileSync(new URL("../admin/publish-validation.ts", import.meta.url), "utf8");
  assert.match(progress, /getBlockDefinition\(block\.block_type\)\?\.response/);
  assert.match(progress, /\.in\("status", \["submitted", "finalized"\]\)/);
  assert.match(publish, /getPublishBlockDefinition\(block\.block_type, block\.custom_renderer_key\)/);
});

test("Builder and Preview load and render the assessment through the normal column path", () => {
  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../admin/layout-data.ts", import.meta.url), "utf8");
  const builder = readFileSync(new URL("../../../components/admin/BuilderBlocks.tsx", import.meta.url), "utf8");
  const participant = readFileSync(new URL("../../../components/experiences/builder/ParticipantBlockRenderer.tsx", import.meta.url), "utf8");
  assert.match(data, /blocks\.filter\(\(block\) => block\.column_id === column\.id\)/);
  assert.match(workspace, /from\("content_blocks"\)\.select\("\*"\)\.eq\("section_id", sectionId\)/);
  assert.match(builder, /block\.block_type === "custom_component" && block\.custom_renderer_key === ACTIVATE_PURPOSE_RENDERER_KEY/);
  assert.match(participant, /block\.block_type === "custom_component" && block\.custom_renderer_key === ACTIVATE_PURPOSE_RENDERER_KEY/);
});
