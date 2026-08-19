"use client";

import type { LMUExperienceDefinition } from "@/lib/experiences/lmu/types";
import { calculateModuleProgress, getExperienceModules } from "@/lib/experiences/lmu/experience-config";
import { LMU_DEV_UNLOCK_ALL } from "@/lib/experiences/lmu/development";
import { ModuleJourneyItem } from "./ModuleJourneyItem";
import { useLocalhostTesting } from "./useLocalhostTesting";
import { useOriginalProgress } from "./useOriginalProgress";

export function LMUJourney({ experience }: { experience: LMUExperienceDefinition }) {
  const modules = getExperienceModules(experience);
  const localhostTesting = useLocalhostTesting();
  const allowTestingNavigation = LMU_DEV_UNLOCK_ALL || localhostTesting;
  const discoveryModules = modules.filter((module) => module.kind !== "result");
  const resultModule = modules.find((module) => module.kind === "result");
  const storedProgress = useOriginalProgress();
  const progress = calculateModuleProgress(discoveryModules.map((module) => module.id), storedProgress);
  const completedIds = new Set(storedProgress.filter((item) => item.status === "completed").map((item) => item.moduleId));
  const currentIndex = discoveryModules.findIndex((module) => !completedIds.has(module.id));

  return (
    <>
      <div className="plan-heading">
        <div><p className="eyebrow">Your path</p><h2>A framework for discovery</h2></div>
      </div>
      <ol className="module-list">
        {discoveryModules.map((module, index) => {
          const isCompleted = completedIds.has(module.id) && (currentIndex === -1 || index < currentIndex);
          const status = isCompleted ? "completed" : index === currentIndex ? "available" : "locked";
          return <ModuleJourneyItem allowLockedNavigation={allowTestingNavigation} started={storedProgress.some((item) => item.moduleId === module.id)} futureDistance={status === "locked" ? index - currentIndex : undefined} index={index} key={module.id} module={module} status={status} />;
        })}
        {resultModule && <ModuleJourneyItem allowLockedNavigation={allowTestingNavigation} completed={progress.completed} index={10} key={resultModule.id} module={resultModule} status={progress.completed === progress.total ? "available" : "locked"} total={progress.total} />}
      </ol>
      {allowTestingNavigation ? <div className="journey-dev-tools"><span>Local testing · all sections available</span></div> : null}
    </>
  );
}
