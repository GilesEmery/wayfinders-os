import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

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
      provider: "youtube",
      videoId: "tVzB7vTTxUw",
      title: "Success Stories instructional video",
    },
    topThree: {
      provider: "youtube",
      videoId: "3-v0fl2ARkQ",
      title: "Identify Your Top 3 instructional video",
    },
  },
};
