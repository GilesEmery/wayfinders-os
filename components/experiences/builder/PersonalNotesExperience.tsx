"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { savePersonalCompanionEntryAction } from "@/lib/experiences/builder/companion-actions";
import { personalNoteLocation } from "@/lib/experiences/builder/personal-notes";
import type { ResolvedCompanionModule } from "@/lib/experiences/builder/companion-data";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null };

export function LocalNoteTime({ value }: { value: string }) {
  const label = useMemo(() => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)).replace(",", " ·"), [value]);
  return <time dateTime={value} suppressHydrationWarning>{label}</time>;
}

export function PersonalNotesExperience({ module, route, participantId, location, saved }: { module: ResolvedCompanionModule; route: Route; participantId: string | null; location: string; saved: boolean }) {
  const draftKey = useMemo(() => `purposeos:note-draft:${participantId ?? "participant"}:${route.slug}:${module.module_key}:${route.sectionKey}`, [module.module_key, participantId, route.sectionKey, route.slug]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesSearch, setNotesSearch] = useState("");
  useEffect(() => { if (textareaRef.current) textareaRef.current.value = window.localStorage.getItem(draftKey) ?? ""; }, [draftKey]);
  useEffect(() => { if (saved) { window.localStorage.removeItem(draftKey); if (textareaRef.current) textareaRef.current.value = ""; } }, [draftKey, saved]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (notesOpen && !dialog.open) dialog.showModal();
    if (!notesOpen && dialog.open) dialog.close();
  }, [notesOpen]);
  const visibleNotes = useMemo(() => {
    const query = notesSearch.trim().toLocaleLowerCase();
    if (!query) return module.personal_notes;
    return module.personal_notes.filter((note) => `${personalNoteLocation(note.curriculum_context)} ${note.content}`.toLocaleLowerCase().includes(query));
  }, [module.personal_notes, notesSearch]);
  return <div className="personal-notes-workspace">
    <p className="personal-notes-location">{location}</p>
    <form className="companion-notes" action={savePersonalCompanionEntryAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, module.id, route.cohortId)}>
      <label><span className="sr-only">Write a personal note</span><textarea ref={textareaRef} name="notes" rows={5} required maxLength={30000} onChange={(event) => { const value = event.target.value; if (value) window.localStorage.setItem(draftKey, value); else window.localStorage.removeItem(draftKey); }} placeholder="Write a note about this page..."/></label>
      <button>Save Note</button>
    </form>
    <div className="personal-notes-recent"><h3>Recent Notes</h3>{module.personal_notes.slice(0, 4).map((note) => <button className="personal-notes-preview" type="button" onClick={() => setNotesOpen(true)} key={note.id}><strong>{personalNoteLocation(note.curriculum_context)}</strong><LocalNoteTime value={note.created_at}/><span>{note.content}</span></button>)}{!module.personal_notes.length && <p className="companion-empty">Your saved Course notes will appear here.</p>}<button className="personal-notes-all" type="button" onClick={() => setNotesOpen(true)}>View All Notes</button></div>
    <dialog className="personal-notes-dialog" ref={dialogRef} onCancel={() => setNotesOpen(false)} onClose={() => setNotesOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setNotesOpen(false); }}>
      <div className="personal-notes-dialog-panel">
        <header><div><p>Private Course notebook</p><h2>Personal Notes</h2></div><button type="button" aria-label="Close Personal Notes" onClick={() => setNotesOpen(false)}>×</button></header>
        <label className="personal-notes-dialog-search"><span className="sr-only">Search Personal Notes</span><input type="search" value={notesSearch} onChange={(event) => setNotesSearch(event.target.value)} placeholder="Search notes and Course locations…"/></label>
        <div className="personal-notes-dialog-list">
          {visibleNotes.map((note) => <article key={note.id}><header><strong>{personalNoteLocation(note.curriculum_context)}</strong><LocalNoteTime value={note.created_at}/></header><p>{note.content}</p></article>)}
          {!visibleNotes.length && <div className="personal-notes-dialog-empty"><strong>{notesSearch ? "No matching notes" : "Your notebook is ready"}</strong><p>{notesSearch ? "Try another word or Course location." : "Save a note from any Course page and it will appear here."}</p></div>}
        </div>
      </div>
    </dialog>
  </div>;
}

export function ConfirmDeleteButton({ action }: { action: () => void | Promise<void> }) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm("Delete this note? This cannot be undone.")) event.preventDefault(); }}><button className="personal-note-delete">Delete</button></form>;
}
