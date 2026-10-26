export const MICROCHURCH_RENDERER_KEY = 'microchurch.v1';
export const MICROCHURCH_RESPONSE_KEY = 'microchurch_assessment';
export const MICROCHURCH_SLUG = 'microchurch';
export const MICROCHURCH_TITLE = 'Microchurch Assessment';
export const MICROCHURCH_SUBTITLE = 'Worship, Community, and Mission';
export const MICROCHURCH_STAGES = ['Introduction', 'Statements 1–7', 'Statements 8–14', 'Statements 15–21', 'Review and Complete'] as const;
export const MICROCHURCH_INTRO = 'Take a few minutes as a microchurch to evaluate your ecclesial minimum, marking how accurately each statement describes your microchurch on a scale of 1 to 5 (most accurate). Everyone has good and bad seasons so don’t worry, this is just a way for you to discern next season’s steps towards being the church Jesus is calling you to be.';
export const MICROCHURCH_QUESTIONS = [
  'People who come to your group would describe it as an experience with God.',
  'You have someone new engaging your group at least once a month.',
  'When you look at scripture together people are often amazed.',
  "Your people know and celebrate each other's birthdays.",
  'Jesus is always explicitly honored whenever you gather.',
  'Prayer never seems forced or difficult in your group.',
  'There are people who would say they have come to faith in Jesus because of your group',
  'There is a strong sense of family in your group.',
  'If a non-believer interacted with your group three times they would have heard the gospel.',
  'Most everyone in your group would say that they have learned to be more intimate with Jesus because of being involved with you.',
  "Most of the group knows each other's middle name.",
  'It is not uncommon for people to cry and be embraced in your group.',
  'When your group is talking about scripture or in prayer people often lose track of time.',
  'Everyone in your group is a part of recruiting and including outsiders to the group.',
  'If a couple in your group was going to get married, everyone in the group would be invited.',
  'You often talk about your call to reach people, love others or do ministry outside of the gathering together.',
  'If someone in your group had a crisis they would bring it to you.',
  'You have seen people not only grow in your group but grow into leaders themselves.',
  'If someone in your group was having an affair it would be obvious.',
  "When you look at scripture as a group it is not just an intellectual exercise, it engages everyone's hearts.",
  'Someone who was once a part of the group as a non-believer has since come to lead someone else to Jesus.',
] as const;
export const MICROCHURCH_CATEGORIES = [
  { name: 'Worship', statements: [1, 3, 5, 6, 10, 13, 20] },
  { name: 'Community', statements: [4, 8, 11, 12, 15, 17, 19] },
  { name: 'Mission', statements: [2, 7, 9, 14, 16, 18, 21] },
] as const;
export const MICROCHURCH_LIMITING_INTRO = 'As you evaluate your microchurch take time to discern these dangers of limiting the church to our favorite component.';
export const MICROCHURCH_REFLECTIONS = [
  { title: 'Only Worship: Hypocrisy', text: 'If our spiritual life is confined to a privatized worship that is sincere but does not lead us into mission or into deep relationships with others we face the threat of hypocrisy. As we are offering ourselves to God but then not putting into practice what his presence and his word would naturally require.' },
  { title: 'Only Community: Idolatry', text: 'If we pursue deep relationship but fail to live those relationships in the light of the mission of God or submit those relationships to the headship of Jesus then we risk idolatry. Deep relationships that are unmediated by a concern for the kingdom and mission of God will take over our hearts taking a place that should only belong to God. These unbalanced relationships will quickly become unhealthy and detrimental to our spiritual life.' },
  { title: 'Only Mission: Pride', text: 'If our spiritual life is confined to independently pursuing mission but not open, accountable friendships or dependence on God then we risk becoming our own God. Taking the mission on ourselves without realizing our need for God or the people of God will certainly lead to error and egomania.' },
] as const;
export type MicrochurchData = { ratings: Array<number | null> };
export type MicrochurchIssue = { stage: number; field: string; message: string };
export type MicrochurchFinished = { schemaVersion: 1; sourceVersion: typeof MICROCHURCH_RENDERER_KEY; completedAt: string; participantMaterial: MicrochurchData };
export type MicrochurchEnvelope = { schemaVersion: 1; draft: MicrochurchData; finished: MicrochurchFinished | null; previousResults: MicrochurchFinished[] };
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function emptyMicrochurchData(): MicrochurchData { return { ratings: Array.from({length: 21}, () => null) }; }
export function normalizeMicrochurchData(input: unknown): MicrochurchData {
  const root = object(input), source = object(root.draft ?? root), ratings = Array.isArray(source.ratings) ? source.ratings : [];
  return { ratings: MICROCHURCH_QUESTIONS.map((_, i) => Number.isInteger(ratings[i]) && ratings[i] >= 1 && ratings[i] <= 5 ? ratings[i] : null) };
}
export function microchurchIssues(data: MicrochurchData): MicrochurchIssue[] { return MICROCHURCH_QUESTIONS.flatMap((question, i) => Number.isInteger(data.ratings[i]) && Number(data.ratings[i]) >= 1 && Number(data.ratings[i]) <= 5 ? [] : [{stage: Math.floor(i / 7) + 1, field: `q${i+1}`, message: `Statement ${i+1}: ${question}`}]); }
export const microchurchComplete = (data: MicrochurchData) => microchurchIssues(data).length === 0;
export function microchurchScores(data: MicrochurchData) {
  return MICROCHURCH_CATEGORIES.map(category => {
    const values = category.statements.map(n => data.ratings[n-1]);
    return { ...category, total: values.every(value => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5) ? values.reduce<number>((sum, value) => sum + Number(value), 0) : null };
  });
}
function readFinished(input: unknown): MicrochurchFinished | null {
  const f = object(input), material = normalizeMicrochurchData(f.participantMaterial);
  return f.schemaVersion === 1 && f.sourceVersion === MICROCHURCH_RENDERER_KEY && typeof f.completedAt === 'string' && Number.isFinite(Date.parse(f.completedAt)) && microchurchComplete(material) ? {schemaVersion: 1, sourceVersion: MICROCHURCH_RENDERER_KEY, completedAt: f.completedAt, participantMaterial: material} : null;
}
export function normalizeMicrochurchEnvelope(input: unknown): MicrochurchEnvelope {
  const root = object(input);
  return {schemaVersion: 1, draft: normalizeMicrochurchData(root.draft ?? root), finished: readFinished(root.finished), previousResults: Array.isArray(root.previousResults) ? root.previousResults.map(readFinished).filter((f): f is MicrochurchFinished => Boolean(f)) : []};
}
export function projectMicrochurchSave(priorInput: unknown, input: unknown, now: string, finish = false, retakeCompletedAt?: string): MicrochurchEnvelope {
  const prior = normalizeMicrochurchEnvelope(priorInput), draft = normalizeMicrochurchData(input);
  if (finish && !microchurchComplete(draft)) throw Error('Rate all 21 statements from 1 to 5 before completing this assessment.');
  const retaking = finish && Boolean(prior.finished && retakeCompletedAt === prior.finished.completedAt);
  const finished: MicrochurchFinished | null = finish && (!prior.finished || retaking) ? {schemaVersion: 1, sourceVersion: MICROCHURCH_RENDERER_KEY, completedAt: now, participantMaterial: structuredClone(draft)} : prior.finished;
  return {schemaVersion: 1, draft, finished, previousResults: retaking && prior.finished ? [...prior.previousResults, prior.finished] : prior.previousResults};
}
export function microchurchResponseItems(data: MicrochurchData) { return MICROCHURCH_QUESTIONS.map((question,i) => ({question: `${i+1}. ${question}`, response: data.ratings[i] === null ? '' : String(data.ratings[i])})); }
