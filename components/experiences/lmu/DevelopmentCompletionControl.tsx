"use client";

import { originalDiscoveryModules, LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { removeModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import { useOriginalProgress } from "./useOriginalProgress";

export function DevelopmentCompletionControl({ moduleId }: { moduleId: string }) {
  const progress = useOriginalProgress();
  const checked = progress.some((item) => item.moduleId === moduleId && item.status === "completed");

  function setCompleted(nextChecked: boolean) {
    if (nextChecked) {
      saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, {
        moduleId, status: "completed", completedAt: new Date().toISOString(), responses: {}, derivedResults: {},
      });
      return;
    }
    const moduleIndex = originalDiscoveryModules.findIndex((module) => module.id === moduleId);
    originalDiscoveryModules.slice(moduleIndex).forEach((module) => removeModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, module.id));
  }

  return (
    <label className="development-completion-control">
      {/* Temporary development scaffolding. Actual module completion logic will replace this control. */}
      <input type="checkbox" checked={checked} onChange={(event) => setCompleted(event.target.checked)} />
      <span><strong>Mark this section complete</strong><small>Temporary development control</small></span>
    </label>
  );
}
