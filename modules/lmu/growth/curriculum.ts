export type GrowthCategory = "professional" | "training" | "challenge";
export interface GrowthCurriculumItem { id: string; sourceCategory: GrowthCategory; originalLabel: string; displayLabel: string; detailPrompt?: string }
const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const item = (sourceCategory: GrowthCategory, originalLabel: string, displayLabel: string, detailPrompt?: string): GrowthCurriculumItem => ({ id: `${sourceCategory}-${slug(originalLabel)}`, sourceCategory, originalLabel, displayLabel, detailPrompt });
export const professionalGrowthItems = [
  item("professional", "To start a new product or research activity", "Start a new product, project, or research activity", "What would you like to start?"),
  item("professional", "To learn a new skill", "Learn a new skill", "What skill would you like to learn?"),
  item("professional", "To further development or use present skills", "Develop or make greater use of skills I already have", "Which skills would you especially like to develop or use more?"),
  item("professional", "To step up to more knowledge and/or responsibility", "Take on greater knowledge or responsibility", "What kind of knowledge or responsibility would you like to grow into?"),
  item("professional", "To have the opportunity to accomplish difficult tasks", "Take on difficult or stretching work", "What kind of challenge would stretch you?"),
  item("professional", "To start in a field that will offer new opportunities", "Move into a field that offers new opportunities", "What field or direction are you considering?"),
  item("professional", "To develop a blueprint for my own career", "Develop a clearer plan for my career", "Is there a direction, role, or next step you are already considering?"),
  item("professional", "To improve the way things are done", "Improve the way things are done", "What process, system, or area would you like to improve?"),
];
export const trainingGrowthItems = [
  item("training", "To work with a more supportive supervisor who is interested in my development", "Work with a supervisor who actively supports my development", "What kind of support or development would be most helpful?"),
  item("training", "To become more adept at working as a member of a team", "Grow in working effectively as part of a team", "What part of teamwork would you especially like to develop?"),
  item("training", "To learn and grow in leading a team", "Grow in leading a team", "What would you especially like to grow in as a leader?"),
  item("training", "To receive more training in", "Receive training in a specific area", "What would you like training in?"),
  item("training", "To start a new product or research activity", "Learn through starting a new product, project, or research activity", "What would you like to start or explore?"),
  item("training", "To receive on-the-job training in my current role", "Receive on-the-job training in my current role", "What would you like to learn in your current role?"),
  item("training", "To receive on-the-job training in a new role", "Receive on-the-job training in a new role", "What role or skill area are you considering?"),
  item("training", "Gain insight into a new career trajectory", "Explore a new career direction", "What direction are you considering?"),
  item("training", "To receive help in developing a new skill", "Get help developing a new skill", "What skill would you like help developing?"),
  item("training", "To have the opportunity to attend college, graduate school, PhD work", "Pursue college, graduate school, doctoral study, or other formal education", "What would you like to study or pursue?"),
  item("training", "Receive training on personal/work productivity", "Receive training in personal or work productivity", "Is there a particular productivity area you want help with?"),
];
export const challengeGrowthItems = [
  item("challenge", "Have the opportunity to accomplish difficult tasks", "Take on a difficult or stretching assignment", "What kind of assignment or challenge are you imagining?"),
  item("challenge", "Take on more knowledge and/or responsibility", "Take on greater responsibility", "What kind of responsibility would you like to take on?"),
  item("challenge", "Start in a field that offers new opportunities", "Move into a new field or unfamiliar environment", "What field or environment are you considering?"),
  item("challenge", "Learn and grow in leading a team", "Lead a team", "What kind of team or leadership opportunity would stretch you?"),
  item("challenge", "Start a new product or research activity", "Start something new", "What would you like to start?"),
  item("challenge", "Improve the way things are done", "Improve a process or system", "What would you like to improve?"),
  item("challenge", "Learn a new skill", "Learn something that currently feels challenging", "What would you like to learn?"),
  item("challenge", "Gain insight into a new career trajectory", "Explore a new career direction", "What direction are you considering?"),
];
export const growthCurriculum = [...professionalGrowthItems, ...trainingGrowthItems, ...challengeGrowthItems];
export const growthCurriculumById = new Map(growthCurriculum.map((entry) => [entry.id, entry]));
export const growthCategoryLabels: Record<GrowthCategory, string> = { professional: "Professional Growth", training: "Training", challenge: "Challenge" };
