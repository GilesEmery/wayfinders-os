import type {
  ParticipantExperienceProgress,
  ParticipantModuleProgress,
} from "./types";

const STORAGE_KEY = "lmu-platform-v1";
const PROGRESS_EVENT = "lmu-progress-change";

interface StoredProgress {
  experiences: Record<string, ParticipantExperienceProgress>;
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
  return readStore().experiences[experienceId];
}

export function saveExperienceProgress(
  progress: ParticipantExperienceProgress,
) {
  const store = readStore();
  store.experiences[progress.experienceId] = progress;
  writeStore(store);
}

export function getModuleProgress(experienceId: string, moduleId: string) {
  return getExperienceProgress(experienceId)?.moduleProgress.find(
    (progress) => progress.moduleId === moduleId,
  );
}

export function saveModuleProgress(
  experienceId: string,
  progress: ParticipantModuleProgress,
) {
  const experience = getExperienceProgress(experienceId) ?? {
    experienceId,
    moduleProgress: [],
  };
  const otherModules = experience.moduleProgress.filter(
    (item) => item.moduleId !== progress.moduleId,
  );
  saveExperienceProgress({
    ...experience,
    moduleProgress: [...otherModules, progress],
  });
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
