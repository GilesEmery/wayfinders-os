import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("rich text supports semantic bulleted and numbered lists", () => {
  const renderer = readFileSync(new URL("../../../components/experiences/builder/ParticipantRichText.tsx", import.meta.url), "utf8");
  assert.match(renderer, /node\.type === "bulletList"\) return <ul/);
  assert.match(renderer, /node\.type === "orderedList"\) return <ol/);
  assert.match(renderer, /node\.type === "listItem"\) return <li/);
});

test("Builder editing and participant delivery show list markers", () => {
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /:is\(\.inline-text-surface,\.participant-rich-text-block\) ul\{list-style-type:disc\}/);
  assert.match(css, /:is\(\.inline-text-surface,\.participant-rich-text-block\) ol\{list-style-type:decimal\}/);
});
