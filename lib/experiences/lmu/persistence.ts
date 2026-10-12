import { createAcknowledgedSaveQueue, type SaveStatus } from "./acknowledged-save-queue";
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
const statuses = new Map<string, SaveStatus>();
const listeners = new Set<() => void>();
const unconfirmedSections = new Set<string>();
class UnconfirmedRequestError extends Error {}
function publishStatus(key: string, status: SaveStatus) {
  statuses.set(key, status);
  for (const listener of listeners) listener();
}
const saves = createAcknowledgedSaveQueue({ delay: 1200, setTimer: (fn, delay) => setTimeout(fn, delay), clearTimer: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>), onStatus: publishStatus });
export function subscribeToSaveStatus(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function saveStatusSnapshot() { return [...statuses.values()].includes("failed") ? "failed" : [...statuses.values()].includes("pending") ? "pending" : statuses.size ? "saved" : "idle"; }
export function markRestoreFailure() { publishStatus("restore", "failed"); }

function sectionKeyFor(moduleId: string) {
  return MODULE_TO_SECTION[moduleId];
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(path, { ...init, signal: AbortSignal.timeout(15000), credentials: "same-origin", headers: { "content-type": "application/json", ...init?.headers } });
  } catch { throw new UnconfirmedRequestError("LMU persistence could not be confirmed. Reload to verify server state before retrying."); }
  if (!response.ok) throw new Error(`LMU persistence request failed (${response.status}).`);
  let receipt: { ok?: boolean };
  try { receipt = await response.json(); }
  catch { throw new UnconfirmedRequestError("LMU persistence could not be confirmed. Reload to verify server state before retrying."); }
  if (receipt?.ok !== true) throw new UnconfirmedRequestError("LMU persistence was not acknowledged.");
  return receipt;
}

export async function loadServerAssessment() {
  const response = await fetch("/api/lmu/assessment", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Unable to restore LMU assessment (${response.status}).`);
  return response.json() as Promise<ServerAssessment>;
}

export function scheduleSectionSave(progress: ParticipantModuleProgress, assessmentId?: string): Promise<boolean> {
  const sectionKey = sectionKeyFor(progress.moduleId);
  if (!sectionKey || !assessmentId) return Promise.resolve(false);
  // Capture the current body before debounce; callers may keep editing their state.
  const body = JSON.stringify(progress.status === "completed" && progress.result
    ? { responseData: progress.responses, resultData: { result: progress.result, derivedResults: progress.derivedResults } }
    : { responseData: progress.responses, progress: { status: "in_progress", currentStep: progress.responses.resumeScreen, startedAt: progress.startedAt, completedAt: progress.completedAt } });
  const final = progress.status === "completed" && Boolean(progress.result);
  if (unconfirmedSections.has(sectionKey)) { publishStatus(sectionKey, "failed"); return Promise.resolve(false); }
  return saves.schedule(sectionKey, async () => {
    if (unconfirmedSections.has(sectionKey)) return false;
    let result;
    try { result = await request(`/api/lmu/sections/${sectionKey}${final ? "/finalize" : ""}`, { method: final ? "POST" : "PUT", headers: { "x-lmu-assessment-id": assessmentId }, body }); }
    catch (error) { if (error instanceof UnconfirmedRequestError) unconfirmedSections.add(sectionKey); throw error; }
    return !final || sectionKey !== "motivator_rankings" || Boolean((result as { assessmentCompleted?: boolean }).assessmentCompleted);
  }, final);
}

export function deleteServerSection(moduleId: string, assessmentId?: string): Promise<boolean> {
  const sectionKey = sectionKeyFor(moduleId);
  if (!sectionKey || !assessmentId) return Promise.resolve(false);
  if (unconfirmedSections.has(sectionKey)) { publishStatus(sectionKey, "failed"); return Promise.resolve(false); }
  return saves.schedule(sectionKey, async () => {
    if (unconfirmedSections.has(sectionKey)) return false;
    try { await request(`/api/lmu/sections/${sectionKey}`, { method: "DELETE", headers: { "x-lmu-assessment-id": assessmentId } }); return true; }
    catch (error) { if (error instanceof UnconfirmedRequestError) unconfirmedSections.add(sectionKey); throw error; }
  }, true);
}

export interface ServerAssessment {
  participant: { first_name: string; email: string; updated_at: string };
  assessment: { id: string; updated_at: string };
  sectionProgress: Array<{ section_key: string; status: string; started_at: string | null; completed_at: string | null; updated_at: string }>;
  sectionResponses: Array<{ section_key: string; response_data: Record<string, unknown>; updated_at: string }>;
  finalizedResults: Array<{ section_key: string; result_data: { result?: ParticipantModuleProgress["result"]; derivedResults?: Record<string, unknown> }; updated_at: string }>;
}
