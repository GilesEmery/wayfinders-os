import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const supervisorDefinition: LMUModuleDefinition = {
  id: "supervisor", slug: "supervisor", title: "Supervisor", shortTitle: "Supervisor",
  description: "Clarify the leadership qualities and working relationship that help you do your best work.",
  estimatedMinutes: 20, version: "1.0.0", status: "active", requiredModules: ["teammates"],
  stages: [
    { id: "introduction", title: "Introduction" }, { id: "selection", title: "Select Five Pain Points" },
    { id: "confirmation", title: "Confirm Five" }, { id: "writing", title: "Desired Leadership" },
    { id: "review", title: "Review Attributes" }, { id: "final", title: "Final Top 5" },
  ],
  instructionalMedia: { intro: { provider: "youtube", videoId: "in1P40RteEE", title: "Supervisor instructional video", description: "Clarify the leadership qualities and behaviors that help you do your best work." } },
  allowedExperiences: ["life-mapping-u-original"],
};
