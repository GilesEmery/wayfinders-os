"use client";
import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { safeRichTextLink } from "@/lib/experiences/builder/course-links";
import { CourseTextSize } from "@/lib/experiences/builder/course-text-size";
import { CourseIndent } from "@/lib/experiences/builder/course-indent";
import { readBlockPresentation } from "@/lib/experiences/builder/block-presentation";

function TextField({ name, label, initial, size }: { name: string; label: string; initial: string; size: string }) {
  const [text, setText] = useState(initial);
  const [textSize, setTextSize] = useState(size);
  const selection = useRef<{ from: number; to: number } | null>(null);
  const editor = useEditor({ immediatelyRender: false, extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, code: false, codeBlock: false, horizontalRule: false, link: { openOnClick: false, autolink: false, isAllowedUri: url => Boolean(safeRichTextLink(url)) } }), CourseIndent, CourseTextSize, Markdown], content: initial, contentType: "markdown", editorProps: { attributes: { "aria-label": label, role: "textbox", "aria-multiline": "true" } }, onSelectionUpdate: ({ editor }) => { if (editor.isFocused) selection.current = { from: editor.state.selection.from, to: editor.state.selection.to }; setTextSize(editor.getAttributes("courseTextSize").size ?? size); }, onUpdate: ({ editor }) => { setText(editor.getMarkdown()); editor.view.dom.dispatchEvent(new Event("change", { bubbles: true })); } });
  const captureSelection = () => {
    if (editor) selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
  };
  return <fieldset className={`course-item-text-field is-${size}`}><legend>{label}</legend><input type="hidden" name={name} value={text}/><input type="hidden" name={`${name}_initial`} value={initial}/><input type="hidden" name={`${name}_size`} value={size}/><label>Selected text size<select aria-label={`${label} selected text size`} onPointerDown={captureSelection} onFocus={captureSelection} value={textSize} onChange={event => { const next = event.target.value; const savedSelection = selection.current; const chain = editor?.chain(); if (!chain) return; if (savedSelection) chain.setTextSelection(savedSelection); chain.focus().setMark("courseTextSize", { size: next }).run(); setTextSize(next); }}>{["h1", "h2", "h3", "h4"].map(level => <option key={level} value={level}>{level.toUpperCase()}{level === "h4" ? " · Normal text" : ""}</option>)}</select></label>{editor && <><div className="inline-text-toolbar" role="toolbar" aria-label={`${label} formatting`}>{[
    { label: "Bold", run: () => editor.chain().focus().toggleBold().run() },
    { label: "Link", run: () => { const url = window.prompt("Link URL (leave blank to remove)", String(editor.getAttributes("link").href ?? "")); if (url === null) return; if (!url.trim()) { editor.chain().focus().unsetLink().run(); return; } const safe = safeRichTextLink(url); if (safe) editor.chain().focus().setLink({ href: safe }).run(); } },
    { label: "Italic", run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Bullets", run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbers", run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Indent", run: () => editor.isActive("listItem") ? editor.chain().focus().sinkListItem("listItem").run() : editor.chain().focus().wrapIn("courseIndent").run() },
    { label: "Outdent", run: () => editor.isActive("listItem") ? editor.chain().focus().liftListItem("listItem").run() : editor.chain().focus().lift("courseIndent").run() },
    { label: "Undo", run: () => editor.chain().focus().undo().run() },
    { label: "Redo", run: () => editor.chain().focus().redo().run() },
  ].map(button => <button type="button" key={button.label} onMouseDown={event => event.preventDefault()} onClick={button.run}>{button.label}</button>)}</div><div className="inline-text-surface"><EditorContent editor={editor}/></div></>}</fieldset>;
}
export function BlockPresentationFields({ settings, header, body }: { settings: unknown; header: string; body: string }) {
  const p = readBlockPresentation(settings);
  return <details className="course-item-text-fields"><summary>Header, main text & placement</summary><p>Leave either text area blank to hide it. Sizes are independent.</p><TextField name="presentation_header" label="Optional header" initial={p?.header ?? header} size={p?.headerSize ?? "h3"}/><TextField name="presentation_body" label="Main text" initial={p?.body ?? body} size={p?.bodySize ?? "h4"}/><label>Media / item position<select name="presentation_placement" defaultValue={p?.placement ?? "below"}><option value="above">Above header and text</option><option value="between">Between header and text</option><option value="below">Below header and text</option></select></label></details>;
}
