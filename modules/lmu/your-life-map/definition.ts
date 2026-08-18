import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const yourLifeMapDefinition: LMUModuleDefinition = {
  id: "your-life-map", slug: "your-life-map", title: "Your Life Map", shortTitle: "Life Map",
  description: "Bring the patterns and priorities from your journey together into a clear view of what matters now.",
  estimatedMinutes: 15, version: "1.0.0", status: "draft", kind: "result",
  requiredModules: [
    "success-stories", "transferable-skills", "teammates", "supervisor", "values",
    "growth", "location", "x-factor", "salary", "current-motivator-rankings",
  ],
  allowedExperiences: ["life-mapping-u-original"],
  resultSections: [
    "Top 5 Transferable Skills", "Top 5 Teammate attributes", "Top 5 Supervisor attributes",
    "Top 5 Values", "Top 5 Growth priorities", "Top 3 Locations", "Top 4 X-Factors",
    "Salary parameters and range", "Current Motivator Ranking",
  ],
};
