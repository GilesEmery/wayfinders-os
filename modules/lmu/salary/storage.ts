import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import type { SalaryResponse } from "./types";

const MODULE_ID = "salary";
export const emptySalaryResponse = (): SalaryResponse => ({ currency: "USD", compensationPeriod: "annual", futureFactors: [], resumeScreen: "introduction" });

export function isSalaryComplete(response: SalaryResponse) {
  return Boolean(response.currency && response.financialFloor && response.financialFloor > 0 && response.fiveYearGoal && response.fiveYearGoal > 0 && response.significantChange && response.advisorRelationship && response.finalizedAt);
}

export function saveSalaryResponse(response: SalaryResponse, complete = false) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID);
  const valid = isSalaryComplete(response);
  const status = complete && valid ? "completed" : existing?.status === "completed" && valid ? "completed" : "in-progress";
  const completedAt = status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined;
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, {
    moduleId: MODULE_ID, status, startedAt: existing?.startedAt ?? new Date().toISOString(), completedAt,
    responses: response as unknown as Record<string, unknown>,
    derivedResults: { currency: response.currency, compensationPeriod: response.compensationPeriod, financialFloor: response.financialFloor, fiveYearGoal: response.fiveYearGoal },
    result: status === "completed" ? { moduleId: MODULE_ID, completedAt, highlights: [`${response.currency} ${response.financialFloor}`, `${response.currency} ${response.fiveYearGoal}`], rankedItems: [], structuredData: { ...response } } : existing?.result,
  });
}

export function completeSalary(response: SalaryResponse) { saveSalaryResponse(response, true); }
