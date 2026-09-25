import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LAUNCHING_HUB_QUESTIONS, LAUNCHING_HUB_SCALE, LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY, LAUNCHING_WAYFINDERS_HUB_RESPONSE_KEY, READINESS_RESULTS, firstIncompleteLaunchingHubQuestion, launchingHubComplete, launchingHubResult, launchingHubStatus, normalizeLaunchingHubAnswers, readinessForScore, type LaunchingHubAnswer } from "./launching-wayfinders-hub-assessment.ts";

const all = (answer: LaunchingHubAnswer) => Object.fromEntries(LAUNCHING_HUB_QUESTIONS.map((question) => [question.key, answer]));

test("uses stable identifiers and exact source-controlled content", () => {
  assert.equal(LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY, "launching-wayfinders-hub-assessment.v1");
  assert.equal(LAUNCHING_WAYFINDERS_HUB_RESPONSE_KEY, "launching_wayfinders_hub_assessment");
  assert.equal(LAUNCHING_HUB_QUESTIONS.length, 10);
  assert.deepEqual(LAUNCHING_HUB_SCALE.map((item) => item.value), [1, 2, 3, 4, 5]);
  assert.equal(LAUNCHING_HUB_QUESTIONS[0].prompt, "I can help others discover their purpose and clarify how they’re uniquely designed to make an impact.");
  assert.equal(LAUNCHING_HUB_QUESTIONS[9].prompt, "I’m ready to integrate Wayfinders’ tools and values into my context in a way that others can adopt and multiply.");
});

test("normalizes ratings, resumes, and uses draft/submitted lifecycle", () => {
  const answers = normalizeLaunchingHubAnswers({ answers: { q1: 1, q2: 5, q3: 6, q4: "2" } });
  assert.deepEqual(answers, { q1: 1, q2: 5, q4: 2 });
  assert.equal(firstIncompleteLaunchingHubQuestion(answers), 2);
  assert.equal(launchingHubStatus(answers), "draft");
  assert.equal(launchingHubComplete(all(3)), true);
  assert.equal(launchingHubStatus(all(3)), "submitted");
});

test("derives the 10–50 score and recalculates edited answers", () => {
  assert.equal(launchingHubResult(all(1))?.score, 10);
  assert.equal(launchingHubResult(all(5))?.score, 50);
  assert.equal(launchingHubResult({ ...all(1), q1: 5 })?.score, 14);
});

test("maps every corrected readiness boundary including score 20", () => {
  assert.deepEqual([10, 20].map((score) => readinessForScore(score).label), ["Strong Heart, Needs Framework", "Strong Heart, Needs Framework"]);
  assert.deepEqual([21, 30].map((score) => readinessForScore(score).label), ["Forming Foundations", "Forming Foundations"]);
  assert.deepEqual([31, 40].map((score) => readinessForScore(score).label), ["Builder in Progress", "Builder in Progress"]);
  assert.deepEqual([41, 50].map((score) => readinessForScore(score).label), ["Reproducer Ready", "Reproducer Ready"]);
});

test("preserves exact readiness description and Focus language", () => {
  assert.match(READINESS_RESULTS.strongHeart.description, /^Strong Heart, Needs Framework – You care deeply/);
  assert.match(READINESS_RESULTS.strongHeart.focus, /You won’t just lead; you’ll be transformed\.$/);
  assert.match(READINESS_RESULTS.forming.focus, /tools that are simple and actionable\.$/);
  assert.match(READINESS_RESULTS.builder.description, /beginning to think about reproducibility\.$/);
  assert.match(READINESS_RESULTS.reproducer.focus, /raise up leaders who multiply others in your context\.$/);
});

test("autosave, results dialog, preview safety, and canonical persistence are wired", () => {
  const component = readFileSync(new URL("../../../components/experiences/builder/LaunchingWayfindersHubAssessment.tsx", import.meta.url), "utf8");
  const mutation = readFileSync(new URL("./launching-wayfinders-hub-assessment-mutations.ts", import.meta.url), "utf8");
  assert.match(component, /saveLaunchingWayfindersHubAssessmentAction/);
  assert.match(component, /setTimeout/);
  assert.match(component, /purpose-result-card/);
  assert.match(component, /createPortal/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /if \(!preview\)/);
  assert.match(component, /Preview only · responses are not saved/);
  assert.match(mutation, /enrollment_id: resolution\.enrollmentId/);
  assert.doesNotMatch(mutation, /cohort_id:/);
  assert.match(mutation, /status: complete \? "submitted" : "draft"/);
});

test("preview, participant runtime, and strict publish registry support only the known renderer", async () => {
  const registry = readFileSync(new URL("./block-registry.ts", import.meta.url), "utf8");
  const builder = readFileSync(new URL("../../../components/admin/BuilderBlocks.tsx", import.meta.url), "utf8");
  const participant = readFileSync(new URL("../../../components/experiences/builder/ParticipantBlockRenderer.tsx", import.meta.url), "utf8");
  assert.match(registry, /custom_component:launching-wayfinders-hub-assessment\.v1/);
  assert.match(registry, /participantRendererKey: "launching-wayfinders-hub-assessment\.v1"/);
  assert.match(builder, /LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY/);
  assert.match(participant, /LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY/);
  const { getPublishBlockDefinition } = await import("../admin/publish-validation-policy.ts");
  assert.ok(getPublishBlockDefinition("custom_component", LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY));
  assert.equal(getPublishBlockDefinition("custom_component", "unknown-assessment.v1"), null);
});
