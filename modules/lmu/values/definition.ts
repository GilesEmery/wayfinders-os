import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import { lmuInstructionalMedia } from "@/modules/lmu/media";

export const valuesDefinition: LMUModuleDefinition = {
  id: "values", slug: "values", title: "Values", shortTitle: "Values",
  description: "Name the principles and priorities that give direction to meaningful choices.",
  estimatedMinutes: 15, version: "1.0.0", status: "active", requiredModules: ["supervisor"],
  stages: [{ id: "introduction", title: "Introduction" }, { id: "selection", title: "Select Values" }, { id: "review", title: "Review Values" }, { id: "final", title: "Final Values" }],
  instructionalMedia: { intro: lmuInstructionalMedia.values },
  allowedExperiences: ["life-mapping-u-original"],
};
