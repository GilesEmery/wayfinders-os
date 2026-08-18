import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import { growthCurriculumById } from "./curriculum";
import type { GrowthCandidate, GrowthResponse } from "./types";
const MODULE_ID = "growth";
export const emptyGrowthResponse = (): GrowthResponse => ({ selectedCandidateIds: [], customCandidates: [], candidateDetails: {}, completedAreas: [], finalTopFiveIds: [], resumeScreen: "introduction" });
export function resolveGrowthCandidates(response: GrowthResponse): GrowthCandidate[] { const candidates: GrowthCandidate[] = []; response.selectedCandidateIds.forEach((id) => { const curriculum = growthCurriculumById.get(id); if (curriculum) candidates.push({ ...curriculum, sourceType: "curriculum", detail: response.candidateDetails[id]?.trim() || undefined }); else { const custom = response.customCandidates.find((item) => item.id === id); if (custom) candidates.push({ ...custom, detail: response.candidateDetails[id]?.trim() || undefined }); } }); return candidates; }
export function saveGrowthResponse(response: GrowthResponse, complete = false) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID); const candidates = resolveGrowthCandidates(response); const final = response.finalTopFiveIds.flatMap((id, order) => { const candidate = candidates.find((item) => item.id === id); return candidate ? [{ ...candidate, order }] : []; });
  const valid = final.length === 5 && Boolean(response.finalizedAt); const status = complete && valid ? "completed" : existing?.status === "completed" && valid ? "completed" : "in-progress";
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, { moduleId: MODULE_ID, status, startedAt: existing?.startedAt ?? new Date().toISOString(), completedAt: status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined, responses: response as unknown as Record<string, unknown>, derivedResults: { topFiveGrowthPriorities: final }, result: status === "completed" ? { moduleId: MODULE_ID, completedAt: existing?.completedAt ?? new Date().toISOString(), highlights: final.map((item) => item.detail || item.displayLabel), rankedItems: final.map((item) => ({ id: item.id, label: item.detail || item.displayLabel, rank: item.order + 1 })), structuredData: { priorities: final } } : existing?.result });
}
export function completeGrowth(response: GrowthResponse) { saveGrowthResponse(response, true); }
