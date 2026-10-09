"use client";

import { useEffect, useRef, useState } from "react";
import { aggregateInlineSaveState, type InlineSaveState } from "@/lib/experiences/admin/inline-draft";

type Aggregate = { dirty: number; saving: number };

function editableForm(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const form = target.closest("form");
  if (!(form instanceof HTMLFormElement) || !form.closest(".course-builder-workspace")) return null;
  if (form.closest(".course-builder-publish")) return null;
  return form;
}

export function CourseSaveStatus({ serverReceipt }: { serverReceipt: { error?: string; saved?: string } }) {
  const [aggregate, setAggregate] = useState<Aggregate>({ dirty: 0, saving: 0 });
  const dirtyForms = useRef(new Set<HTMLFormElement>());
  const activeForm = useRef<HTMLFormElement | null>(null);
  const inlineStates = useRef(new Map<string, InlineSaveState>());
  const formSaving = useRef(false);
  const submittedForm = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    // A fresh server payload acknowledges the mutation, even when its URL
    // and success message are identical to the previous deletion.
    formSaving.current = false;
    if (!serverReceipt.error && submittedForm.current) dirtyForms.current.delete(submittedForm.current);
    submittedForm.current = null;
    for (const form of dirtyForms.current) {
      if (!form.isConnected) dirtyForms.current.delete(form);
    }
    window.dispatchEvent(new Event("purposeos:form-save-complete"));
  }, [serverReceipt]);

  useEffect(() => {
    const sync = () => {
      const next = aggregateInlineSaveState(dirtyForms.current.size, inlineStates.current.values());
      setAggregate({ dirty: next.dirty, saving: next.saving + (formSaving.current ? 1 : 0) });
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
      submittedForm.current = form;
      formSaving.current = true;
      sync();
    };
    const onSaveStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; status?: InlineSaveState | "removed"; source?: string }>).detail;
      if (!detail || detail.source !== "inline" || !detail.id || !detail.status) return;
      if (detail.status === "removed") inlineStates.current.delete(detail.id);
      else inlineStates.current.set(detail.id, detail.status);
      sync();
    };
    const hasUnsaved = () => aggregateInlineSaveState(dirtyForms.current.size, inlineStates.current.values()).dirty > 0 || formSaving.current;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsaved()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const protectNavigation = (event: MouseEvent) => {
      if (!hasUnsaved() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.origin !== window.location.origin) return;
      if (!window.confirm("You have unsaved course changes. Leave this page and keep the browser drafts for later recovery?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("input", onChange, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", protectNavigation, true);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("purposeos:save-status", onSaveStatus);
    window.addEventListener("purposeos:form-save-complete", sync);
    window.dispatchEvent(new Event("purposeos:request-save-status"));
    return () => {
      document.removeEventListener("input", onChange, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", protectNavigation, true);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("purposeos:save-status", onSaveStatus);
      window.removeEventListener("purposeos:form-save-complete", sync);
    };
  }, []);

  function saveDraft() {
    window.dispatchEvent(new Event("purposeos:save-all"));
    const form = activeForm.current && dirtyForms.current.has(activeForm.current) ? activeForm.current : [...dirtyForms.current].at(-1);
    if (!form || !form.reportValidity()) return;
    form.requestSubmit();
  }

  function undoChanges() {
    if (!window.confirm("Discard all unsaved form changes and inline browser drafts on this page?")) return;
    for (const form of dirtyForms.current) form.reset();
    dirtyForms.current.clear();
    activeForm.current = null;
    formSaving.current = false;
    window.dispatchEvent(new Event("purposeos:discard-all"));
    setAggregate(aggregateInlineSaveState(0, inlineStates.current.values()));
  }

  const message = aggregate.saving
    ? `Saving ${aggregate.saving} ${aggregate.saving === 1 ? "change" : "changes"}…`
    : aggregate.dirty
      ? `${aggregate.dirty} unsaved ${aggregate.dirty === 1 ? "item" : "items"}`
      : "Draft saved · publishing is separate";

  return <div className="course-builder-draft-controls">
    <small className="course-builder-save-state" aria-live="polite">{message}</small>
    <button type="button" className="course-builder-undo" onClick={undoChanges} disabled={!aggregate.dirty || Boolean(aggregate.saving)}>Undo</button>
    <button type="button" className="course-builder-save" onClick={saveDraft} disabled={!aggregate.dirty || Boolean(aggregate.saving)}>{aggregate.saving ? "Saving…" : "Save Draft"}</button>
  </div>;
}
