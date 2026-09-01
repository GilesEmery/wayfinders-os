import { LMU_SECTION_KEYS, type LMUSectionKey } from "./server/constants";

export const LMU_REQUIRED_SECTION_COUNT = LMU_SECTION_KEYS.length;

export const LMU_SECTION_LABELS: Record<LMUSectionKey, string> = {
  success_stories: "Success Stories",
  transferable_skills: "Transferable Skills",
  teammates: "Teammates",
  supervisor: "Supervisor",
  values: "Values",
  growth: "Growth",
  location: "Location",
  x_factor: "X-Factor",
  salary: "Salary",
  motivator_rankings: "Motivator Rankings",
};

export function completedSectionCount(rows: Array<{ section_key: string; status: string }>) {
  const completed = new Set(rows.filter((row) => row.status === "completed").map((row) => row.section_key));
  return LMU_SECTION_KEYS.filter((key) => completed.has(key)).length;
}

export function assessmentProgress(status: string, completedCount: number) {
  if (status === "completed") return 100;
  return Math.round((Math.min(completedCount, LMU_REQUIRED_SECTION_COUNT) / LMU_REQUIRED_SECTION_COUNT) * 100);
}
