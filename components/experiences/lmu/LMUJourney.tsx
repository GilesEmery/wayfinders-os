"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LMUExperienceDefinition, ParticipantModuleProgress } from "@/lib/experiences/lmu/types";
import { calculateModuleProgress, getExperienceModules } from "@/lib/experiences/lmu/experience-config";
import { LMU_DEV_UNLOCK_ALL } from "@/lib/experiences/lmu/development";
import { ModuleJourneyItem } from "./ModuleJourneyItem";
import { useLocalhostTesting } from "./useLocalhostTesting";
import { useOriginalProgress } from "./useOriginalProgress";
import { removeModuleProgress } from "@/lib/experiences/lmu/storage";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";

const motivatorSourceIds = new Set(["transferable-skills", "teammates", "supervisor", "values", "growth", "location", "x-factor", "salary"]);

function sectionRedoConsequences(moduleId: string, title: string) {
  if (moduleId === "success-stories") return { title: "Redo Success Stories?", description: "This will erase the Success Stories work in this module. Because your Top 3 Stories, Transferable Skills, and Motivator Ranking depend on these stories, those results will also be cleared and will need to be completed again. Your work in unrelated Life Mapping U modules will not be affected.", resetIds: [moduleId, "transferable-skills", "current-motivator-rankings"] };
  if (moduleId === "transferable-skills") return { title: "Redo Transferable Skills?", description: "This will erase all of your Transferable Skills work. Because your Motivator Ranking uses these results, that ranking will also be cleared and will need to be completed again. Your Success Stories, Top 3, and unrelated Life Mapping U modules will remain.", resetIds: [moduleId, "current-motivator-rankings"] };
  if (motivatorSourceIds.has(moduleId)) return { title: `Redo ${title}?`, description: `This will erase the choices you made in ${title}. Because your Motivator Ranking uses these results, that ranking will also be cleared and will need to be completed again. Your work in unrelated Life Mapping U modules will not be affected.`, resetIds: [moduleId, "current-motivator-rankings"] };
  return { title: "Redo this module?", description: "This will erase the choices you made in this module, and you will need to complete it again. Your work in the other Life Mapping U modules will not be affected.", resetIds: [moduleId] };
}

function hasParticipantWork(progress?: ParticipantModuleProgress) {
  if (!progress) return false;
  if (progress.status === "completed" || progress.result) return true;
  const response = (progress.responses ?? {}) as Record<string, unknown>;
  const hasArray = (key: string) => Array.isArray(response[key]) && response[key].length > 0;
  const hasObjectEntries = (key: string) => Boolean(response[key] && typeof response[key] === "object" && Object.keys(response[key] as object).length);
  if (progress.moduleId === "success-stories") return hasArray("stories") || Boolean(response.draft) || Boolean(response.topThreeSelection);
  if (progress.moduleId === "transferable-skills") return hasObjectEntries("categorySelections") || hasArray("visitedCategoryIds") || hasArray("candidateSkillIds");
  if (progress.moduleId === "teammates" || progress.moduleId === "supervisor") return hasArray("selectedPainPoints") || hasArray("customPainPoints") || hasArray("attributes");
  if (progress.moduleId === "values") return hasArray("pathwayUValues") || hasArray("selectedValueIds");
  if (progress.moduleId === "growth") return hasArray("selectedCandidateIds") || hasArray("customCandidates") || hasObjectEntries("candidateDetails") || hasArray("completedAreas");
  if (progress.moduleId === "location") return Boolean(response.relocationOpenness) || hasArray("constraints") || Boolean(response.stayReason) || Boolean(response.relocationContext);
  if (progress.moduleId === "x-factor") return hasObjectEntries("responsesByQuestion") || hasObjectEntries("localRankings") || hasArray("globalRankings");
  if (progress.moduleId === "salary") return response.financialFloor !== undefined || response.fiveYearGoal !== undefined || hasArray("futureFactors") || Boolean(response.significantChange) || Boolean(response.advisorRelationship);
  if (progress.moduleId === "current-motivator-rankings") return hasArray("orderedMotivatorIds") || Boolean(response.topPriorityReflection) || Boolean(response.finalizedAt);
  return false;
}

export function LMUJourney({ experience }: { experience: LMUExperienceDefinition }) {
  const modules = getExperienceModules(experience);
  const localhostTesting = useLocalhostTesting();
  const allowTestingNavigation = LMU_DEV_UNLOCK_ALL || localhostTesting;
  const discoveryModules = modules.filter((module) => module.kind !== "result");
  const resultModule = modules.find((module) => module.kind === "result");
  const storedProgress = useOriginalProgress();
  const router = useRouter();
  const [redoModuleId, setRedoModuleId] = useState<string | null>(null);
  const redoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const progress = calculateModuleProgress(discoveryModules.map((module) => module.id), storedProgress);
  const completedIds = new Set(storedProgress.filter((item) => item.status === "completed").map((item) => item.moduleId));
  const currentIndex = discoveryModules.findIndex((module) => !completedIds.has(module.id));
  const redoModule = discoveryModules.find((module) => module.id === redoModuleId);
  const redoConsequences = redoModule ? sectionRedoConsequences(redoModule.id, redoModule.title) : undefined;

  function requestRedo(moduleId: string) { redoTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null; setRedoModuleId(moduleId); }
  function cancelRedo() { setRedoModuleId(null); window.requestAnimationFrame(() => redoTriggerRef.current?.focus()); }
  function confirmRedo() {
    if (!redoModule || !redoConsequences) return;
    redoConsequences.resetIds.forEach((moduleId) => removeModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, moduleId));
    setRedoModuleId(null);
    router.push(`/experiences/life-mapping-u/module/${redoModule.slug}`);
  }

  useEffect(() => {
    if (!redoModuleId) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); cancelRedo(); return; }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [redoModuleId]);

  return (
    <>
      <div className="plan-heading">
        <div><p className="eyebrow">Your path</p><h2>A framework for discovery</h2></div>
      </div>
      <ol className="module-list">
        {discoveryModules.map((module, index) => {
          const isCompleted = completedIds.has(module.id) && (currentIndex === -1 || index < currentIndex);
          const status = isCompleted ? "completed" : index === currentIndex ? "available" : "locked";
          const started = hasParticipantWork(storedProgress.find((item) => item.moduleId === module.id));
          return <ModuleJourneyItem allowLockedNavigation={allowTestingNavigation} started={started} onRedo={started ? () => requestRedo(module.id) : undefined} futureDistance={status === "locked" ? index - currentIndex : undefined} index={index} key={module.id} module={module} status={status} />;
        })}
        {resultModule && <ModuleJourneyItem allowLockedNavigation={allowTestingNavigation} completed={progress.completed} index={10} key={resultModule.id} module={resultModule} status={progress.completed === progress.total ? "available" : "locked"} total={progress.total} />}
      </ol>
      {allowTestingNavigation ? <div className="journey-dev-tools"><span>Local testing · all modules available</span></div> : null}
      {redoModule && redoConsequences && <div className="lmu-redo-dialog-backdrop"><div ref={dialogRef} className="lmu-redo-dialog" role="dialog" aria-modal="true" aria-labelledby="redo-section-title" aria-describedby="redo-section-description"><h2 id="redo-section-title">{redoConsequences.title}</h2><p id="redo-section-description">{redoConsequences.description}</p><div><button ref={cancelRef} type="button" onClick={cancelRedo}>Cancel</button><button className="is-destructive" type="button" onClick={confirmRedo}>Redo Module</button></div></div></div>}
    </>
  );
}
