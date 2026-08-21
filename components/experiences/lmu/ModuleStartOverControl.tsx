"use client";

import { useEffect, useRef, useState } from "react";
import { LMUSectionNavigation } from "./LMUSectionNavigation";

interface ModuleStartOverControlProps {
  experienceId: string;
  moduleId: string;
  moduleHref: string;
  onResetComplete?: () => void;
  currentStep?: number;
  totalSteps?: number;
  screen?: string;
  onBack?: () => void;
  onBackToSections?: () => void;
  backLabel?: string;
  redo?: { label: string; title: string; description: string; onConfirm: () => void };
}

const sectionSteps: Record<string, string[]> = {
  "success-stories": ["introduction", "collection", "editor", "top-three-intro", "comparison", "top-three-review"],
  "transferable-skills": ["introduction", "realistic", "social", "conventional", "artistic", "enterprising", "investigative", "patterns", "ranking", "review", "final"],
  teammates: ["introduction", "selection", "confirmation", "writing", "review", "final"],
  supervisor: ["introduction", "selection", "confirmation", "writing", "review", "final"],
  values: ["introduction", "selection", "review", "final"],
  growth: ["introduction", "overview", "professional", "training", "challenge", "board", "prioritize", "review", "final"],
  location: ["introduction", "relocation", "locations", "reasons", "primary", "constraints", "review", "final"],
  "x-factor": ["introduction", "questions", "local-ranking", "collection", "global-ranking", "close-review", "top-eight", "final"],
  salary: ["introduction", "context", "floor", "goal", "range", "realities", "change", "support", "review", "final"],
  "current-motivator-rankings": ["introduction", "review", "ranking", "final-review", "final"],
};

export function ModuleStartOverControl({ currentStep, totalSteps, screen, onBack, onBackToSections, backLabel = "Back", redo, moduleId }: ModuleStartOverControlProps) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const steps = sectionSteps[moduleId] ?? [screen ?? "introduction"];
  const resolvedStep = currentStep ?? Math.max(1, steps.indexOf(screen ?? steps[0]) + 1);
  const resolvedTotal = totalSteps ?? steps.length;

  function closeConfirmation() {
    setConfirming(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function confirmRedo() { redo?.onConfirm(); setConfirming(false); }

  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeConfirmation(); return; }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming]);

  return (
    <>
      <LMUSectionNavigation currentStep={resolvedStep} totalSteps={resolvedTotal} onBack={onBack} onBackToSections={onBackToSections} backLabel={backLabel} onRedo={redo ? () => setConfirming(true) : undefined} redoLabel={redo?.label} redoButtonRef={triggerRef} />
      {confirming && redo && <div className="lmu-redo-dialog-backdrop"><div ref={dialogRef} className="lmu-redo-dialog" role="dialog" aria-modal="true" aria-labelledby={`redo-${moduleId}-title`} aria-describedby={`redo-${moduleId}-description`}><h2 id={`redo-${moduleId}-title`}>{redo.title}</h2><p id={`redo-${moduleId}-description`}>{redo.description}</p><div><button ref={cancelRef} type="button" onClick={closeConfirmation}>Cancel</button><button className="is-destructive" type="button" onClick={confirmRedo}>{redo.label}</button></div></div></div>}
    </>
  );
}
