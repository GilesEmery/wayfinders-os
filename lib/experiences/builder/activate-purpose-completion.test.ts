import assert from "node:assert/strict";
import test from "node:test";
import { projectActivatePurposeResponse } from "./activate-purpose-completion.ts";
const answers = Object.fromEntries(Array.from({length:15}, (_, i) => [`q${i+1}`, "A" as const]));
test("standalone fully answered autosave remains draft until explicit finish", () => {
  assert.equal(projectActivatePurposeResponse({}, answers, false, "2026-10-02").finished, null);
  assert.deepEqual(projectActivatePurposeResponse({}, answers, true, "2026-10-02").finished, { completedAt: "2026-10-02", answers });
});
test("late saves and repeated finish preserve original standalone snapshot and date", () => {
  const first = projectActivatePurposeResponse({}, answers, true, "2026-10-02");
  for (const finalize of [false, true]) assert.deepEqual(projectActivatePurposeResponse(first, {q1:"D"}, finalize, "2026-10-03"), first);
});
