export const CIRCLE_RENDERER_KEY = "circle-of-influence.v1";
export const CIRCLE_RESPONSE_KEY = "circle_of_influence";
export const CIRCLE_AREAS = [
  { key: "family", title: "Family", description: "The family members you share life with, near or far." },
  { key: "friends", title: "Friends", description: "The friends you regularly spend time with and listen to." },
  { key: "work", title: "Work", description: "Coworkers, clients, and others you encounter through your work." },
  { key: "church", title: "Church Body", description: "People you share worship, service, and Christian community with." },
  { key: "activities", title: "Hobbies / Activities", description: "People you meet through interests, sports, volunteering, or shared activities." },
  { key: "neighbors", title: "Neighbors", description: "People who live nearby and those you regularly encounter in your neighborhood." },
  { key: "school", title: "School", description: "Classmates, teachers, parents, and others in your learning community." },
  { key: "other", title: "Other", description: "Name another community or setting where you regularly connect with people." },
] as const;
export type CircleAreaKey = typeof CIRCLE_AREAS[number]["key"];
export type CircleData = { people: Record<CircleAreaKey, string[]>; otherLabel: string; prayer: string; disciple: string; nextStep: string };
export const CIRCLE_GUIDANCE = [
  "God has given everyone a unique circle of influence (oikos). As a believer, your circle of influence is your sheepfold: people you are called to shepherd with care and skill.",
  "Influence is not developed overnight. Knowing who is in your community helps you discern whom and how to influence, understand, and listen to others.",
  "A shepherding leader knows their sheep and recognizes when they need to be led forward, cared for, or protected. Knowing your fold also helps you recognize who is not in it yet.",
  "Write down the names of people you regularly rub shoulders with in each applicable area. Aim for 4–15 people per area; leave areas that do not apply blank.",
  "Pray for the people on your list. Ask God to reveal whom you ought to disciple. As a disciple of Jesus, you are a leader. What will you do about it?",
];
function record(input: unknown): Record<string, unknown> { return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {}; }
const text = (value: unknown, length: number) => typeof value === "string" ? value.slice(0, length) : "";
export function normalizeCircleData(input: unknown): CircleData {
  const root = record(input), people = record(root.people);
  return { people: Object.fromEntries(CIRCLE_AREAS.map(area => [area.key, Array.isArray(people[area.key]) ? (people[area.key] as unknown[]).slice(0, 15).map(name => text(name, 120)) : []])) as CircleData["people"], otherLabel: text(root.otherLabel, 80), prayer: text(root.prayer, 2000), disciple: text(root.disciple, 2000), nextStep: text(root.nextStep, 2000) };
}
export function circleCounts(data: CircleData) { return CIRCLE_AREAS.map(area => ({ ...area, title: area.key === "other" ? data.otherLabel.trim() || "Other" : area.title, count: data.people[area.key].filter(name => name.trim()).length })); }
export function circleSaveError(data: CircleData) {
  if (data.people.other.some(name => name.trim()) && !data.otherLabel.trim()) return "Name your Other area before saving.";
  if (!circleCounts(data).some(area => area.count)) return "Add at least one person in an applicable area before saving your response.";
  return null;
}
export function normalizeCircleEnvelope(input: unknown) {
  const root = record(input), finished = record(root.finished);
  const valid = typeof finished.completedAt === "string" && Number.isFinite(Date.parse(finished.completedAt)) && finished.sourceVersion === CIRCLE_RENDERER_KEY;
  return { draft: normalizeCircleData(root.draft ?? input), finished: valid ? { completedAt: finished.completedAt as string, participantMaterial: normalizeCircleData(finished.participantMaterial), sourceVersion: CIRCLE_RENDERER_KEY } : null };
}
export function projectCircleSave(prior: unknown, input: unknown, finish: boolean, now: string) {
  const previous = normalizeCircleEnvelope(prior), draft = normalizeCircleData(input);
  if (finish) { const error = circleSaveError(draft); if (error) throw new Error(error); }
  return { schemaVersion: 1, draft, finished: previous.finished ?? (finish ? { completedAt: now, sourceVersion: CIRCLE_RENDERER_KEY, participantMaterial: draft } : null) };
}
