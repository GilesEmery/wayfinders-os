import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import { lmuInstructionalMedia } from "@/modules/lmu/media";

export const growthDefinition: LMUModuleDefinition = {
  id: "growth", slug: "growth", title: "Growth", shortTitle: "Growth",
  description: "Consider the kinds of challenge, learning, and development you want in your next season.",
  estimatedMinutes: 25, version: "1.0.0", status: "active", requiredModules: ["values"],
  stages: [{ id: "introduction", title: "Introduction" }, { id: "overview", title: "Growth Overview" }, { id: "professional", title: "Professional Growth" }, { id: "training", title: "Training" }, { id: "challenge", title: "Challenge" }, { id: "board", title: "Growth Board" }, { id: "prioritize", title: "Choose Top 5" }, { id: "review", title: "Review Top 5" }, { id: "final", title: "Final Top 5" }],
  instructionalMedia: { intro: lmuInstructionalMedia.growth },
  allowedExperiences: ["life-mapping-u-original"],
};
