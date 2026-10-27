export const APEST_RENDERER_KEY = "apest-assessment.v1";
export const APEST_RESPONSE_KEY = "apest_assessment";
export const APEST_SCALE_NOTE = "The original paper uses a 3-point scale: 1 Rarely, 2 Sometimes, 3 Always. This digital adaptation intentionally adds 1.5 and 2.5 between those points.";
export const APEST_SCALE = [
  { value: 1, label: "Rarely" }, { value: 1.5, label: "Occasionally" },
  { value: 2, label: "Sometimes" }, { value: 2.5, label: "Often" }, { value: 3, label: "Always" },
] as const;
export const APEST_DOMAINS = [
  { key: "A", title: "Apostle", description: "You may be drawn to starting new work, seeing possibilities, and shaping a direction others can pursue.", strength: "Initiating, clarifying vision, and creating momentum.", growth: "Invite others to test your ideas and help make them sustainable.", practice: "Name one possibility, listen to those it would affect, and choose a small first step." },
  { key: "P", title: "Prophet", description: "You may notice gaps between what people believe and how they live, with a concern for truth and people at the margins.", strength: "Discernment, conviction, and attention to justice.", growth: "Join truthfulness with patience, care, and a willingness to hear another perspective.", practice: "Bring one concern to a trusted person and explore a constructive response together." },
  { key: "E", title: "Evangelist", description: "You may enjoy sharing what matters to you and helping others become interested and involved.", strength: "Storytelling, enthusiasm, and making connections across differences.", growth: "Make room for questions and listen without pressing for agreement.", practice: "Ask someone about their story before sharing a part of your own." },
  { key: "S", title: "Shepherd", description: "You may be attentive to people’s needs, helping them feel known, safe, and supported over time.", strength: "Listening, empathy, belonging, and sustained care.", growth: "Set healthy limits and equip others to share responsibility for care.", practice: "Check in with someone and ask what kind of support would actually help." },
  { key: "T", title: "Teacher", description: "You may enjoy understanding ideas and helping people learn, practice, and apply them clearly.", strength: "Explaining, careful listening, and practical learning.", growth: "Leave room for uncertainty and check whether understanding leads to useful action.", practice: "Help someone practice one idea, then ask what became clearer and what remains confusing." },
] as const;
export type ApestDomain = typeof APEST_DOMAINS[number]["key"];
export type ApestAnswers = Record<string, number>;
export const APEST_QUESTIONS: readonly { key: string; domain: ApestDomain; text: string }[] = [
  { key: "q1", domain: "A", text: "I can be counted on to contribute original ideas" },
  { key: "q2", domain: "A", text: "I can clarify goals, develop strategies, and cast a vision to accomplish tasks." },
  { key: "q3", domain: "A", text: "I like change even when it makes others uncomfortable." },
  { key: "q4", domain: "A", text: "I’ve always wanted to build a business/organization from the ground up so I can give my specific vision to it." },
  { key: "q5", domain: "A", text: "People describe me as entrepreneurial." },
  { key: "q6", domain: "P", text: "I can accurately assess a person based on first impressions and know instinctively if they are being real with me." },
  { key: "q7", domain: "P", text: "Social justice for the poor and marginalized means a great deal to me." },
  { key: "q8", domain: "P", text: "I sometimes get frustrated and even depressed at the lack of faith or understanding of others around me." },
  { key: "q9", domain: "P", text: "I sometimes feel compelled to speak the truth even if it makes others feel uncomfortable." },
  { key: "q10", domain: "P", text: "I regularly like to be alone for long periods of time to reflect and think." },
  { key: "q11", domain: "E", text: "When I’m excited about something, I get others interested in it too." },
  { key: "q12", domain: "E", text: "People with different value systems have said that they feel comfortable when they are around me." },
  { key: "q13", domain: "E", text: "I like to tell stories, especially my own." },
  { key: "q14", domain: "E", text: "I like to share what I believe." },
  { key: "q15", domain: "E", text: "Sometimes, in my enthusiasm, I push my views too far with people." },
  { key: "q16", domain: "S", text: "I am good at listening and taking in what people say." },
  { key: "q17", domain: "S", text: "I remember names or at least where I first met someone." },
  { key: "q18", domain: "S", text: "I like to provide a safe and comfortable environment where people feel they are welcome, that they belong, are listened to and cared for." },
  { key: "q19", domain: "S", text: "I am faithful in providing support, care and nurture for others over long periods of time, even when others have stopped." },
  { key: "q20", domain: "S", text: "I empathize with those who are hurting or broken and can support them through their pain to wholeness." },
  { key: "q21", domain: "T", text: "People say I am good at presenting information and ideas." },
  { key: "q22", domain: "T", text: "I try explaining things in different ways if people are finding a concept difficult to grasp or understand." },
  { key: "q23", domain: "T", text: "I love to show people how to do things that I do well." },
  { key: "q24", domain: "T", text: "I enjoy taking notes when someone is speaking and pay close attention to the details of what they are saying." },
  { key: "q25", domain: "T", text: "I enjoy coming up with the best, most efficient way to do a task right." },
];
const object = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
export function normalizeApestAnswers(input: unknown): ApestAnswers {
  const data = object(input), source = object(data.answers ?? data);
  return Object.fromEntries(APEST_QUESTIONS.flatMap(({ key }) => typeof source[key] === "number" && APEST_SCALE.some(option => option.value === source[key]) ? [[key, source[key]]] : []));
}
export function apestComplete(answers: ApestAnswers) { return APEST_QUESTIONS.every(q => APEST_SCALE.some(option => option.value === answers[q.key])); }
export function apestResults(answers: ApestAnswers) {
  if (!apestComplete(answers)) return null;
  const scores = APEST_DOMAINS.map(domain => ({ domain, score: APEST_QUESTIONS.filter(q => q.domain === domain.key).reduce((sum, q) => sum + answers[q.key], 0) }));
  const highest = Math.max(...scores.map(item => item.score));
  const levels = [...new Set(scores.map(item => item.score))].sort((a, b) => b - a);
  const ranked = [...scores].sort((a, b) => b.score - a.score).map(item => {
    const rank = levels.indexOf(item.score) + 1;
    const tied = scores.filter(other => other.score === item.score).length > 1;
    const label = rank === 1 ? "Primary" : rank === 2 ? "Secondary" : `Rank ${rank}`;
    return { ...item, rank, label: tied ? `${label} · tied` : label };
  });
  return { scores, ranked, strongest: scores.filter(item => item.score === highest), allEqual: scores.every(item => item.score === highest) };
}
export function normalizeApestOrder(input: unknown): string[] {
  return Array.isArray(input) && input.length === 25 && new Set(input).size === 25 && input.every(key => APEST_QUESTIONS.some(q => q.key === key)) ? [...input] : APEST_QUESTIONS.map(q => q.key);
}
/** Shuffle identities, never scoring positions. Supply RNG only for deterministic tests. */
export function shuffleApestQuestions(random: () => number = Math.random) {
  const order = APEST_QUESTIONS.map(q => q.key);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
export type ApestSnapshot = { completedAt: string; answers: ApestAnswers; order: string[]; scores: Record<ApestDomain, number> };
export type ApestEnvelope = { schemaVersion: 1; answers: ApestAnswers; order: string[]; retakeOf: string | null; finished: ApestSnapshot | null; history: ApestSnapshot[] };
export function normalizeApestEnvelope(input: unknown): ApestEnvelope {
  const data = object(input);
  function snapshot(input: unknown): ApestSnapshot | null {
    const item = object(input), answers = normalizeApestAnswers(item.answers), results = apestResults(answers);
    return typeof item.completedAt === "string" && Number.isFinite(Date.parse(item.completedAt)) && results ? { completedAt: item.completedAt, answers, order: normalizeApestOrder(item.order), scores: Object.fromEntries(results.scores.map(({ domain, score }) => [domain.key, score])) as Record<ApestDomain, number> } : null;
  }
  return { schemaVersion: 1, answers: normalizeApestAnswers(data.answers), order: normalizeApestOrder(data.order), retakeOf: typeof data.retakeOf === "string" ? data.retakeOf : null, finished: snapshot(data.finished), history: Array.isArray(data.history) ? data.history.flatMap(item => { const value = snapshot(item); return value ? [value] : []; }) : [] };
}
/** Preserve completed material during drafts, archive it only on an explicit retake finish. */
export function projectApestSave(prior: unknown, input: unknown, finalize: boolean, now: string, retakeOf?: string | null): ApestEnvelope {
  const previous = normalizeApestEnvelope(prior), next = normalizeApestEnvelope(input);
  if (previous.finished && retakeOf !== previous.finished.completedAt) {
    // A completed write may be retried after enrollment completion failed.
    if (retakeOf && finalize && previous.history.at(-1)?.completedAt === retakeOf && JSON.stringify(previous.finished.answers) === JSON.stringify(next.answers)) return previous;
    if (retakeOf) throw new Error("A newer result has been saved. Reload before retaking this assessment.");
    if (finalize && JSON.stringify(previous.finished.answers) !== JSON.stringify(next.answers)) throw new Error("A result is already saved. Reload and choose Retake assessment to change it.");
    return previous;
  }
  const results = apestResults(next.answers);
  if (finalize && !results) throw new Error("Answer all 25 statements before saving your results.");
  return { ...next, retakeOf: finalize ? null : retakeOf ?? null,
    history: [...previous.history, ...(finalize && previous.finished ? [previous.finished] : [])],
    finished: finalize && results ? { completedAt: now, answers: next.answers, order: next.order, scores: Object.fromEntries(results.scores.map(({ domain, score }) => [domain.key, score])) as Record<ApestDomain, number> } : previous.finished,
  };
}
