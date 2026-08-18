import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const salaryDefinition: LMUModuleDefinition = {
  id: "salary", slug: "salary", title: "Salary", shortTitle: "Salary",
  description: "Define practical compensation parameters that support thoughtful and sustainable decisions.",
  estimatedMinutes: 20, version: "1.0.0", status: "active", requiredModules: ["x-factor"],
  stages: [{ id: "introduction", title: "Introduction" }, { id: "context", title: "Compensation Context" }, { id: "floor", title: "Financial Floor" }, { id: "goal", title: "Five-Year Goal" }, { id: "range", title: "Compensation Range" }, { id: "realities", title: "Future Realities" }, { id: "change", title: "Financial Change" }, { id: "support", title: "Financial Support" }, { id: "review", title: "Salary Snapshot" }, { id: "final", title: "Confirmed Salary Range" }],
  instructionalMedia: { intro: { provider: "youtube", videoId: "fBnnMap4CWY", title: "Salary instructional video", description: "Reflect practically on the financial realities, responsibilities, and goals that shape informed decisions." } },
  allowedExperiences: ["life-mapping-u-original"],
};
