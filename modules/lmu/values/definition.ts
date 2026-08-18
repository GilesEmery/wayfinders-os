import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const valuesDefinition: LMUModuleDefinition = {
  id: "values", slug: "values", title: "Values", shortTitle: "Values",
  description: "Name the principles and priorities that give direction to meaningful choices.",
  estimatedMinutes: 15, version: "1.0.0", status: "active", requiredModules: ["supervisor"],
  stages: [{ id: "introduction", title: "Introduction" }, { id: "selection", title: "Select Values" }, { id: "review", title: "Review Values" }, { id: "final", title: "Final Values" }],
  instructionalMedia: { intro: { provider: "youtube", videoId: "mrboqGG_8u0", title: "Values instructional video", description: "Name the values that orient meaningful work and life." } },
  allowedExperiences: ["life-mapping-u-original"],
};
