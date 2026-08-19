import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import { lmuInstructionalMedia } from "@/modules/lmu/media";

export const xFactorDefinition: LMUModuleDefinition = {
  id: "x-factor", slug: "x-factor", title: "X-Factor", shortTitle: "X-Factor",
  description: "Identify the distinctive conditions and considerations that shape what a fitting opportunity looks like.",
  estimatedMinutes: 25, version: "1.0.0", status: "active", requiredModules: ["location"],
  stages: [{ id: "introduction", title: "Introduction" }, { id: "questions", title: "Eight Questions" }, { id: "local-ranking", title: "Rank Within Areas" }, { id: "collection", title: "Collection Review" }, { id: "global-ranking", title: "Global Narrowing" }, { id: "close-review", title: "Close Review" }, { id: "top-eight", title: "Final Top 8" }, { id: "final", title: "Top 4 X-Factors" }],
  instructionalMedia: { intro: lmuInstructionalMedia.xFactor },
  allowedExperiences: ["life-mapping-u-original"],
};
