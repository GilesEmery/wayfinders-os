import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import type { TeammatesResponse } from "./types";

const MODULE_ID = "teammates";
export const emptyTeammatesResponse = (): TeammatesResponse => ({ selectedPainPoints: [], customPainPoints: [], attributes: [], finalizedAttributeIds: [], resumeScreen: "introduction", writingIndex: 0 });

export function readTeammatesResponse(): TeammatesResponse {
  const stored = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID)?.responses as unknown as Partial<TeammatesResponse> | undefined;
  return { ...emptyTeammatesResponse(), ...stored };
}

export function saveTeammatesResponse(response: TeammatesResponse, complete = false) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID);
  const valid = response.selectedPainPoints.length === 5 && response.finalizedAttributeIds.length === 5 && Boolean(response.finalizedAt);
  const status = complete && valid ? "completed" : existing?.status === "completed" && valid ? "completed" : "in-progress";
  const ordered = response.finalizedAttributeIds.flatMap((id) => { const attribute = response.attributes.find((item) => item.id === id); return attribute ? [attribute] : []; });
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, { moduleId: MODULE_ID, status, startedAt: existing?.startedAt ?? new Date().toISOString(), completedAt: status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined, responses: response as unknown as Record<string, unknown>, derivedResults: { topFiveTeammateAttributes: ordered, finalizedAttributeIds: response.finalizedAttributeIds }, result: status === "completed" ? { moduleId: MODULE_ID, completedAt: existing?.completedAt ?? new Date().toISOString(), highlights: ordered.map((item) => item.positiveAttribute), rankedItems: ordered.map((item, index) => ({ id: item.id, label: item.positiveAttribute, rank: index + 1 })), structuredData: { attributes: ordered } } : existing?.result });
}

export function completeTeammates(response: TeammatesResponse) { saveTeammatesResponse(response, true); }
