import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { syncStartSomethingPlaces, createStartSomethingFinished, emptyStartSomethingData, normalizeStartSomethingData, normalizeStartSomethingEnvelope, projectStartSomethingSave, START_SOMETHING_NETWORK_PLACES, START_SOMETHING_PROMPTS, START_SOMETHING_STAGES, START_SOMETHING_TIMELINE, startSomethingEquivalent } from "./start-something.ts";

test("maps the exact 22 core reflective prompts without identity or workshop questions", () => {
  assert.equal(Object.keys(START_SOMETHING_PROMPTS).length, 22);
  assert.equal(START_SOMETHING_PROMPTS.idea_summary, "Summarize your idea here.");
  assert.equal(START_SOMETHING_PROMPTS.distinctiveness, "How is this work different from others that are similar?");
  assert.equal(JSON.stringify(START_SOMETHING_PROMPTS).includes("OUR WORLD NEEDS HOPE"), false);
  assert.equal("name" in START_SOMETHING_PROMPTS, false);
  assert.equal("email" in START_SOMETHING_PROMPTS, false);
});

test("keeps all reflections optional and normalizes hostile shapes", () => {
  const empty = normalizeStartSomethingData({});
  assert.deepEqual(empty, emptyStartSomethingData());
  assert.equal(empty.idea.idea_summary, "");
  assert.equal(empty.next_steps.timeline_stage, "");
});

test("preserves the exact 21 network categories and limits selections to five", () => {
  assert.equal(START_SOMETHING_NETWORK_PLACES.length, 21);
  const normalized = normalizeStartSomethingData({ network: { places: [...START_SOMETHING_NETWORK_PLACES, "Hostile"] } });
  assert.deepEqual(normalized.network.places, START_SOMETHING_NETWORK_PLACES.slice(0, 5));
  assert.equal(normalized.network.locations.length, 5);
  assert.ok(normalized.network.locations.every((location) => location.names.length === 5));
});

test("uses the six self-selected stages without interpreting later as better", () => {
  assert.equal(START_SOMETHING_STAGES.length, 6);
  assert.deepEqual(START_SOMETHING_TIMELINE, ["1. Idea", "2. Vision", "3. Strategy", "4. Recruit Team", "5. Experiment", "6. Commit"]);
  assert.equal(normalizeStartSomethingData({ next_steps: { timeline_stage: "1. Idea" } }).next_steps.timeline_stage, "1. Idea");
});

test("finished result is versioned, deterministic, and separate from later draft edits", () => {
  const draft = emptyStartSomethingData(); draft.idea.idea_summary = "Original";
  const finished = createStartSomethingFinished(draft, "2026-09-30T12:00:00.000Z");
  const later = structuredClone(draft); later.idea.idea_summary = "Later incomplete edit";
  const envelope = normalizeStartSomethingEnvelope({ schemaVersion: 1, draft: later, finished });
  assert.equal(envelope.draft.idea.idea_summary, "Later incomplete edit");
  assert.equal(envelope.finished?.participantMaterial.idea.idea_summary, "Original");
  assert.equal(envelope.finished?.sourceVersion, "start-something.v1");
  assert.equal(startSomethingEquivalent(finished.participantMaterial, draft), true);
});

test("draft saves preserve the last finish and repeated Finish is idempotent", () => {
  const draft = emptyStartSomethingData(); draft.idea.idea_summary = "An idea";
  const first = projectStartSomethingSave({}, draft, true, "2026-09-30T12:00:00.000Z");
  const repeated = projectStartSomethingSave(first, draft, true, "2026-09-30T13:00:00.000Z");
  assert.equal(repeated.finished?.completedAt, "2026-09-30T12:00:00.000Z");
  const edited = structuredClone(draft); edited.idea.idea_summary = "Unfinished revision";
  const autosaved = projectStartSomethingSave(repeated, edited, false, "2026-09-30T14:00:00.000Z");
  assert.equal(autosaved.draft.idea.idea_summary, "Unfinished revision");
  assert.equal(autosaved.finished?.participantMaterial.idea.idea_summary, "An idea");
});

test("runtime enforces explicit finish, ownership checks, preview safety, and canonical shared response", () => {
  const mutation = readFileSync(new URL("./start-something-mutations.ts", import.meta.url), "utf8");
  const component = readFileSync(new URL("../../../components/experiences/builder/StartSomethingExperience.tsx", import.meta.url), "utf8");
  const standalone = readFileSync(new URL("../../../app/experiences/start-something/page.tsx", import.meta.url), "utf8");
  const registry = readFileSync(new URL("./block-registry.ts", import.meta.url), "utf8");
  assert.match(mutation, /resolveParticipantCourse/);
  assert.match(mutation, /participantId.*resolution\.participantId/);
  assert.match(mutation, /enrollmentId.*resolution\.enrollmentId/);
  assert.match(mutation, /if \(finish\) \{\s*await completeSectionResponsesForAuthorizedCourse/);
  assert.match(mutation, /projectStartSomethingSave/);
  assert.match(component, /if \(preview \|\| JSON\.stringify\(snapshot\)/);
  assert.match(component, /Save my response/);
  assert.match(component, /pis-previous-responses start-something-previous-responses/);
  assert.match(component, /Your Previous Responses/);
  assert.match(component, /guidedPages\.slice\(0, currentPage\)/);
  assert.match(component, /start-something-substeps/);
  assert.match(component, /start-something-network-map is-single/);
  assert.match(component, /trackPages\.length/);
  assert.match(component, /flex: trackPages\.length \+ 1/);
  assert.match(component, /flex: "0 0 94px"/);
  assert.match(component, /"is-upcoming"/);
  assert.match(standalone, /resolveEmbeddedAssessmentReturnContext/);
  assert.match(standalone, /response\.response\?\.response_data/);
  assert.match(registry, /custom_component:start-something\.v1/);
});

test("print and responsive design remain scoped to Start Something", () => {
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.start-something-shell\{--ss-blue:#0054a1;--ss-yellow:#f5bd00;--ss-charcoal:#252a29;--ss-cream:#f8f5ec/);
  assert.match(css, /@media print\{body:has\(\.start-something-result\)/);
  assert.match(css, /break-inside:avoid/);
  assert.match(css, /\.start-something-workflow,\.start-something-result\{border-radius:28px/);
});

test("release registration requires the canonical published version before standalone or prebuilt activation", () => {
  const script = readFileSync(new URL("../../../scripts/register-start-something-prebuilt.mjs", import.meta.url), "utf8");
  assert.match(script, /8ccd1802-f9c2-493d-bcc8-73885008096b/);
  assert.match(script, /version\.data\?\.status === "published"/);
  assert.match(script, /current_published_version_id/);
  assert.match(script, /start-something\.v1/);
  assert.match(script, /response_key", "start_something"/);
  assert.match(script, /visibility: "public"/);
  assert.match(script, /admission_policy: "open_enrollment"/);
  assert.match(script, /launch_path: LAUNCH_PATH/);
  assert.match(script, /completion_provider: "experience_enrollment"/);
  assert.match(script, /status: "active"/);
  assert.match(script, /--confirm=/);
});

test("selected network settings populate circles and preserve names when reordered or reselected", () => {
  const original = emptyStartSomethingData().network;
  let network = syncStartSomethingPlaces(original, ["Church", "Work", "Coffee shop"]);
  assert.deepEqual(network.locations.slice(0, 3).map(row => row.location), ["Church", "Work", "Coffee shop"]);
  network.locations[1].names[0] = "Fixture connection";
  network = syncStartSomethingPlaces(network, ["Church", "Coffee shop"]);
  assert.equal(network.locations[1].location, "Coffee shop");
  network = syncStartSomethingPlaces(network, ["Church", "Coffee shop", "Work"]);
  assert.equal(network.locations[2].names[0], "Fixture connection");
  assert.deepEqual(original.places, []);
});

test("Other fills the selected circle while existing custom location labels survive", () => {
  let network = syncStartSomethingPlaces(emptyStartSomethingData().network, ["Other"], "Local library");
  assert.equal(network.locations[0].location, "Local library");
  network = syncStartSomethingPlaces(network, ["Other"], "Community library");
  assert.equal(network.locations[0].location, "Community library");
  network.locations[0].location = "My custom label";
  assert.equal(syncStartSomethingPlaces(network, ["Other"], "Another library").locations[0].location, "My custom label");
});
