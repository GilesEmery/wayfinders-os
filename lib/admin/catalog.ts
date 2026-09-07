export type ExperienceType = "assessment" | "course" | "training" | "workshop" | "pathway" | "cohort" | "retreat" | "activity" | "resource";
export type ExperienceDefinition = { slug: string; name: string; type: ExperienceType; description: string; accent: string; adminRoute: string; participantRoute?: string; status: "active" | "planned"; mark?: string };

export const experienceRegistry: ExperienceDefinition[] = [
  { slug: "life-mapping-u", name: "Life Mapping U", type: "assessment", description: "Career and calling assessment with ten guided modules.", accent: "#ed6a24", adminRoute: "/admin/assessments/life-mapping-u", participantRoute: "/experiences/life-mapping-u/original", status: "active", mark: "/brand/lmu/lmu-u-mark-white.png" },
  { slug: "kaleo", name: "Kaleo", type: "pathway", description: "Formation pathway and discipleship experience.", accent: "#596d65", adminRoute: "/admin/trainings", status: "planned" },
  { slug: "start-something", name: "Start Something", type: "workshop", description: "Workshop and action pathway for moving an idea toward a next experiment.", accent: "#9a6846", adminRoute: "/admin/trainings", status: "planned" },
  { slug: "impact-identity", name: "Impact Identity", type: "workshop", description: "Guided discovery experience with structured identity outputs.", accent: "#6c647d", adminRoute: "/admin/trainings", status: "planned" },
  { slug: "hub-leader-cohort", name: "Hub Leader Cohort", type: "cohort", description: "Cohort-based leadership pathway with scoped organization context.", accent: "#65727b", adminRoute: "/admin/trainings", status: "planned" },
  { slug: "impact-studio", name: "Impact Studio", type: "cohort", description: "Formation experience connected to a persistent initiative or venture.", accent: "#756a52", adminRoute: "/admin/trainings", status: "planned" },
];

export const assessmentCatalog = experienceRegistry.filter((item) => item.type === "assessment");
export const trainingCatalog = experienceRegistry.filter((item) => item.slug !== "life-mapping-u");

export const experienceHierarchy = ["experience", "module_or_stage", "lesson_or_activity", "content_block"] as const;
export const contentBlockRegistry = ["heading", "rich_text", "video", "image", "scripture", "quote", "reflection", "journal_response", "discussion_prompt", "practice", "assignment", "quiz_check_in", "worksheet", "checklist", "resource", "button_link", "embed", "action_step", "ranking", "card_selection", "structured_response"] as const;
