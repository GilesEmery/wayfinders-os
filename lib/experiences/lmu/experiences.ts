import type { LMUExperienceDefinition } from "./types";

export const experiences: LMUExperienceDefinition[] = [
  {
    id: "life-mapping-u-original",
    slug: "original",
    title: "Life Mapping U",
    shortTitle: "Original",
    description:
      "A guided process for discovering the patterns, priorities, skills, values, and conditions that shape your best contribution.",
    modules: [
      { moduleId: "success-stories" },
      { moduleId: "transferable-skills" },
      { moduleId: "teammates" },
      { moduleId: "supervisor" },
      { moduleId: "values" },
      { moduleId: "growth" },
      { moduleId: "location" },
      { moduleId: "x-factor" },
      { moduleId: "salary" },
      { moduleId: "current-motivator-rankings" },
      { moduleId: "your-life-map" },
    ],
    version: "1.0.0",
  },
  {
    id: "lmu-student",
    slug: "student",
    title: "LMU Student",
    shortTitle: "Student",
    description:
      "A Life Mapping U experience designed to help students understand themselves and make thoughtful decisions about education and what comes next.",
    modules: [
      { moduleId: "success-stories" },
      { moduleId: "transferable-skills" },
      { moduleId: "student-priority-map" },
    ],
    version: "1.0.0",
  },
  {
    id: "lmu-seniors",
    slug: "seniors",
    title: "LMU Empty Nesters",
    shortTitle: "Empty Nesters",
    description:
      "A Life Mapping U experience designed for reflection, contribution, purpose, and the next chapter.",
    modules: [
      { moduleId: "success-stories" },
      { moduleId: "transferable-skills" },
    ],
    version: "1.0.0",
  },
];
