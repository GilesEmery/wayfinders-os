import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import { emptyTeammatesResponse } from "../teammates/storage";
import type { SupervisorResponse } from "./types";
const MODULE_ID = "supervisor";
export const emptySupervisorResponse = (): SupervisorResponse => emptyTeammatesResponse();
export function readSupervisorResponse(): SupervisorResponse { const stored = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID)?.responses as unknown as Partial<SupervisorResponse> | undefined; return { ...emptySupervisorResponse(), ...stored }; }
export function saveSupervisorResponse(response: SupervisorResponse, complete = false) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID);
  const valid = response.selectedPainPoints.length === 5 && response.finalizedAttributeIds.length === 5 && Boolean(response.finalizedAt);
  const status = complete && valid ? "completed" : existing?.status === "completed" && valid ? "completed" : "in-progress";
  const ordered = response.finalizedAttributeIds.flatMap((id) => { const attribute = response.attributes.find((item) => item.id === id); return attribute ? [attribute] : []; });
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, { moduleId: MODULE_ID, status, startedAt: existing?.startedAt ?? new Date().toISOString(), completedAt: status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined, responses: response as unknown as Record<string, unknown>, derivedResults: { topFiveSupervisorAttributes: ordered, finalizedAttributeIds: response.finalizedAttributeIds }, result: status === "completed" ? { moduleId: MODULE_ID, completedAt: existing?.completedAt ?? new Date().toISOString(), highlights: ordered.map((item) => item.positiveAttribute), rankedItems: ordered.map((item, index) => ({ id: item.id, label: item.positiveAttribute, rank: index + 1 })), structuredData: { attributes: ordered } } : existing?.result });
}
export function completeSupervisor(response: SupervisorResponse) { saveSupervisorResponse(response, true); }
