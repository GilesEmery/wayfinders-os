import type { ParticipantModuleProgress } from "./types";

const MODULE_TO_SECTION: Record<string, string> = {
  "success-stories": "success_stories",
  "transferable-skills": "transferable_skills",
  teammates: "teammates",
  supervisor: "supervisor",
  values: "values",
  growth: "growth",
  location: "location",
  "x-factor": "x_factor",
  salary: "salary",
  "current-motivator-rankings": "motivator_rankings",
};

export const SECTION_TO_MODULE = Object.fromEntries(Object.entries(MODULE_TO_SECTION).map(([moduleId, sectionKey]) => [sectionKey, moduleId]));
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

function sectionKeyFor(moduleId: string) {
  return MODULE_TO_SECTION[moduleId];
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, credentials: "same-origin", headers: { "content-type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`LMU persistence request failed (${response.status}).`);
  return response.json() as Promise<unknown>;
}

export async function loadServerAssessment() {
  const response = await fetch("/api/lmu/assessment", { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Unable to restore LMU assessment (${response.status}).`);
  return response.json() as Promise<ServerAssessment>;
}

export function scheduleSectionSave(progress: ParticipantModuleProgress): Promise<boolean> {
  const sectionKey = sectionKeyFor(progress.moduleId);
  if (!sectionKey) return Promise.resolve(true);
  const existing = pendingSaves.get(sectionKey);
  if (existing) clearTimeout(existing);

  if (progress.status === "completed" && progress.result) {
    pendingSaves.delete(sectionKey);
    return request(`/api/lmu/sections/${sectionKey}/finalize`, {
      method: "POST",
      body: JSON.stringify({ responseData: progress.responses, resultData: { result: progress.result, derivedResults: progress.derivedResults } }),
    }).then((result) => sectionKey !== "motivator_rankings" || Boolean((result as { assessmentCompleted?: boolean }).assessmentCompleted)).catch(() => false);
  }

  pendingSaves.set(sectionKey, setTimeout(() => {
    pendingSaves.delete(sectionKey);
    void request(`/api/lmu/sections/${sectionKey}`, {
      method: "PUT",
      body: JSON.stringify({
        responseData: progress.responses,
        progress: { status: progress.status === "completed" ? "completed" : "in_progress", currentStep: progress.responses.resumeScreen, startedAt: progress.startedAt, completedAt: progress.completedAt },
      }),
    }).catch(() => undefined);
  }, 1200));
  return Promise.resolve(true);
}

export function deleteServerSection(moduleId: string) {
  const sectionKey = sectionKeyFor(moduleId);
  if (!sectionKey) return;
  const existing = pendingSaves.get(sectionKey);
  if (existing) clearTimeout(existing);
  pendingSaves.delete(sectionKey);
  void fetch(`/api/lmu/sections/${sectionKey}`, { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
}

export interface ServerAssessment {
  participant: { first_name: string; email: string; updated_at: string };
  assessment: { id: string; updated_at: string };
  sectionProgress: Array<{ section_key: string; status: string; started_at: string | null; completed_at: string | null; updated_at: string }>;
  sectionResponses: Array<{ section_key: string; response_data: Record<string, unknown>; updated_at: string }>;
  finalizedResults: Array<{ section_key: string; result_data: { result?: ParticipantModuleProgress["result"]; derivedResults?: Record<string, unknown> }; updated_at: string }>;
}
