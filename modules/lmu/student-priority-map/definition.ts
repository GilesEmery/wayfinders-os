import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const studentPriorityMapDefinition: LMUModuleDefinition = {
  id: "student-priority-map",
  slug: "student-priority-map",
  title: "Student Priority Map",
  shortTitle: "Priority Map",
  description:
    "Clarify and organize the priorities that can guide thoughtful education and next-step decisions.",
  estimatedMinutes: 20,
  version: "1.0.0",
  status: "draft",
  requiredModules: ["transferable-skills"],
  allowedExperiences: ["lmu-student"],
};
