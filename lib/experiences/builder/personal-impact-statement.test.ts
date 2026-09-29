import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PERSONAL_IMPACT_CAUSES, PERSONAL_IMPACT_FIELDS, PERSONAL_IMPACT_RENDERER_KEY,
  PERSONAL_IMPACT_RESPONSE_KEY, PERSONAL_IMPACT_SLUG, PERSONAL_IMPACT_SOURCE_MAP,
  composeRoughDraftOne, composeRoughDraftTwo, emptyPersonalImpactData,
  firstIncompletePersonalImpactStage, normalizePersonalImpactData, personalImpactComplete,
  personalImpactStatus, publicPersonalImpactSummary,
} from "./personal-impact-statement.ts";
import { getPublishBlockDefinition } from "../admin/publish-validation-policy.ts";

const complete = () => ({
  area_of_influence: "An experience", causes: ["Education"], causes_other: "",
  rough_1_to: "equip leaders", rough_1_by: "sharing practical tools", rough_1_so_that: "communities flourish",
  world_change: "Leaders will act with purpose.", mission_loss: "Communities will lose hopeful leaders.",
  rough_2_i_will: "equip leaders", rough_2_help: "their communities", rough_2_provides: "lasting change",
  distilled_statement: "Equip leaders for lasting community change.",
  final_impact_statement: "I equip leaders to create lasting change in their communities.",
});

test("stable canonical identifiers and source mapping", () => {
  assert.equal(PERSONAL_IMPACT_SLUG, "personal-impact-statement");
  assert.equal(PERSONAL_IMPACT_RENDERER_KEY, "personal-impact-statement.v1");
  assert.equal(PERSONAL_IMPACT_RESPONSE_KEY, "personal_impact_statement");
  assert.equal(PERSONAL_IMPACT_FIELDS.length, 12);
  assert.deepEqual(PERSONAL_IMPACT_SOURCE_MAP, { Q12: "area_of_influence", Q80: "causes", Q87: "rough_1_to", Q89: "rough_1_by", Q90: "rough_1_so_that", Q92: "world_change", Q93: "mission_loss", Q96: "rough_2_i_will", Q97: "rough_2_help", Q98: "rough_2_provides", Q21: "distilled_statement", Q31: "final_impact_statement" });
});

test("preserves all 24 exact cause labels and supports Other", () => {
  assert.equal(PERSONAL_IMPACT_CAUSES.length, 24);
  assert.deepEqual(PERSONAL_IMPACT_CAUSES.slice(0, 4), ["No Poverty", "Mentoring Youth", "Addiction Recovery", "Mental Health"]);
  assert.deepEqual(PERSONAL_IMPACT_CAUSES.slice(-4), ["Hospitality", "Global Missions", "Using Technology for Good", "Business as Mission"]);
  assert.deepEqual(normalizePersonalImpactData({ causes: ["Education", "Other"] }).causes, ["Education", "Other"]);
});

test("normalization enforces canonical cause order, uniqueness, and maximum four", () => {
  const normalized = normalizePersonalImpactData({ causes: ["Education", "Education", "Other", "No Poverty", "Athletics", "Clean Water"] });
  assert.deepEqual(normalized.causes, ["Education", "Other", "No Poverty", "Athletics"]);
});

test("completion requires every source field and one to four causes", () => {
  const value = complete();
  assert.equal(personalImpactComplete(value), true);
  assert.equal(personalImpactStatus(value), "submitted");
  assert.equal(firstIncompletePersonalImpactStage(value), 6);
  assert.equal(personalImpactComplete({ ...value, final_impact_statement: "   " }), false);
  assert.equal(personalImpactStatus({ ...value, final_impact_statement: "" }), "draft");
  assert.equal(firstIncompletePersonalImpactStage({ ...value, world_change: "" }), 3);
  assert.equal(personalImpactComplete({ ...value, causes: [] }), false);
  assert.equal(personalImpactComplete({ ...value, causes: ["No Poverty", "Education", "Athletics", "Clean Water", "Other"] }), false);
});

test("live drafts are derived and public helper exposes only safe result fields", () => {
  const value = complete();
  assert.equal(composeRoughDraftOne(value), "To equip leaders by sharing practical tools so that communities flourish.");
  assert.equal(composeRoughDraftTwo(value), "I will equip leaders in order to help their communities in a way that produces/ provides lasting change.");
  assert.deepEqual(publicPersonalImpactSummary(value), { final_impact_statement: value.final_impact_statement, causes: ["Education"], complete: true });
  assert.equal("world_change" in publicPersonalImpactSummary(value), false);
});

test("runtime, preview, privacy, autosave, result, return context, and responsive interaction are wired", () => {
  const component = readFileSync(new URL("../../../components/experiences/builder/PersonalImpactStatementAssessment.tsx", import.meta.url), "utf8");
  const mutation = readFileSync(new URL("./personal-impact-statement-mutations.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../../../scripts/create-personal-impact-statement-draft.mjs", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.match(component, /preview.*return/);
  assert.match(component, /650/);
  assert.match(component, /role="checkbox"/);
  assert.match(component, /aria-checked/);
  assert.match(component, /You can select up to 4/);
  assert.match(component, /Return to Course/);
  assert.match(component, /Copy Statement/);
  assert.match(component, /Review My Responses/);
  assert.match(component, /Your Previous Responses/);
  assert.match(component, /Open this anytime to remember what you shared earlier/);
  assert.match(component, /stage > 1[\s\S]*Causes You Care About/);
  assert.match(component, /stage > 5[\s\S]*Distilled Statement/);
  assert.match(component, /Print \/ Save as PDF/);
  assert.match(mutation, /wasComplete/);
  assert.match(mutation, /participant_id.*resolution\.participantId/);
  assert.match(script, /experience_type: "assessment"/);
  assert.match(script, /status: "draft"/);
  assert.match(script, /raw_visibility: "participant_only"/);
  assert.match(script, /share_mode: "disabled"/);
  assert.doesNotMatch(script, /prebuilt_assessments.*insert/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.pis-previous-responses/);
});

test("publish registry recognizes the stable custom assessment runtime", () => {
  assert.ok(getPublishBlockDefinition("custom_component", PERSONAL_IMPACT_RENDERER_KEY));
  assert.deepEqual(normalizePersonalImpactData({}), emptyPersonalImpactData());
});

test("standalone and Course entry paths converge on the canonical component", () => {
  const standalone = readFileSync(new URL("../../../app/experiences/personal-impact-statement/page.tsx", import.meta.url), "utf8");
  const participant = readFileSync(new URL("../../../components/experiences/builder/ParticipantBlockRenderer.tsx", import.meta.url), "utf8");
  const courseCard = readFileSync(new URL("../../../components/experiences/builder/PrebuiltAssessmentBlock.tsx", import.meta.url), "utf8");
  assert.match(standalone, /<PersonalImpactStatementAssessment/);
  assert.match(standalone, /mode={returnTo \? "course" : "standalone"}/);
  assert.match(participant, /<PersonalImpactStatementAssessment/);
  assert.match(courseCard, /startPrebuiltAssessmentAction/);
  assert.match(courseCard, /Start Assessment/);
  assert.match(courseCard, /Continue Assessment/);
  assert.match(courseCard, /Review Assessment/);
});

test("standalone and Course presentation use explicit shells around identical stage and result markup", () => {
  const standalone = readFileSync(new URL("../../../app/experiences/personal-impact-statement/page.tsx", import.meta.url), "utf8");
  const component = readFileSync(new URL("../../../components/experiences/builder/PersonalImpactStatementAssessment.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.match(component, /PersonalImpactStatementMode = "standalone" \| "course"/);
  assert.match(component, /pis-shell is-\$\{mode\}/);
  assert.equal(component.match(/export function PersonalImpactStatementAssessment/g)?.length, 1);
  assert.equal(standalone.match(/<PersonalImpactStatementAssessment/g)?.length, 1);
  assert.match(css, /\.pis-shell\.is-standalone/);
  assert.match(css, /\.pis-shell\.is-course \.pis-experience/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("standalone return context is server validated and never owns responses", () => {
  const standalone = readFileSync(new URL("../../../app/experiences/personal-impact-statement/page.tsx", import.meta.url), "utf8");
  const context = readFileSync(new URL("./embedded-assessment-context.ts", import.meta.url), "utf8");
  const component = readFileSync(new URL("../../../components/experiences/builder/PersonalImpactStatementAssessment.tsx", import.meta.url), "utf8");
  assert.match(standalone, /resolveEmbeddedAssessmentReturnContext/);
  assert.match(context, /assessment_enrollment_id/);
  assert.match(context, /participant_id/);
  assert.doesNotMatch(component, /URLSearchParams/);
  assert.match(component, /returnTo && <a href={returnTo}>Return to Course<\/a>/);
  assert.match(component, /href={returnTo \?\? "\/dashboard"}/);
});

test("the shared catalog remains the source of standalone Training cards", () => {
  const catalog = readFileSync(new URL("../../platform/training-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /from\("experiences"\)/);
  assert.match(catalog, /visibility", "public"/);
  assert.match(catalog, /status", "active"/);
});
