"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { safeExternalUrl } from "@/lib/experiences/builder/media-source";

type SaveResult = { ok: true } | { ok: false; error: string };
type SaveAction = (form: FormData) => Promise<SaveResult>;

type Props = {
  blockId: string;
  kind: "heading" | "rich_text";
  text: string;
  title?: string;
  level?: "h2" | "h3" | "h4";
  alignment?: "left" | "center";
  eyebrow?: string;
  requirementLevel: string;
  visibility: string;
  saveAction: SaveAction;
};

type Draft = { text: string; title: string; level: "h2" | "h3" | "h4" };
const AUTOSAVE_MS = 1400;

function announce(status: "saved" | "saving" | "unsaved") {
  window.dispatchEvent(new CustomEvent("purposeos:save-status", { detail: status }));
}

function ToolbarButton({ active = false, disabled = false, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{children}</button>;
}

export function InlineTextBlockEditor({ blockId, kind, text, title = "", level = "h2", alignment = "left", eyebrow = "", requirementLevel, visibility, saveAction }: Props) {
  const storageKey = `purposeos:inline-draft:${blockId}`;
  const [draftTitle, setDraftTitle] = useState(title);
  const [headingLevel, setHeadingLevel] = useState(level);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [pending, startTransition] = useTransition();
  const lastSaved = useRef(JSON.stringify({ text, title, level } satisfies Draft));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    content: text || (kind === "heading" ? "New heading" : "Add your content here."),
    contentType: "markdown",
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: {
          autolink: false,
          linkOnPaste: true,
          markdownLinks: true,
          openOnClick: false,
          defaultProtocol: "https",
          isAllowedUri: (url) => Boolean(safeExternalUrl(url)),
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Markdown,
    ],
    editorProps: {
      attributes: {
        class: `inline-text-surface is-${kind}`,
        "aria-label": kind === "heading" ? "Heading text" : "Rich text content",
      },
    },
    onFocus: () => setActive(true),
  });

  const currentDraft = useCallback((): Draft => ({
    text: kind === "heading" ? (editor?.getText() ?? "").trim() : (editor?.getMarkdown() ?? "").trim(),
    title: kind === "rich_text" ? draftTitle.trim() : "",
    level: headingLevel,
  }), [draftTitle, editor, headingLevel, kind]);

  const save = useCallback(() => {
    if (!editor || pending) return;
    const draft = currentDraft();
    const serialized = JSON.stringify(draft);
    if (!draft.text || serialized === lastSaved.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("saving");
    setError("");
    announce("saving");
    const form = new FormData();
    form.set("requirement_level", requirementLevel);
    form.set("visibility", visibility);
    if (kind === "heading") {
      form.set("text", draft.text);
      form.set("level", draft.level);
      form.set("alignment", alignment);
      form.set("eyebrow", eyebrow);
    } else {
      form.set("title", draft.title);
      form.set("text", draft.text);
    }
    startTransition(async () => {
      const result = await saveAction(form);
      if (result.ok) {
        lastSaved.current = serialized;
        localStorage.removeItem(storageKey);
        setStatus("saved");
        announce("saved");
      } else {
        setStatus("error");
        setError(result.error);
        announce("unsaved");
      }
    });
  }, [alignment, currentDraft, editor, eyebrow, kind, pending, requirementLevel, saveAction, storageKey, visibility]);

  const changed = useCallback(() => {
    if (!editor || !mounted.current) return;
    const draft = currentDraft();
    const serialized = JSON.stringify(draft);
    localStorage.setItem(storageKey, serialized);
    if (serialized === lastSaved.current) return;
    setStatus("unsaved");
    announce("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, AUTOSAVE_MS);
  }, [currentDraft, editor, save, storageKey]);

  useEffect(() => {
    if (!editor) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const draft = JSON.parse(stored) as Partial<Draft>;
        queueMicrotask(() => {
          if (typeof draft.text === "string" && draft.text) editor.commands.setContent(draft.text, { contentType: "markdown", emitUpdate: false });
          if (kind === "rich_text" && typeof draft.title === "string") setDraftTitle(draft.title);
          if (kind === "heading" && ["h2", "h3", "h4"].includes(String(draft.level))) setHeadingLevel(draft.level as Draft["level"]);
          setStatus("unsaved");
        });
      } catch { localStorage.removeItem(storageKey); }
    }
    mounted.current = true;
    editor.on("update", changed);
    return () => { mounted.current = false; editor.off("update", changed); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [changed, editor, kind, storageKey]);

  useEffect(() => { if (mounted.current) changed(); }, [changed, draftTitle, headingLevel]);

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

  return <div className={`inline-text-editor is-${kind} is-${headingLevel} is-align-${alignment}${showToolbar ? " is-active" : ""}`} onFocus={() => setActive(true)} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setActive(false); if (status === "unsaved") save(); }
  }}>
    {showToolbar && <div className="inline-text-toolbar" role="toolbar" aria-label={`${kind === "heading" ? "Heading" : "Rich text"} formatting`}>
      {kind === "rich_text" ? <>
        <label><span className="sr-only">Paragraph style</span><select aria-label="Paragraph style" value={editor.isActive("blockquote") ? "quote" : editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "body"} onChange={(event) => {
          const style = event.currentTarget.value;
          if (style === "body") editor.chain().focus().setParagraph().run();
          else if (style === "quote") editor.chain().focus().setBlockquote().run();
          else editor.chain().focus().setHeading({ level: Number(style.slice(1)) as 1 | 2 | 3 }).run();
        }}><option value="body">Body</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="quote">Quote</option></select></label>
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
        <ToolbarButton label={editor.isActive("link") ? "Edit or remove link" : "Add link"} active={editor.isActive("link")} disabled={!selectedText && !editor.isActive("link")} onClick={setLink}>Link</ToolbarButton>
        <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
        <ToolbarButton label="Undo" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
      </> : <label><span className="sr-only">Heading level</span><select aria-label="Heading level" value={headingLevel} onChange={(event) => setHeadingLevel(event.currentTarget.value as Draft["level"])}><option value="h2">H1</option><option value="h3">H2</option><option value="h4">H3</option></select></label>}
      <button className="inline-text-save" type="button" onClick={save} disabled={pending || status === "saved"}>{pending || status === "saving" ? "Saving…" : "Save"}</button>
    </div>}
    {kind === "rich_text" && (draftTitle || active) && <input className="inline-rich-title" aria-label="Optional Rich Text title" value={draftTitle} onChange={(event) => setDraftTitle(event.currentTarget.value)} placeholder="Optional title" maxLength={200}/>} 
    {kind === "heading" && eyebrow && <span className="inline-heading-eyebrow">{eyebrow}</span>}
    <EditorContent editor={editor}/>
    <div className={`inline-text-status is-${status}`} aria-live="polite">{status === "saved" ? "Saved" : status === "saving" || pending ? "Saving…" : status === "error" ? error : "Unsaved changes"}</div>
  </div>;
}
