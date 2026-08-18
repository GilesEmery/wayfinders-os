import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const locationDefinition: LMUModuleDefinition = {
  id: "location", slug: "location", title: "Location", shortTitle: "Location",
  description: "Explore the places and environments that best support the life and contribution you want.",
  estimatedMinutes: 20, version: "1.0.0", status: "active", requiredModules: ["growth"],
  stages: [{ id: "introduction", title: "Introduction" }, { id: "relocation", title: "Relocation Flexibility" }, { id: "locations", title: "Geographic Areas" }, { id: "reasons", title: "Why These Places" }, { id: "primary", title: "First Choice" }, { id: "constraints", title: "Reality Check" }, { id: "review", title: "Final Location Preferences" }, { id: "final", title: "Confirmed Preferences" }],
  instructionalMedia: { intro: { provider: "youtube", videoId: "6-jiZeff5qc", title: "Location instructional video", description: "Reflect on where you would most like—or realistically be willing—to live." } },
  allowedExperiences: ["life-mapping-u-original"],
};
