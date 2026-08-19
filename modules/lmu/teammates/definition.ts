import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import { lmuInstructionalMedia } from "@/modules/lmu/media";

export const teammatesDefinition: LMUModuleDefinition = {
  id: "teammates", slug: "teammates", title: "Teammates", shortTitle: "Teammates",
  description: "Identify the qualities you value in the people you work and contribute alongside.",
  estimatedMinutes: 20, version: "1.0.0", status: "active", requiredModules: ["transferable-skills"],
  stages: [
    { id: "introduction", title: "Introduction" },
    { id: "selection", title: "Select Five Pain Points" },
    { id: "confirmation", title: "Confirm Five" },
    { id: "writing", title: "Positive Attributes" },
    { id: "review", title: "Review Attributes" },
    { id: "final", title: "Final Top 5" },
  ],
  instructionalMedia: { intro: lmuInstructionalMedia.teammates },
  allowedExperiences: ["life-mapping-u-original"],
};
