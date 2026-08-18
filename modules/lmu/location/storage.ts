import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import { relocationLabel } from "./curriculum";
import type { LocationResponse } from "./types";

const MODULE_ID = "location";

export const emptyLocationResponse = (): LocationResponse => ({
  locations: [0, 1, 2].map((order) => ({ id: `location-${order + 1}`, label: "", prioritizedReasons: [], order })),
  constraints: [],
  resumeScreen: "introduction",
});

export function isLocationComplete(response: LocationResponse) {
  const ordered = [...response.locations].sort((a, b) => a.order - b.order);
  const active = response.relocationOpenness === "stay" ? ordered.slice(0, 1) : ordered.slice(0, 3);
  const validReasons = active.every((location) => location.prioritizedReasons.length > 0 && location.prioritizedReasons.every((reason) => reason.id !== "other" || reason.customLabel?.trim()));
  const branchValid = response.relocationOpenness === "stay"
    ? active.length === 1 && Boolean(response.stayReason?.trim())
    : active.length === 3 && active.some((location) => location.id === response.primaryLocationId);
  return Boolean(response.relocationOpenness && branchValid && active.every((location) => location.label.trim()) && validReasons && response.finalizedAt);
}

export function saveLocationResponse(response: LocationResponse, complete = false) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID);
  const valid = isLocationComplete(response);
  const status = complete && valid ? "completed" : existing?.status === "completed" && valid ? "completed" : "in-progress";
  const orderedLocations = [...response.locations].sort((a, b) => a.order - b.order);
  const activeLocations = response.relocationOpenness === "stay" ? orderedLocations.slice(0, 1) : orderedLocations.slice(0, 3);
  const primaryLocationId = response.relocationOpenness === "stay" ? activeLocations[0]?.id : response.primaryLocationId;
  const resultLocations = [...activeLocations.filter((location) => location.id === primaryLocationId), ...activeLocations.filter((location) => location.id !== primaryLocationId)];
  const completedAt = status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined;
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, {
    moduleId: MODULE_ID,
    status,
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    completedAt,
    responses: response as unknown as Record<string, unknown>,
    derivedResults: { relocationOpenness: response.relocationOpenness, stayReason: response.stayReason, primaryLocationId, locations: activeLocations },
    result: status === "completed" ? {
      moduleId: MODULE_ID,
      completedAt,
      highlights: [relocationLabel(response.relocationOpenness), ...activeLocations.map((location) => location.label)],
      rankedItems: resultLocations.map((location, index) => ({ id: location.id, label: location.label, rank: index + 1 })),
      structuredData: { relocationOpenness: response.relocationOpenness, stayReason: response.stayReason, relocationContext: response.relocationContext, primaryLocationId, locations: activeLocations, constraints: response.constraints, constraintNote: response.constraintNote },
    } : existing?.result,
  });
}

export function completeLocation(response: LocationResponse) { saveLocationResponse(response, true); }
