import type {
  ParticipantExperienceProgress,
  ParticipantModuleProgress,
} from "./types";
import { deleteServerSection, scheduleSectionSave, SECTION_TO_MODULE, type ServerAssessment } from "./persistence";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "./original-journey";

const STORAGE_KEY = "lmu-platform-v1";
const PROGRESS_EVENT = "lmu-progress-change";

interface StoredProgress {
  assessmentId?: string;
  participantProfile?: ParticipantProfile;
  experiences: Record<string, ParticipantExperienceProgress>;
}

export interface ParticipantProfile {
  firstName: string;
  email: string;
}

const emptyStore = (): StoredProgress => ({ experiences: {} });

function readStore(): StoredProgress {
  if (typeof window === "undefined") return emptyStore();

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as StoredProgress) : emptyStore();
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoredProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function getExperienceProgress(experienceId: string) {
  const store = readStore();
  if (!store.assessmentId) return undefined;
  return store.experiences[experienceId];
}

export function bindAssessment(assessmentId: string) {
  const store = readStore();
  if (store.assessmentId !== assessmentId) store.experiences = {};
  store.assessmentId = assessmentId;
  writeStore(store);
}

export function saveExperienceProgress(
  progress: ParticipantExperienceProgress,
) {
  const store = readStore();
  store.experiences[progress.experienceId] = progress;
  writeStore(store);
}

export function getParticipantProfile() {
  return readStore().participantProfile;
}

export function saveParticipantProfile(profile: ParticipantProfile) {
  const store = readStore();
  store.participantProfile = {
    firstName: profile.firstName.trim(),
    email: profile.email.trim(),
  };
  writeStore(store);
}

export function getModuleProgress(experienceId: string, moduleId: string) {
  return getExperienceProgress(experienceId)?.moduleProgress.find(
    (progress) => progress.moduleId === moduleId,
  );
}

export async function saveModuleProgress(
  experienceId: string,
  progress: ParticipantModuleProgress,
) {
  const store = readStore();
  if (!store.assessmentId) return false;
  const previous = getExperienceProgress(experienceId);
  const updatedProgress = { ...progress, updatedAt: new Date().toISOString() };
  const experience = getExperienceProgress(experienceId) ?? {
    experienceId,
    moduleProgress: [],
  };
  const otherModules = experience.moduleProgress.filter(
    (item) => item.moduleId !== updatedProgress.moduleId,
  );
  saveExperienceProgress({
    ...experience,
    moduleProgress: [...otherModules, updatedProgress],
  });
  const persisted = await scheduleSectionSave(updatedProgress);
  if (!persisted) {
    const rollbackStore = readStore();
    if (previous) rollbackStore.experiences[experienceId] = previous;
    else delete rollbackStore.experiences[experienceId];
    writeStore(rollbackStore);
  }
  return persisted;
}

export function clearExperienceProgress(experienceId: string) {
  const store = readStore();
  delete store.experiences[experienceId];
  writeStore(store);
}

export function removeModuleProgress(experienceId: string, moduleId: string) {
  const experience = getExperienceProgress(experienceId);
  if (!experience) return;
  saveExperienceProgress({
    ...experience,
    moduleProgress: experience.moduleProgress.filter((item) => item.moduleId !== moduleId),
  });
  if (experienceId === LMU_ORIGINAL_EXPERIENCE_ID) deleteServerSection(moduleId);
}

export function hydrateFromServer(server: ServerAssessment) {
  const store = readStore();
  if (store.assessmentId !== server.assessment.id) store.experiences = {};
  store.assessmentId = server.assessment.id;
  store.participantProfile = { firstName: server.participant.first_name, email: server.participant.email };
  const localExperience = store.experiences[LMU_ORIGINAL_EXPERIENCE_ID] ?? { experienceId: LMU_ORIGINAL_EXPERIENCE_ID, moduleProgress: [] };
  const responseBySection = new Map(server.sectionResponses.map((item) => [item.section_key, item]));
  const resultBySection = new Map(server.finalizedResults.map((item) => [item.section_key, item]));
  const serverModules = server.sectionProgress.flatMap((progress) => {
    const moduleId = SECTION_TO_MODULE[progress.section_key];
    const response = responseBySection.get(progress.section_key);
    if (!moduleId || !response) return [];
    const resultRecord = resultBySection.get(progress.section_key)?.result_data;
    return [{
      moduleId,
      status: progress.status === "completed" ? "completed" as const : "in-progress" as const,
      startedAt: progress.started_at ?? undefined,
      completedAt: progress.completed_at ?? undefined,
      updatedAt: [progress.updated_at, response.updated_at, resultBySection.get(progress.section_key)?.updated_at].filter(Boolean).sort().at(-1),
      responses: response.response_data,
      derivedResults: resultRecord?.derivedResults ?? {},
      result: resultRecord?.result,
    }];
  });
  const merged = [...localExperience.moduleProgress];
  for (const remote of serverModules) {
    const index = merged.findIndex((item) => item.moduleId === remote.moduleId);
    if (index === -1) merged.push(remote);
    else if (merged[index].updatedAt && remote.updatedAt && remote.updatedAt > merged[index].updatedAt!) merged[index] = remote;
  }
  store.experiences[LMU_ORIGINAL_EXPERIENCE_ID] = { ...localExperience, moduleProgress: merged };
  writeStore(store);
}

export function resetModuleProgress(experienceId: string, moduleId: string) {
  // TODO: Invalidate modules with true data dependencies once downstream modules store real results.
  removeModuleProgress(experienceId, moduleId);
}

export function subscribeToProgress(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(PROGRESS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getProgressSnapshot(experienceId: string) {
  if (typeof window === "undefined") return "";
  return JSON.stringify(getExperienceProgress(experienceId)?.moduleProgress ?? []);
}
