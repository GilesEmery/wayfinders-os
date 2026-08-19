"use client";

import { resetModuleProgress } from "@/lib/experiences/lmu/storage";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocalhostTesting } from "./useLocalhostTesting";
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
  backLabel?: string;
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

export function ModuleStartOverControl({ experienceId, moduleId, moduleHref, onResetComplete, currentStep, totalSteps, screen, onBack, backLabel = "Back a Section" }: ModuleStartOverControlProps) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const localhostTesting = useLocalhostTesting();
  const steps = sectionSteps[moduleId] ?? [screen ?? "introduction"];
  const resolvedStep = currentStep ?? Math.max(1, steps.indexOf(screen ?? steps[0]) + 1);
  const resolvedTotal = totalSteps ?? steps.length;

  function startOver() {
    resetModuleProgress(experienceId, moduleId);
    setConfirming(false);
    onResetComplete?.();
    router.replace(moduleHref);
    router.refresh();
  }

  return (
    <>
      <LMUSectionNavigation currentStep={resolvedStep} totalSteps={resolvedTotal} onBack={onBack} backLabel={backLabel} />
      {localhostTesting ? <aside className="module-start-over" aria-label="Temporary section testing controls">
      {/* Temporary development/testing scaffolding; participant-facing reset policy will be decided later. */}
      <p>Development control</p>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)}>Start Over</button>
      ) : (
        <div className="module-start-over-confirm" role="group" aria-labelledby={`reset-${moduleId}-title`}>
          <strong id={`reset-${moduleId}-title`}>Start this section over?</strong>
          <span>This will clear the work saved in this section and return you to the beginning.</span>
          <div><button type="button" onClick={() => setConfirming(false)}>Cancel</button><button type="button" onClick={startOver}>Start Over</button></div>
        </div>
      )}
      </aside> : null}
    </>
  );
}
