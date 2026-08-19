import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import { lmuInstructionalMedia } from "@/modules/lmu/media";

export const successStoriesDefinition: LMUModuleDefinition = {
  id: "success-stories",
  slug: "success-stories",
  title: "Success Stories",
  shortTitle: "Stories",
  description:
    "Reflect on meaningful experiences to notice the conditions, choices, and contributions that helped you thrive.",
  estimatedMinutes: 30,
  version: "1.0.0",
  status: "draft",
  requiredModules: [],
  allowedExperiences: [
    "life-mapping-u-original",
    "lmu-student",
    "lmu-seniors",
  ],
  instructionalMedia: {
    intro: {
      ...lmuInstructionalMedia.successStories,
    },
    topThree: {
      ...lmuInstructionalMedia.topThreeSuccessStories,
    },
  },
};
