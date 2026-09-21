export const PUBLIC_LANDING_ROUTES = {
  dashboard: "/dashboard",
  trainings: "/trainings",
  lifeMappingU: "/experiences/life-mapping-u",
} as const;

export const PUBLIC_LANDING_CAPABILITIES = [
  ["01", "Assessments", "Understand your story, strengths, values, and direction."],
  ["02", "Trainings", "Grow through structured experiences and practical tools."],
  ["03", "Cohorts", "Learn and move forward with others."],
  ["04", "Hubs & Communities", "Build meaningful relationships around shared purpose and place."],
  ["05", "Projects & Impact", "Turn ideas, callings, and opportunities into meaningful action."],
] as const;

export const PUBLIC_LANDING_PATH = [
  ["01", "Discover", "See the patterns in your story, strengths, values, and opportunities."],
  ["02", "Grow", "Develop the habits, skills, relationships, and perspectives that help you move forward."],
  ["03", "Connect", "Engage with people, Hubs, cohorts, and communities that support and challenge you."],
  ["04", "Build", "Turn insight into action, ideas into experiments, and opportunities into meaningful work."],
  ["05", "Multiply", "Help others grow, lead, build, and create positive change."],
] as const;

export const PUBLIC_LANDING_JOURNEY = [
  "Trainings and learning experiences",
  "Assessments and results",
  "Cohorts and communities",
  "Hubs and relationships",
  "Progress and milestones",
  "Resources and next steps",
  "Projects and initiatives",
] as const;
