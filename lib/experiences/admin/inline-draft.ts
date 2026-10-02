export type InlineDraft = Readonly<{ text: string; title: string; level: "h2" | "h3" | "h4" }>;
export type InlineDocumentIdentity = Readonly<{ experienceId: string; versionId: string; sectionId: string; blockId: string; kind: "heading" | "rich_text" }>;
export type InlineRecoveryRecord = Readonly<{
  schemaVersion: 2;
  document: InlineDocumentIdentity;
  baselineRevision: string;
  baseline: InlineDraft;
  draft: InlineDraft;
  savedAt: string;
}>;
export type InlineRecovery =
  | { kind: "current"; record: InlineRecoveryRecord; stale: boolean }
  | { kind: "legacy"; draft: InlineDraft }
  | { kind: "invalid" };

export type InlineSaveResult =
  | { ok: true; revision: string }
  | { ok: false; code: "conflict"; error: string; revision: string; serverDraft: InlineDraft }
  | { ok: false; code: "invalid" | "missing" | "failed"; error: string };

export type InlineSaveState = "saved" | "unsaved" | "saving" | "error" | "recovery" | "conflict";

export function serializeInlineDraft(draft: InlineDraft) {
  return JSON.stringify(draft);
}

export function aggregateInlineSaveState(forms: number, inline: Iterable<InlineSaveState>) {
  let dirty = forms;
  let saving = 0;
  for (const state of inline) {
    if (state === "saving") saving += 1;
    if (state !== "saved") dirty += 1;
  }
  return { dirty, saving };
}

export function inlineSaveNeedsFollowUp(saved: InlineDraft, latest: InlineDraft, savedSequence: number, latestSequence: number) {
  return savedSequence !== latestSequence || serializeInlineDraft(saved) !== serializeInlineDraft(latest);
}

export function mergeInlineTextContent(blockType: "heading" | "rich_text", content: Record<string, unknown>, next: InlineDraft): Record<string, unknown> {
  return blockType === "heading"
    ? { ...content, text: next.text.trim(), level: next.level }
    : { ...content, title: next.title.trim(), text: next.text.trim() };
}

export function sameInlineDocument(left: InlineDocumentIdentity, right: InlineDocumentIdentity) {
  return left.experienceId === right.experienceId
    && left.versionId === right.versionId
    && left.sectionId === right.sectionId
    && left.blockId === right.blockId
    && left.kind === right.kind;
}

export function createInlineRecoveryRecord(document: InlineDocumentIdentity, baselineRevision: string, baseline: InlineDraft, draft: InlineDraft, savedAt = new Date().toISOString()): InlineRecoveryRecord {
  return { schemaVersion: 2, document, baselineRevision, baseline, draft, savedAt };
}

function draft(value: unknown): InlineDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const level = String(candidate.level ?? "h2");
  if (typeof candidate.text !== "string" || typeof candidate.title !== "string" || !["h2", "h3", "h4"].includes(level)) return null;
  return { text: candidate.text, title: candidate.title, level: level as InlineDraft["level"] };
}

export function parseInlineRecovery(raw: string, document: InlineDocumentIdentity, serverRevision: string): InlineRecovery {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.schemaVersion === 2) {
      const recordDraft = draft(value.draft);
      const baseline = draft(value.baseline);
      const recordDocument = value.document as InlineDocumentIdentity | undefined;
      if (!recordDraft || !baseline || !recordDocument || typeof value.baselineRevision !== "string" || typeof value.savedAt !== "string") return { kind: "invalid" };
      const record: InlineRecoveryRecord = { schemaVersion: 2, document: recordDocument, baselineRevision: value.baselineRevision, baseline, draft: recordDraft, savedAt: value.savedAt };
      return { kind: "current", record, stale: !sameInlineDocument(record.document, document) || record.baselineRevision !== serverRevision };
    }
    const legacy = draft(value);
    return legacy ? { kind: "legacy", draft: legacy } : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}
