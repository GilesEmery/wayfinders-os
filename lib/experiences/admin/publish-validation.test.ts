import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPublishBlockDefinition } from "./publish-validation-policy.ts";

test("Wayfinders Ethos Assessment is publish-valid", () => {
  const definition = getPublishBlockDefinition("system_component", "wayfinders-ethos-assessment.v1");
  assert.equal(definition?.participantRendererKey, "wayfinders-ethos-assessment.v1");
});

test("Activate Your Purpose Assessment is publish-valid", () => {
  const definition = getPublishBlockDefinition("custom_component", "activate-your-purpose-assessment.v1");
  assert.equal(definition?.participantRendererKey, "activate-your-purpose-assessment.v1");
});

test("unknown custom assessment remains publish-invalid", () => {
  assert.equal(getPublishBlockDefinition("custom_component", "unknown-assessment.v1"), null);
  assert.equal(getPublishBlockDefinition("system_component", "unknown-assessment.v1"), null);
});

test("publish validation remains strict for unsupported Block types and mismatched renderers", () => {
  assert.equal(getPublishBlockDefinition("unknown_block", null), null);
  assert.equal(getPublishBlockDefinition("rich_text", "unknown-renderer.v1"), null);
  assert.equal(getPublishBlockDefinition("custom_component", "wayfinders-ethos-assessment.v1"), null);
});

test("ordinary registered participant Blocks remain publish-valid", () => {
  assert.equal(getPublishBlockDefinition("rich_text", null)?.participantRendererKey, "rich-text.v1");
});

test("Preview and participant runtime use the same strict participant resolver", () => {
  const preview = readFileSync(new URL("../../../components/admin/BuilderBlocks.tsx", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../../../components/experiences/builder/ParticipantBlockRenderer.tsx", import.meta.url), "utf8");
  const publish = readFileSync(new URL("./publish-validation.ts", import.meta.url), "utf8");
  assert.match(preview, /getParticipantBlockDefinition\(block\.block_type, block\.custom_renderer_key\)/);
  assert.match(runtime, /getParticipantBlockDefinition\(block\.block_type, block\.custom_renderer_key\)/);
  assert.match(publish, /getPublishBlockDefinition\(block\.block_type, block\.custom_renderer_key\)/);
});
