import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { completedGenericResult } from "./assessment-results-policy.ts";
import { emptyPersonalImpactData, projectPersonalImpactSave } from "./experiences/builder/personal-impact-statement.ts";
import { emptyStartSomethingData, projectStartSomethingSave } from "./experiences/builder/start-something.ts";

function completedPIS() {
  return { ...emptyPersonalImpactData(), area_of_influence: "Community", causes: ["Education"], rough_1_to: "help", rough_1_by: "serving", rough_1_so_that: "people flourish", world_change: "Hope grows", mission_loss: "Hope fades", rough_2_i_will: "serve", rough_2_help: "neighbors", rough_2_provides: "hope", distilled_statement: "Serve with hope", final_impact_statement: "I serve neighbors with hope." };
}

test("only durable completed snapshots become generic results", () => {
  assert.equal(completedGenericResult("personal_impact_statement", { response: emptyPersonalImpactData() }, "2026-10-01T12:00:00.000Z"), null);
  assert.equal(completedGenericResult("start_something", { schemaVersion: 1, draft: emptyStartSomethingData(), finished: null }, "2026-10-01T12:00:00.000Z"), null);
  const pis = projectPersonalImpactSave({}, completedPIS(), "2026-10-01T12:00:00.000Z", null, true);
  assert.equal(completedGenericResult("personal_impact_statement", pis, pis.finished!.completedAt)?.completedAt, "2026-10-01T12:00:00.000Z");
  const start = projectStartSomethingSave({}, emptyStartSomethingData(), true, "2026-10-02T12:00:00.000Z");
  assert.equal(completedGenericResult("start_something", start, start.finished!.completedAt)?.kind, "start-something");
});

test("legacy completed PIS records are readable without inventing incomplete results", () => {
  assert.equal(completedGenericResult("personal_impact_statement", { response: completedPIS() }, "2025-01-01T12:00:00.000Z")?.completedAt, "2025-01-01T12:00:00.000Z");
  assert.equal(completedGenericResult("personal_impact_statement", { response: completedPIS() }, null), null);
});

test("participant and admin direct routes retain ownership and authorization guards", () => {
  const data = readFileSync(new URL("./assessment-results.ts", import.meta.url), "utf8");
  const participant = readFileSync(new URL("../app/account/results/[kind]/[resultId]/page.tsx", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../app/admin/users/[userId]/results/[kind]/[resultId]/page.tsx", import.meta.url), "utf8");
  assert.match(data, /eq\("participant_id", participantId\)/);
  assert.match(data, /in\("status", \["submitted", "finalized"\]\)/);
  assert.match(data, /eq\("status", "completed"\)/);
  assert.match(participant, /ensurePlatformProfile/);
  assert.match(admin, /requireAdmin\(\)/);
  assert.match(admin, /loadCompletedAssessmentResult\(userId/);
});


test("standalone numeric results require durable finish plus matching final timestamp", () => {
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [`q${index + 1}`, 4]));
  const finished = { completedAt: "2026-10-02T12:00:00.000Z", answers };
  assert.equal(completedGenericResult("wayfinders_ethos_assessment", { answers }, finished.completedAt), null);
  assert.equal(completedGenericResult("wayfinders_ethos_assessment", { finished }, null), null);
  assert.equal(completedGenericResult("wayfinders_ethos_assessment", { finished }, "2026-10-03T12:00:00.000Z"), null);
  assert.equal(completedGenericResult("wayfinders_ethos_assessment", { finished }, finished.completedAt)?.kind, "wayfinders-ethos");
  assert.equal(completedGenericResult("launching_wayfinders_hub_assessment", { finished }, finished.completedAt)?.kind, "launching-your-wayfinders-hub");
});
