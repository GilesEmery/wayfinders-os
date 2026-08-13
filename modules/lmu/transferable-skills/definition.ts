import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const transferableSkillsDefinition: LMUModuleDefinition = {
  id: "transferable-skills",
  slug: "transferable-skills",
  title: "Transferable Skills",
  shortTitle: "Skills",
  description:
    "Recognize the capabilities that appear across your experiences and understand how they travel with you.",
  estimatedMinutes: 25,
  version: "1.0.0",
  status: "draft",
  requiredModules: ["success-stories"],
  allowedExperiences: [
    "life-mapping-u-original",
    "lmu-student",
    "lmu-seniors",
  ],
};
