import type { LMUModuleResult, ParticipantModuleProgress } from "./types";
import type { MotivatorRankingResponse } from "@/modules/lmu/current-motivator-rankings/types";
import { motivatorById } from "@/modules/lmu/current-motivator-rankings/curriculum";

export interface LifeMapSectionResult extends LMUModuleResult {
  title: string;
  badgeKey: string;
  complete: boolean;
}

const presentation: Record<string, { title: string; badgeKey: string }> = {
  "success-stories": { title: "Success Stories", badgeKey: "story" },
  "transferable-skills": { title: "Transferable Skills", badgeKey: "skills" },
  teammates: { title: "Teammates", badgeKey: "teammates" },
  supervisor: { title: "Supervisor", badgeKey: "supervisor" },
  values: { title: "Values", badgeKey: "values" },
  growth: { title: "Growth", badgeKey: "growth" },
  location: { title: "Location", badgeKey: "location" },
  "x-factor": { title: "X-Factor", badgeKey: "x-factor" },
  salary: { title: "Salary", badgeKey: "salary" },
  "current-motivator-rankings": { title: "Motivator Rankings", badgeKey: "motivators" },
};

/** Adapts canonical module results for Life Map presentation without copying participant data. */
export function getLifeMapSectionResult(moduleId: string, progress: ParticipantModuleProgress[]): LifeMapSectionResult {
  const source = progress.find((item) => item.moduleId === moduleId);
  const display = presentation[moduleId] ?? { title: moduleId, badgeKey: "story" };
  return { moduleId, title: display.title, badgeKey: display.badgeKey, complete: source?.status === "completed", completedAt: source?.completedAt, summary: source?.result?.summary, highlights: source?.result?.highlights ?? [], rankedItems: source?.result?.rankedItems ?? [], structuredData: source?.result?.structuredData ?? {} };
}

export function getLifeMapResults(progress: ParticipantModuleProgress[], moduleIds: string[]) {
  return moduleIds.map((moduleId) => getLifeMapSectionResult(moduleId, progress));
}

const canonicalLifeMapOrder = ["transferable-skills", "teammates", "supervisor", "values", "growth", "location", "x-factor", "salary"];

export interface OrderedLifeMapSection extends LifeMapSectionResult {
  rowNumber: number;
  priorityRank?: number;
}

/** Success Stories is fixed as the foundation; finalized motivators semantically reorder the remaining eight areas. */
export function getOrderedLifeMapSections(progress: ParticipantModuleProgress[]): OrderedLifeMapSection[] {
  const motivatorProgress = progress.find((item) => item.moduleId === "current-motivator-rankings");
  const response = motivatorProgress?.responses as unknown as MotivatorRankingResponse | undefined;
  const rankingComplete = motivatorProgress?.status === "completed" && response?.orderedMotivatorIds.length === 8;
  const orderedModuleIds = rankingComplete ? response.orderedMotivatorIds.map((id) => motivatorById.get(id)?.sourceModuleId).filter((id): id is string => Boolean(id)) : canonicalLifeMapOrder;
  return ["success-stories", ...orderedModuleIds].map((moduleId, index) => ({ ...getLifeMapSectionResult(moduleId, progress), rowNumber: index + 1, priorityRank: index === 0 || !rankingComplete ? undefined : index }));
}
