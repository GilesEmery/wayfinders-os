import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import { calculateTransferableSkillEvidence, buildTransferableSkillCandidatePool } from "./logic";
import type { TransferableSkillCategoryId, TransferableSkillsResponse, TransferableSkillsScreen } from "./types";

const MODULE_ID = "transferable-skills";

export function emptyTransferableSkillsResponse(storyIds: string[] = []): TransferableSkillsResponse {
  return { storyIds, categorySelections: {}, visitedCategoryIds: [], evidence: [], candidateSkillIds: [], ranking: { rankingVersion: 2, groupAssignments: [], groupRankings: [], draftGroupRankings: {}, currentPhase: "initial", groupPhaseComplete: false, topCandidates: [], middleCandidates: [], bottomCandidates: [], participantInteractions: 0, explicitHeadToHeadComparisons: [], explicitComparisons: [], derivedRelationships: [], topFiveContenders: [], topTenContenders: [], eliminatedFromTopFive: [], eliminatedFromTopTen: [], provisionalTopTen: [], algorithmicTopFive: [], algorithmicTopTen: [], clarificationComparisons: [], finalTopFive: [], finalTopTen: [] }, finalTopFiveSkillIds: [], resumeScreen: "introduction" };
}

export function readTransferableSkillsResponse(storyIds: string[] = []) {
  const stored = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID)?.responses as unknown as TransferableSkillsResponse | undefined;
  if (!stored || stored.storyIds.join("|") !== storyIds.join("|")) return emptyTransferableSkillsResponse(storyIds);
  if (stored.ranking?.rankingVersion !== 2) return { ...stored, ranking: emptyTransferableSkillsResponse().ranking, finalTopFiveSkillIds: [], finalizedAt: undefined, resumeScreen: "patterns" as const };
  const legacyRanking = stored.ranking as unknown as { comparisons?: TransferableSkillsResponse["ranking"]["explicitComparisons"]; algorithmicRanking?: string[]; finalRanking?: string[] };
  return { ...emptyTransferableSkillsResponse(storyIds), ...stored, ranking: {
    ...emptyTransferableSkillsResponse().ranking,
    ...stored.ranking,
    explicitComparisons: stored.ranking?.explicitComparisons ?? legacyRanking.comparisons ?? [],
    algorithmicTopTen: stored.ranking?.algorithmicTopTen ?? legacyRanking.algorithmicRanking?.slice(0, 10) ?? [],
    algorithmicTopFive: stored.ranking?.algorithmicTopFive ?? legacyRanking.algorithmicRanking?.slice(0, 5) ?? [],
    finalTopTen: stored.ranking?.finalTopTen ?? legacyRanking.finalRanking?.slice(0, 10) ?? [],
    finalTopFive: stored.ranking?.finalTopFive ?? legacyRanking.finalRanking?.slice(0, 5) ?? [],
  } };
}

function saveResponse(response: TransferableSkillsResponse, complete = false) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID);
  const canComplete = response.storyIds.length === 3 && response.visitedCategoryIds.length === 6 && response.candidateSkillIds.length >= 5 && response.finalTopFiveSkillIds.length === 5 && Boolean(response.finalizedAt);
  const status = complete && canComplete ? "completed" : existing?.status === "completed" && canComplete ? "completed" : "available";
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, {
    moduleId: MODULE_ID, status, startedAt: existing?.startedAt ?? new Date().toISOString(), completedAt: status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined,
    responses: response as unknown as Record<string, unknown>, derivedResults: {
      finalTopFive: response.finalTopFiveSkillIds,
      finalTopTen: response.ranking.finalTopTen,
      algorithmicTopTen: response.ranking.algorithmicTopTen,
      algorithmicTopFive: response.ranking.algorithmicTopFive,
      evidenceBySkill: response.evidence,
    },
    result: status === "completed" ? { moduleId: MODULE_ID, completedAt: existing?.completedAt ?? new Date().toISOString(), highlights: response.finalTopFiveSkillIds, rankedItems: response.ranking.finalTopTen.map((id, index) => ({ id, label: response.evidence.find((item) => item.canonicalKey === id)?.label ?? id, rank: index + 1 })), structuredData: { evidenceBySkill: response.evidence, algorithmicTopFive: response.ranking.algorithmicTopFive, algorithmicTopTen: response.ranking.algorithmicTopTen } } : existing?.result,
  });
}

export function saveTransferableSkillsResponse(response: TransferableSkillsResponse) { saveResponse(response); }

export function saveCategorySelections(response: TransferableSkillsResponse, categoryId: TransferableSkillCategoryId, selections: Record<string, string[]>) {
  const visitedCategoryIds = response.visitedCategoryIds.includes(categoryId) ? response.visitedCategoryIds : [...response.visitedCategoryIds, categoryId];
  saveResponse({ ...response, categorySelections: { ...response.categorySelections, [categoryId]: selections }, visitedCategoryIds, resumeScreen: categoryId });
}

export function generateCandidatePool(response: TransferableSkillsResponse) {
  const evidence = calculateTransferableSkillEvidence(response.storyIds, response.categorySelections);
  const candidateSkillIds = buildTransferableSkillCandidatePool(evidence);
  const next = { ...response, evidence, candidateSkillIds, ranking: emptyTransferableSkillsResponse().ranking, finalTopFiveSkillIds: [], finalizedAt: undefined, resumeScreen: "patterns" as const };
  saveResponse(next);
  return next;
}

export function saveTransferableSkillsScreen(response: TransferableSkillsResponse, resumeScreen: TransferableSkillsScreen) { saveResponse({ ...response, resumeScreen }); }
export function finalizeTransferableSkills(response: TransferableSkillsResponse, finalRanking: string[]) {
  const finalTopTen = finalRanking.slice(0, 10);
  const finalTopFive = finalTopTen.slice(0, 5);
  const next = { ...response, ranking: { ...response.ranking, finalTopTen, finalTopFive }, finalTopFiveSkillIds: finalTopFive, finalizedAt: new Date().toISOString(), resumeScreen: "final" as const };
  saveResponse(next);
  return next;
}
export function completeTransferableSkills(response: TransferableSkillsResponse) { saveResponse(response, true); }
