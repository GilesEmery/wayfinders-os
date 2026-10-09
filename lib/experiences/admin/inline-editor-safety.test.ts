import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  aggregateInlineSaveState,
  createInlineRecoveryRecord,
  inlineSaveNeedsFollowUp,
  mergeInlineTextContent,
  parseInlineRecovery,
  serializeInlineDraft,
  type InlineDocumentIdentity,
  type InlineDraft,
} from "./inline-draft.ts";

const document: InlineDocumentIdentity = {
  experienceId: "experience-a",
  versionId: "version-a",
  sectionId: "section-a",
  blockId: "block-a",
  kind: "rich_text",
};
const server: InlineDraft = { text: "Newer **saved** copy", title: "Current", level: "h2" };
const local: InlineDraft = { text: "Older browser copy", title: "Old", level: "h2" };

test("versioned recovery is current only for the same document and server revision", () => {
  const raw = JSON.stringify(createInlineRecoveryRecord(document, "revision-1", server, local, "2026-09-30T00:00:00.000Z"));
  assert.deepEqual(parseInlineRecovery(raw, document, "revision-1"), {
    kind: "current",
    record: JSON.parse(raw),
    stale: false,
  });
  assert.equal(parseInlineRecovery(raw, document, "revision-2").kind, "current");
  assert.equal((parseInlineRecovery(raw, document, "revision-2") as { stale: boolean }).stale, true);
  assert.equal((parseInlineRecovery(raw, { ...document, sectionId: "section-b" }, "revision-1") as { stale: boolean }).stale, true);
});

test("legacy recovery is retained for an explicit decision and cannot masquerade as current", () => {
  assert.deepEqual(parseInlineRecovery(JSON.stringify(local), document, "revision-2"), { kind: "legacy", draft: local });
  assert.deepEqual(parseInlineRecovery("not json", document, "revision-2"), { kind: "invalid" });
});

test("typing during a pending save requires a serialized follow-up save", () => {
  assert.equal(inlineSaveNeedsFollowUp(server, server, 4, 4), false);
  assert.equal(inlineSaveNeedsFollowUp(server, { ...server, text: `${server.text}\n\nMore` }, 4, 5), true);
});

test("failed saves leave a complete retryable recovery record", () => {
  const record = createInlineRecoveryRecord(document, "revision-4", server, local);
  const recovered = parseInlineRecovery(JSON.stringify(record), document, "revision-4");
  assert.equal(recovered.kind, "current");
  if (recovered.kind === "current") assert.equal(serializeInlineDraft(recovered.record.draft), serializeInlineDraft(local));
});

test("multiple inline blocks contribute truthful aggregate status", () => {
  assert.deepEqual(aggregateInlineSaveState(1, ["saved", "unsaved", "conflict", "saving"]), { dirty: 4, saving: 1 });
  assert.deepEqual(aggregateInlineSaveState(0, ["saved", "saved"]), { dirty: 0, saving: 0 });
});

test("inline merging round-trips Markdown and preserves unrelated content fields", () => {
  const markdown = "## Heading\n\n- one\n- [linked](https://example.com)\n\n> quote";
  const current = { text: "old", title: "old", alignment: "center", eyebrow: "Note", style: { tone: "blue" } };
  const merged = mergeInlineTextContent("rich_text", current, { text: markdown, title: "Updated", level: "h2" });
  assert.equal(merged.text, markdown);
  assert.equal(merged.title, "Updated");
  assert.equal(merged.alignment, "center");
  assert.deepEqual(merged.style, { tone: "blue" });
});

test("the mounted editor does not apply or save recovery without an explicit choice", () => {
  const source = readFileSync(new URL("../../../components/admin/InlineTextBlockEditor.tsx", import.meta.url), "utf8");
  assert.match(source, /setRecovery\(parsed\)/);
  assert.doesNotMatch(source, /applyDraft\(parsed/);
  assert.match(source, /emitUpdate: false/);
  assert.match(source, /manualSaveRequired\.current = true/);
});

test("the server update is an atomic compare-and-swap and treats zero rows as conflict", () => {
  const source = readFileSync(new URL("./block-mutations.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function updateInlineTextBlock");
  const end = source.indexOf("export async function updateBlock(", start);
  const mutation = source.slice(start, end);
  assert.match(mutation, /\.eq\("updated_at", expectedRevision\)/);
  assert.match(mutation, /\.select\("updated_at"\)/);
  assert.match(mutation, /\.maybeSingle\(\)/);
  assert.match(mutation, /if \(!result\.data\)/);
  assert.doesNotMatch(mutation, /settings:/);
  assert.doesNotMatch(mutation, /requirement_level:/);
  assert.doesNotMatch(mutation, /visibility:/);
});


test("changing the separate rich text title size preserves body text and its formatting", () => {
  const text = "This week, we continue…\n\n[[size:h4]]Body text[[/size]]";
  const content = { title: "Circle of Influence", text, titleLevel: "h3" };
  const updated = mergeInlineTextContent("rich_text", content, { title: content.title, text, level: "h1" });
  assert.equal(updated.titleLevel, "h1");
  assert.equal(updated.text, text);
  assert.equal(updated.title, content.title);
});
