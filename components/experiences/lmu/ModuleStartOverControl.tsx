"use client";

import { resetModuleProgress } from "@/lib/experiences/lmu/storage";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ModuleStartOverControlProps {
  experienceId: string;
  moduleId: string;
  moduleHref: string;
  onResetComplete?: () => void;
}

export function ModuleStartOverControl({ experienceId, moduleId, moduleHref, onResetComplete }: ModuleStartOverControlProps) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function startOver() {
    resetModuleProgress(experienceId, moduleId);
    setConfirming(false);
    onResetComplete?.();
    router.replace(moduleHref);
    router.refresh();
  }

  return (
    <aside className="module-start-over" aria-label="Temporary section testing controls">
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
    </aside>
  );
}
