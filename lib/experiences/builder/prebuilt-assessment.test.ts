import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { embeddedAssessmentLaunchPath, embeddedAssessmentReturnPath, parsePrebuiltAssessmentConfiguration, validatedEmbeddedReturnPath } from "./prebuilt-assessment.ts";

const id = "24fd0477-2a16-4ca1-98bb-c090931895c3";

test("requires a valid Assessment Experience identifier", () => {
  assert.equal(parsePrebuiltAssessmentConfiguration({ assessmentExperienceId: "", title: "", description: "" }).ok, false);
  assert.deepEqual(parsePrebuiltAssessmentConfiguration({ assessmentExperienceId: id, title: "Life Mapping U", description: "" }), { ok: true, value: { assessmentExperienceId: id, title: "Life Mapping U", description: "" } });
});

test("builds an encoded embedded launch with a safe Course return path", () => {
  const returnTo = embeddedAssessmentReturnPath({ slug: "hub-leader-cohort", moduleKey: "purpose", lessonKey: "calling", sectionKey: "assessment", cohortId: "cohort id" });
  assert.equal(returnTo, "/experiences/hub-leader-cohort/course/purpose/calling/assessment?cohort=cohort%20id");
  assert.equal(embeddedAssessmentLaunchPath("/experiences/life-mapping-u/original", "attempt/id", returnTo), "/experiences/life-mapping-u/original?embeddedAttempt=attempt%2Fid&returnTo=%2Fexperiences%2Fhub-leader-cohort%2Fcourse%2Fpurpose%2Fcalling%2Fassessment%3Fcohort%3Dcohort%2520id");
});

test("keeps embedded enrollment creation service-role-only and ownership-bound", () => {
  const migration = readFileSync(new URL("../../../supabase/migrations/20260926145218_reusable_prebuilt_assessment_blocks.sql", import.meta.url), "utf8");
  assert.match(migration, /participant_id = p_participant_id/);
  assert.match(migration, /version\.status = 'published'/);
  assert.match(migration, /revoke all on function public\.begin_embedded_assessment[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.begin_embedded_assessment[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.begin_embedded_assessment[\s\S]*to authenticated/);
});

test("accepts only the exact local parent route and preserves a UUID cohort", () => {
  const expected = "/experiences/hub-leader-cohort/course/purpose/calling/assessment";
  const cohort = "24fd0477-2a16-4ca1-98bb-c090931895c3";
  assert.equal(validatedEmbeddedReturnPath(`${expected}?cohort=${cohort}`, expected), `${expected}?cohort=${cohort}`);
  assert.equal(validatedEmbeddedReturnPath("https://attacker.example/course", expected), null);
  assert.equal(validatedEmbeddedReturnPath("//attacker.example/course", expected), null);
  assert.equal(validatedEmbeddedReturnPath("/dashboard", expected), null);
  assert.equal(validatedEmbeddedReturnPath(`${expected}?cohort=not-a-uuid`, expected), null);
});

test("one canonical enrollment supports multiple parent attempts and completion fans out", () => {
  const migration = readFileSync(new URL("../../../supabase/migrations/20260926145218_reusable_prebuilt_assessment_blocks.sql", import.meta.url), "utf8");
  assert.match(migration, /where participant_id = p_participant_id\s+and experience_id = v_assessment\.id/);
  assert.match(migration, /unique \(parent_enrollment_id, parent_content_block_id\)/);
  assert.match(migration, /where assessment_enrollment_id = new\.id\s+and status <> 'completed'/);
  assert.doesNotMatch(migration, /unique \(assessment_enrollment_id\)/);
});

test("required gating uses only completion signals and ignores optional or recommended blocks", () => {
  const progress = readFileSync(new URL("./progress-mutations.ts", import.meta.url), "utf8");
  assert.match(progress, /block\.requirement_level === "required"/);
  assert.match(progress, /embedded_assessment_attempts/);
  assert.match(progress, /attempt\.status === "completed"/);
  assert.doesNotMatch(progress, /participant_responses[\s\S]{0,300}embedded_assessment_attempts/);
});

test("all Course assessments share the high-contrast launch card and status actions", () => {
  const card = readFileSync(new URL("../../../components/experiences/builder/AssessmentLaunchCard.tsx", import.meta.url), "utf8");
  const prebuilt = readFileSync(new URL("../../../components/experiences/builder/PrebuiltAssessmentBlock.tsx", import.meta.url), "utf8");
  const ethos = readFileSync(new URL("../../../components/experiences/builder/EthosAssessment.tsx", import.meta.url), "utf8");
  const activate = readFileSync(new URL("../../../components/experiences/builder/ActivatePurposeAssessment.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.match(card, /Start Assessment/);
  assert.match(card, /Continue Assessment/);
  assert.match(card, /Review Assessment/);
  assert.match(prebuilt, /<AssessmentLaunchCard/);
  assert.match(ethos, /title="Wayfinders Ethos Reflection"/);
  assert.match(activate, /title="Activate Your Purpose"/);
  assert.match(css, /\.assessment-launch-card{[^}]*background:var\(--experience-accent/);
  assert.match(css, /\.assessment-launch-card h2{[^}]*color:#fff/);
  assert.match(css, /\.assessment-launch-card button{[^}]*background:#fff/);
});
