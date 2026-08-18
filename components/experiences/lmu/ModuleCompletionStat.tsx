"use client";

import { calculateModuleProgress } from "@/lib/experiences/lmu/experience-config";
import { getProgressSnapshot, subscribeToProgress } from "@/lib/experiences/lmu/storage";
import type { ParticipantModuleProgress } from "@/lib/experiences/lmu/types";
import { useSyncExternalStore } from "react";

interface ModuleCompletionStatProps {
  experienceId: string;
  moduleIds: string[];
}

export function ModuleCompletionStat({ experienceId, moduleIds }: ModuleCompletionStatProps) {
  const snapshot = useSyncExternalStore(
    subscribeToProgress,
    () => getProgressSnapshot(experienceId),
    () => "",
  );
  const storedProgress = (snapshot ? JSON.parse(snapshot) : []) as ParticipantModuleProgress[];
  const progress = calculateModuleProgress(moduleIds, storedProgress);

  return <dd className="experience-completed-count">{progress.completed}</dd>;
}
