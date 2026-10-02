"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { safeExternalUrl } from "@/lib/experiences/builder/media-source";
import { createInlineRecoveryRecord, inlineSaveNeedsFollowUp, parseInlineRecovery, serializeInlineDraft, type InlineDocumentIdentity, type InlineDraft, type InlineRecovery, type InlineSaveResult, type InlineSaveState } from "@/lib/experiences/admin/inline-draft";

type SaveAction = (form: FormData) => Promise<InlineSaveResult>;
type EditorStatus = InlineSaveState;
type Props = InlineDocumentIdentity & { text: string; title?: string; level?: InlineDraft["level"]; alignment?: "left" | "center"; eyebrow?: string; serverRevision: string; saveAction: SaveAction };
const AUTOSAVE_MS = 1400;

function announce(id: string, status: EditorStatus | "removed") {
  window.dispatchEvent(new CustomEvent("purposeos:save-status", { detail: { id, status, source: "inline" } }));
}

function ToolbarButton({ active = false, disabled = false, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{children}</button>;
}

function baseline(text: string, title: string, level: InlineDraft["level"], kind: Props["kind"]): InlineDraft {
  return { text, title: kind === "rich_text" ? title : "", level };
}

export function InlineTextBlockEditor({ experienceId, versionId, sectionId, blockId, kind, text, title = "", level = "h2", alignment = "left", eyebrow = "", serverRevision, saveAction }: Props) {
  const document = useMemo<InlineDocumentIdentity>(() => ({ experienceId, versionId, sectionId, blockId, kind }), [blockId, experienceId, kind, sectionId, versionId]);
  const storageKey = `purposeos:inline-draft:${blockId}`;
  const incomingDraft = useMemo(() => baseline(text, title, level, kind), [kind, level, text, title]);
  const [draftTitle, setDraftTitle] = useState(incomingDraft.title);
  const [headingLevel, setHeadingLevel] = useState(incomingDraft.level);
  const [status, setStatusState] = useState<EditorStatus>("saved");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [recovery, setRecovery] = useState<InlineRecovery | null>(null);
  const [conflict, setConflict] = useState<{ revision: string; serverDraft: InlineDraft; message: string } | null>(null);
  const lastSaved = useRef(serializeInlineDraft(incomingDraft));
  const baselineDraft = useRef(incomingDraft);
  const revision = useRef(serverRevision);
  const propRevision = useRef(serverRevision);
  const editSequence = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef(false);
  const queuedSave = useRef(false);
  const mounted = useRef(false);
  const suppressUpdates = useRef(false);
  const manualSaveRequired = useRef(false);
  const statusRef = useRef<EditorStatus>("saved");
  const changedRef = useRef<(override?: Partial<InlineDraft>) => void>(() => undefined);
  const saveRef = useRef<() => void>(() => undefined);
  const initialDocument = useRef(document);
  const initialRevision = useRef(serverRevision);

  const setStatus = useCallback((next: EditorStatus) => { statusRef.current = next; setStatusState(next); announce(blockId, next); }, [blockId]);

  const editor = useEditor({
    immediatelyRender: false,
    content: text || (kind === "heading" ? "New heading" : "Add your content here."),
    contentType: "markdown",
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, code: false, codeBlock: false, horizontalRule: false, strike: false, link: { autolink: false, linkOnPaste: true, markdownLinks: true, openOnClick: false, defaultProtocol: "https", isAllowedUri: (url) => Boolean(safeExternalUrl(url)), HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } } }), Markdown],
    editorProps: { attributes: { class: `inline-text-surface is-${kind}`, "aria-label": kind === "heading" ? "Heading text" : "Rich text content" } },
    onFocus: () => setActive(true),
  });

  const currentDraft = useCallback((override: Partial<InlineDraft> = {}): InlineDraft => ({
    text: override.text ?? (kind === "heading" ? (editor?.getText() ?? "").trim() : (editor?.getMarkdown() ?? "").trim()),
    title: override.title ?? (kind === "rich_text" ? draftTitle.trim() : ""),
    level: override.level ?? headingLevel,
  }), [draftTitle, editor, headingLevel, kind]);

  const persist = useCallback((draft: InlineDraft) => localStorage.setItem(storageKey, JSON.stringify(createInlineRecoveryRecord(document, revision.current, baselineDraft.current, draft))), [document, storageKey]);

  const applyDraft = useCallback((draft: InlineDraft) => {
    if (!editor) return;
    suppressUpdates.current = true;
    editor.commands.setContent(draft.text || (kind === "heading" ? "New heading" : "Add your content here."), { contentType: "markdown", emitUpdate: false });
    setDraftTitle(kind === "rich_text" ? draft.title : "");
    setHeadingLevel(draft.level);
    queueMicrotask(() => { suppressUpdates.current = false; });
  }, [editor, kind]);

  const performSave = useCallback(async () => {
    if (!editor || recovery || conflict) return;
    if (saveInFlight.current) { queuedSave.current = true; return; }
    const draft = currentDraft();
    const serialized = serializeInlineDraft(draft);
    if (!draft.text || serialized === lastSaved.current) { setStatus("saved"); return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveInFlight.current = true;
    queuedSave.current = false;
    const sequence = editSequence.current;
    setStatus("saving");
    setError("");
    const form = new FormData();
    form.set("expected_revision", revision.current);
    form.set("text", draft.text);
    if (kind === "heading") form.set("level", draft.level); else form.set("title", draft.title);
    let continueSaving = false;
    try {
      const result = await saveAction(form);
      if (result.ok) {
        revision.current = result.revision;
        baselineDraft.current = draft;
        lastSaved.current = serialized;
        const latest = currentDraft();
        if (!inlineSaveNeedsFollowUp(draft, latest, sequence, editSequence.current)) {
          localStorage.removeItem(storageKey);
          manualSaveRequired.current = false;
          setStatus("saved");
        } else {
          persist(latest);
          setStatus("unsaved");
          continueSaving = true;
        }
      } else if (result.code === "conflict") {
        persist(currentDraft());
        setConflict({ revision: result.revision, serverDraft: result.serverDraft, message: result.error });
        manualSaveRequired.current = true;
        setError(result.error);
        setStatus("conflict");
      } else {
        persist(currentDraft());
        setError(result.error);
        setStatus("error");
      }
    } catch {
      persist(currentDraft());
      setError("The save did not complete. Your draft is retained in this browser; try again.");
      setStatus("error");
    } finally {
      saveInFlight.current = false;
      if (queuedSave.current) continueSaving = true;
      queuedSave.current = false;
      if (continueSaving) queueMicrotask(() => saveRef.current());
    }
  }, [conflict, currentDraft, editor, kind, persist, recovery, saveAction, setStatus, storageKey]);

  const requestSave = useCallback(() => { void performSave(); }, [performSave]);
  useEffect(() => { saveRef.current = requestSave; }, [requestSave]);

  const changed = useCallback((override: Partial<InlineDraft> = {}) => {
    if (!editor || !mounted.current || suppressUpdates.current || recovery || conflict) return;
    const draft = currentDraft(override);
    editSequence.current += 1;
    persist(draft);
    manualSaveRequired.current = false;
    setError("");
    setStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveRef.current(), AUTOSAVE_MS);
  }, [conflict, currentDraft, editor, persist, recovery, setStatus]);
  useEffect(() => { changedRef.current = changed; }, [changed]);

  useEffect(() => {
    if (!editor) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseInlineRecovery(stored, initialDocument.current, initialRevision.current);
      setRecovery(parsed);
      setError(parsed.kind === "current" && !parsed.stale ? "A browser draft is available. Review it before choosing whether to recover it." : "A stale or legacy browser draft is available. It will not replace saved content unless you explicitly recover it.");
      setStatus("recovery");
    } else setStatus("saved");
    mounted.current = true;
    const handleUpdate = () => changedRef.current();
    const saveAll = () => saveRef.current();
    const reportStatus = () => announce(blockId, statusRef.current);
    const discardAll = () => {
      if (saveInFlight.current) return;
      applyDraft(baselineDraft.current);
      editSequence.current += 1;
      lastSaved.current = serializeInlineDraft(baselineDraft.current);
      localStorage.removeItem(storageKey);
      setRecovery(null); setConflict(null); setError("");
      manualSaveRequired.current = false;
      setStatus("saved");
    };
    editor.on("update", handleUpdate);
    window.addEventListener("purposeos:save-all", saveAll);
    window.addEventListener("purposeos:discard-all", discardAll);
    window.addEventListener("purposeos:request-save-status", reportStatus);
    return () => {
      mounted.current = false;
      editor.off("update", handleUpdate);
      window.removeEventListener("purposeos:save-all", saveAll);
      window.removeEventListener("purposeos:discard-all", discardAll);
      window.removeEventListener("purposeos:request-save-status", reportStatus);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      announce(blockId, "removed");
    };
  }, [applyDraft, blockId, editor, setStatus, storageKey]);

  useEffect(() => {
    if (!editor || propRevision.current === serverRevision) return;
    propRevision.current = serverRevision;
    if (statusRef.current === "saved" && !saveInFlight.current && !recovery && !conflict) {
      revision.current = serverRevision;
      baselineDraft.current = incomingDraft;
      lastSaved.current = serializeInlineDraft(incomingDraft);
      applyDraft(incomingDraft);
      return;
    }
    persist(currentDraft());
    setConflict({ revision: serverRevision, serverDraft: incomingDraft, message: "Newer saved content arrived while this editor had local changes." });
    manualSaveRequired.current = true;
    setError("Newer saved content arrived while this editor had local changes. Choose which version to keep.");
    setStatus("conflict");
  }, [applyDraft, conflict, currentDraft, editor, incomingDraft, persist, recovery, serverRevision, setStatus]);

  const recoverDraft = () => {
    if (!recovery || recovery.kind === "invalid") return;
    const recovered = recovery.kind === "legacy" ? recovery.draft : recovery.record.draft;
    applyDraft(recovered); setRecovery(null); editSequence.current += 1;
    manualSaveRequired.current = true; persist(recovered);
    setError("Recovered locally. Review the content, then choose Save to commit it."); setStatus("unsaved");
  };
  const useSavedVersion = () => {
    applyDraft(incomingDraft); baselineDraft.current = incomingDraft; revision.current = serverRevision; lastSaved.current = serializeInlineDraft(incomingDraft);
    editSequence.current += 1; localStorage.removeItem(storageKey); setRecovery(null); setConflict(null); setError(""); manualSaveRequired.current = false; setStatus("saved");
  };
  const useLatestConflict = () => {
    if (!conflict) return;
    applyDraft(conflict.serverDraft); baselineDraft.current = conflict.serverDraft; revision.current = conflict.revision; lastSaved.current = serializeInlineDraft(conflict.serverDraft);
    editSequence.current += 1; localStorage.removeItem(storageKey); setConflict(null); setError(""); manualSaveRequired.current = false; setStatus("saved");
  };
  const keepLocalConflict = () => {
    if (!conflict) return;
    const local = currentDraft(); baselineDraft.current = conflict.serverDraft; revision.current = conflict.revision; setConflict(null); manualSaveRequired.current = true; persist(local);
    setError("Your local draft is retained. Review it, then choose Save to replace the latest saved version."); setStatus("unsaved");
  };

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const requested = window.prompt("HTTPS link", previous || "https://");
    if (requested === null) return;
    if (!requested.trim()) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    const url = safeExternalUrl(requested);
    if (!url) { setError("Links must use a valid HTTPS URL without embedded credentials."); setStatus("error"); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) return <div className="inline-text-loading">Preparing inline editor…</div>;
  const selectedText = !editor.state.selection.empty;
  const showToolbar = active || status !== "saved";
  const statusMessage = status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "error" ? error : status === "recovery" ? "Browser draft needs review" : status === "conflict" ? "Save conflict needs review" : error || "Unsaved changes";

  return <div className={`inline-text-editor is-${kind} is-${headingLevel} is-align-${alignment}${showToolbar ? " is-active" : ""}`} onFocus={() => setActive(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setActive(false); if (statusRef.current === "unsaved" && !manualSaveRequired.current) requestSave(); } }}>
    {recovery && <aside className="inline-text-recovery" role="alert"><strong>Browser draft found</strong><p>{error}</p><div>{recovery.kind !== "invalid" && <button type="button" onClick={recoverDraft}>Recover Draft</button>}<button type="button" onClick={useSavedVersion}>Use Saved Version</button></div></aside>}
    {conflict && <aside className="inline-text-recovery is-conflict" role="alert"><strong>Content changed elsewhere</strong><p>{conflict.message}</p><div><button type="button" onClick={keepLocalConflict}>Keep My Draft</button><button type="button" onClick={useLatestConflict}>Use Latest Saved</button></div></aside>}
    {showToolbar && <div className="inline-text-toolbar" role="toolbar" aria-label={`${kind === "heading" ? "Heading" : "Rich text"} formatting`}>
      {kind === "rich_text" ? <>
        <label><span className="sr-only">Paragraph style</span><select aria-label="Paragraph style" value={editor.isActive("blockquote") ? "quote" : editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "body"} onChange={(event) => { const style = event.currentTarget.value; if (style === "body") editor.chain().focus().setParagraph().run(); else if (style === "quote") editor.chain().focus().setBlockquote().run(); else editor.chain().focus().setHeading({ level: Number(style.slice(1)) as 1 | 2 | 3 }).run(); }}><option value="body">Body</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="quote">Quote</option></select></label>
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton><ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton><ToolbarButton label={editor.isActive("link") ? "Edit or remove link" : "Add link"} active={editor.isActive("link")} disabled={!selectedText && !editor.isActive("link")} onClick={setLink}>Link</ToolbarButton><ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton><ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton><ToolbarButton label="Undo" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton><ToolbarButton label="Redo" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
      </> : <label><span className="sr-only">Heading level</span><select aria-label="Heading level" value={headingLevel} onChange={(event) => { const next = event.currentTarget.value as InlineDraft["level"]; setHeadingLevel(next); changedRef.current({ level: next }); }}><option value="h2">H1</option><option value="h3">H2</option><option value="h4">H3</option></select></label>}
      <button className="inline-text-save" type="button" onClick={requestSave} disabled={status === "saving" || status === "saved" || status === "recovery" || status === "conflict"}>{status === "saving" ? "Saving…" : status === "error" ? "Retry Save" : "Save"}</button>
    </div>}
    {kind === "rich_text" && (draftTitle || active) && <input className="inline-rich-title" aria-label="Optional Rich Text title" value={draftTitle} onChange={(event) => { const next = event.currentTarget.value; setDraftTitle(next); changedRef.current({ title: next.trim() }); }} placeholder="Optional title" maxLength={200}/>}
    {kind === "heading" && eyebrow && <span className="inline-heading-eyebrow">{eyebrow}</span>}
    <EditorContent editor={editor}/><div className={`inline-text-status is-${status}`} aria-live="polite">{statusMessage}</div>
  </div>;
}
