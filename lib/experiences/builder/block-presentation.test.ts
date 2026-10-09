import test from "node:test";
import assert from "node:assert/strict";
import { presentationSettings, readBlockPresentation } from "./block-presentation.ts";

test("legacy items and unrelated edits retain existing settings", () => {
  assert.equal(readBlockPresentation({}), null);
  const settings = { unrelated: { enabled: true } };
  assert.deepEqual(presentationSettings(settings, new FormData()), settings);
});

test("header and body sizes are independent and blank headers remain blank", () => {
  const form = new FormData();
  form.set("presentation_header", "");
  form.set("presentation_body", "**Important**\n\n- First\n  - Nested");
  form.set("presentation_header_size", "h4");
  form.set("presentation_body_size", "h1");
  form.set("presentation_placement", "between");
  const settings = presentationSettings({ keep: true }, form);
  assert.equal(settings.keep, true);
  assert.deepEqual(readBlockPresentation(settings), { header: "", body: form.get("presentation_body"), headerSize: "h4", bodySize: "h1", placement: "between" });
  assert.deepEqual(readBlockPresentation(JSON.parse(JSON.stringify(settings))), readBlockPresentation(settings));
});

test("invalid sizes normalize safely and oversized text cannot be saved", () => {
  assert.deepEqual(readBlockPresentation({ textPresentation: { headerSize: "giant", bodySize: null, placement: "unsafe" } }), { header: "", body: "", headerSize: "h3", bodySize: "h4", placement: "below" });
  const form = new FormData();
  form.set("presentation_header", "x".repeat(12001));
  assert.throws(() => presentationSettings({}, form), /12,000/);
});
