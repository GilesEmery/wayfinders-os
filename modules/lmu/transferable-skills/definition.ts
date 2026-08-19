import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import { lmuInstructionalMedia } from "@/modules/lmu/media";

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
  stages: [
    { id: "introduction", title: "Introduction" },
    { id: "realistic", title: "Realistic" },
    { id: "social", title: "Social" },
    { id: "conventional", title: "Conventional" },
    { id: "artistic", title: "Artistic" },
    { id: "enterprising", title: "Enterprising" },
    { id: "investigative", title: "Investigative" },
    { id: "patterns", title: "Pattern Review" },
    { id: "ranking", title: "Adaptive Skill Ranking" },
    { id: "review", title: "Full Ranked Skills Review" },
    { id: "final", title: "Final Top 5" },
    { id: "finish", title: "Finish Section" },
  ],
  instructionalMedia: {
    intro: {
      ...lmuInstructionalMedia.transferableSkills,
    },
  },
  allowedExperiences: [
    "life-mapping-u-original",
    "lmu-student",
    "lmu-seniors",
  ],
};
