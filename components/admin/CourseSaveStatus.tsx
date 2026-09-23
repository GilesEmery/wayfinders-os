"use client";

import { useEffect, useRef, useState } from "react";

type SaveState = "saved" | "unsaved" | "saving";

function editableForm(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const form = target.closest("form");
  if (!(form instanceof HTMLFormElement) || !form.closest(".course-builder-workspace")) return null;
  if (form.closest(".course-builder-publish")) return null;
  return form;
}

export function CourseSaveStatus() {
  const [status, setStatus] = useState<SaveState>("saved");
  const [dirtyCount, setDirtyCount] = useState(0);
  const dirtyForms = useRef(new Set<HTMLFormElement>());
  const activeForm = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const sync = () => {
      setDirtyCount(dirtyForms.current.size);
      setStatus(dirtyForms.current.size ? "unsaved" : "saved");
    };
    const onChange = (event: Event) => {
      const form = editableForm(event.target);
      if (!form) return;
      dirtyForms.current.add(form);
      activeForm.current = form;
      sync();
    };
    const onSubmit = (event: Event) => {
      const form = editableForm(event.target);
      if (!form) return;
      activeForm.current = form;
      setStatus("saving");
    };
    const onSaveStatus = (event: Event) => {
      const next = (event as CustomEvent<SaveState>).detail;
      if (["saved", "saving", "unsaved"].includes(next)) setStatus(next);
    };
    document.addEventListener("input", onChange, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("purposeos:save-status", onSaveStatus);
    return () => {
      document.removeEventListener("input", onChange, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("purposeos:save-status", onSaveStatus);
    };
  }, []);

  function saveDraft() {
    const form = activeForm.current && dirtyForms.current.has(activeForm.current)
      ? activeForm.current
      : [...dirtyForms.current].at(-1);
    if (!form || !form.reportValidity()) return;
    setStatus("saving");
    form.requestSubmit();
  }

  function undoChanges() {
    for (const form of dirtyForms.current) form.reset();
    dirtyForms.current.clear();
    activeForm.current = null;
    setDirtyCount(0);
    setStatus("saved");
  }

  const message = status === "saving"
    ? "Saving draft…"
    : status === "unsaved"
      ? `${dirtyCount} unsaved ${dirtyCount === 1 ? "form" : "forms"}`
      : "Draft saved · publishing is separate";

  return <div className="course-builder-draft-controls">
    <small className="course-builder-save-state" aria-live="polite">{message}</small>
    <button type="button" className="course-builder-undo" onClick={undoChanges} disabled={!dirtyCount || status === "saving"}>Undo</button>
    <button type="button" className="course-builder-save" onClick={saveDraft} disabled={!dirtyCount || status === "saving"}>{status === "saving" ? "Saving…" : "Save Draft"}</button>
  </div>;
}
