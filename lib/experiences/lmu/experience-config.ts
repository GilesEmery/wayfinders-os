import { experiences } from "./experiences";
import { getModuleDefinition } from "./module-registry";
import type {
  LMUExperienceDefinition,
  ParticipantModuleProgress,
  ProgressSummary,
} from "./types";

export function getExperienceDefinition(slug: string) {
  return experiences.find((experience) => experience.slug === slug);
}

const legacyExperienceSlugs: Record<string, string> = {
  "life-mapping-u-original": "original",
  "lmu-student": "student",
  "lmu-seniors": "seniors",
};

export function getCanonicalExperienceSlug(slug: string) {
  const canonicalSlug = legacyExperienceSlugs[slug] ?? slug;
  return getExperienceDefinition(canonicalSlug)?.slug;
}

export function getExperienceModules(experience: LMUExperienceDefinition) {
  return experience.modules.flatMap(({ moduleId }) => {
    const definition = getModuleDefinition(moduleId);
    return definition ? [definition] : [];
  });
}

export function calculateModuleProgress(
  moduleIds: string[],
  progress: ParticipantModuleProgress[] = [],
): ProgressSummary {
  const completed = moduleIds.filter(
    (moduleId) =>
      progress.find((item) => item.moduleId === moduleId)?.status === "completed",
  ).length;
  const total = moduleIds.length;

  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
