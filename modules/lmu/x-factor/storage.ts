import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import { xFactorQuestionById } from "./curriculum";
import type { XFactorResponse } from "./types";
const MODULE_ID = "x-factor";
export const emptyXFactorResponse = (): XFactorResponse => ({ responsesByQuestion: {}, questionIndex: 0, localRankingQuestionIndex: 0, localDrafts: {}, localRankings: {}, globalGroups: [], globalRankings: [], globalDrafts: {}, derivedRelationships: [], activeStackHeads: [], eliminatedFromTopFour: [], eliminatedFromTopEight: [], algorithmicTopFour: [], algorithmicTopEight: [], finalTopFour: [], finalTopEight: [], participantInteractions: 0, resumeScreen: "introduction" });
export const allXFactorItems = (response: XFactorResponse) => Object.values(response.responsesByQuestion).flat();
export function saveXFactorResponse(response: XFactorResponse, complete = false) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID); const items = allXFactorItems(response); const byId = new Map(items.map((item) => [item.id, item]));
  const valid = response.finalTopFour.length === 4 && Boolean(response.finalizedAt); const status = complete && valid ? "completed" : existing?.status === "completed" && valid ? "completed" : "in-progress";
  const completedAt = status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined;
  const structured = response.finalTopEight.flatMap((id, index) => { const item = byId.get(id); return item ? [{ ...item, localRank: (response.localRankings[item.questionId]?.indexOf(id) ?? -1) + 1 || undefined, sourceQuestion: xFactorQuestionById.get(item.questionId)?.title, algorithmicGlobalRank: response.algorithmicTopEight.indexOf(id) + 1 || undefined, finalRank: index + 1, originalStack: response.localRankings[item.questionId] ?? [] }] : []; });
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, { moduleId: MODULE_ID, status, startedAt: existing?.startedAt ?? new Date().toISOString(), completedAt, responses: response as unknown as Record<string, unknown>, derivedResults: { algorithmicTopFour: response.algorithmicTopFour, algorithmicTopEight: response.algorithmicTopEight, finalTopFour: response.finalTopFour, finalTopEight: response.finalTopEight, relationships: response.derivedRelationships }, result: status === "completed" ? { moduleId: MODULE_ID, completedAt, highlights: response.finalTopFour.map((id) => byId.get(id)?.label ?? id), rankedItems: response.finalTopFour.map((id, index) => ({ id, label: byId.get(id)?.label ?? id, rank: index + 1 })), structuredData: { xFactors: structured, localRankings: response.localRankings, relationships: response.derivedRelationships } } : existing?.result });
}
export function completeXFactor(response: XFactorResponse) { saveXFactorResponse(response, true); }
