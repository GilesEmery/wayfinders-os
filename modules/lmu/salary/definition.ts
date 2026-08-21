import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import { lmuInstructionalMedia } from "@/modules/lmu/media";

export const salaryDefinition: LMUModuleDefinition = {
  id: "salary", slug: "salary", title: "Salary", shortTitle: "Salary",
  description: "Define practical compensation parameters that support thoughtful and sustainable decisions.",
  estimatedMinutes: 20, version: "1.0.0", status: "active", requiredModules: ["x-factor"],
  stages: [{ id: "introduction", title: "Introduction" }, { id: "context", title: "Compensation Baseline" }, { id: "goal", title: "Five-Year Goal" }, { id: "range", title: "Compensation Range" }, { id: "realities", title: "Future Realities" }, { id: "tradeoff-intro", title: "Compensation Tradeoffs" }, { id: "tradeoff", title: "Tradeoff Comparisons" }, { id: "perspective", title: "Compensation Perspective" }, { id: "change", title: "Financial Change" }, { id: "support", title: "Financial Support" }, { id: "review", title: "Salary Snapshot" }, { id: "final", title: "Confirmed Salary Range" }],
  instructionalMedia: { intro: lmuInstructionalMedia.salary },
  allowedExperiences: ["life-mapping-u-original"],
};
