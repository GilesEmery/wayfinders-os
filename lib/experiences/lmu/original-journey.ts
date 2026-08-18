import { getExperienceDefinition, getExperienceModules } from "./experience-config";

export const LMU_ORIGINAL_EXPERIENCE_ID = "life-mapping-u-original";

const originalExperience = getExperienceDefinition("original");

export const originalJourneyModules = originalExperience
  ? getExperienceModules(originalExperience)
  : [];

export const originalDiscoveryModules = originalJourneyModules.filter(
  (module) => module.kind !== "result",
);

export const originalResultModule = originalJourneyModules.find(
  (module) => module.kind === "result",
);
