export const EMOTIONAL_HEALTH_RENDERER_KEY = "emotional-health-assessment.v1";
export const EMOTIONAL_HEALTH_RESPONSE_KEY = "emotional_health_assessment";
// Owner's native PurposeOS rule: direct integer sums, no reversal or weighting.
export const EMOTIONAL_HEALTH_SCALE = [
  { value: 1, label: "Strongly Disagree" }, { value: 2, label: "Disagree" },
  { value: 3, label: "Neither Agree nor Disagree" }, { value: 4, label: "Agree" }, { value: 5, label: "Strongly Agree" },
] as const;
export const EMOTIONAL_HEALTH_DOMAINS = [
  {
    "key": "self_awareness",
    "title": "Self-Awareness"
  },
  {
    "key": "self_management",
    "title": "Self-Management"
  },
  {
    "key": "social_awareness",
    "title": "Social Awareness"
  },
  {
    "key": "relationship_management",
    "title": "Relationship Management"
  }
] as const;
export const EMOTIONAL_HEALTH_BANDS = [
  {
    "key": "enrichment",
    "minimum": 0,
    "maximum": 25,
    "title": "Area for enrichment",
    "description": "This points to a place that may need attention, care, and intentional development. These areas often signal where support, formative practices, or gentle accompaniment could be especially helpful."
  },
  {
    "key": "effective",
    "minimum": 26,
    "maximum": 38,
    "title": "Effective functioning",
    "description": "This suggests a generally healthy capacity in this area, with room to strengthen, mature, and stabilize what is already present."
  },
  {
    "key": "enhanced",
    "minimum": 39,
    "maximum": 50,
    "title": "Enhanced skills area",
    "description": "These are strengths that can serve as leverage points, helping support growth in other areas and shaping how this person may naturally show up for others in discipleship and leadership."
  }
] as const;
export type EmotionalHealthDomain = typeof EMOTIONAL_HEALTH_DOMAINS[number]["key"];
export type EmotionalHealthAnswers = Record<string, number>;
export const EMOTIONAL_HEALTH_QUESTIONS: readonly { key: string; domain: EmotionalHealthDomain; text: string }[] = [
  {
    "key": "q1",
    "domain": "self_awareness",
    "text": "My feelings are clear to me at any given moment."
  },
  {
    "key": "q2",
    "domain": "self_awareness",
    "text": "Emotions play an important part in my life."
  },
  {
    "key": "q3",
    "domain": "self_awareness",
    "text": "My moods impact the people around me."
  },
  {
    "key": "q4",
    "domain": "self_awareness",
    "text": "I find it easy to put words to my feelings."
  },
  {
    "key": "q5",
    "domain": "self_awareness",
    "text": "My moods are easily affected by external events."
  },
  {
    "key": "q6",
    "domain": "self_awareness",
    "text": "I can easily sense when I am going to be angry."
  },
  {
    "key": "q7",
    "domain": "self_awareness",
    "text": "I readily tell others my true feelings."
  },
  {
    "key": "q8",
    "domain": "self_awareness",
    "text": "I find it easy to describe my feelings."
  },
  {
    "key": "q9",
    "domain": "self_awareness",
    "text": "Even when I’m upset, I’m aware of what’s happening to me."
  },
  {
    "key": "q10",
    "domain": "self_awareness",
    "text": "I am able to stand apart from my thoughts and feelings and examine them."
  },
  {
    "key": "q11",
    "domain": "self_management",
    "text": "I accept responsibility for my reactions."
  },
  {
    "key": "q12",
    "domain": "self_management",
    "text": "I find it easy to make goals and stick with them."
  },
  {
    "key": "q13",
    "domain": "self_management",
    "text": "I am an emotionally balanced person."
  },
  {
    "key": "q14",
    "domain": "self_management",
    "text": "I am a very patient person."
  },
  {
    "key": "q15",
    "domain": "self_management",
    "text": "I can accept critical comments from others."
  },
  {
    "key": "q16",
    "domain": "self_management",
    "text": "I maintain my composure, even during stressful times."
  },
  {
    "key": "q17",
    "domain": "self_management",
    "text": "If an issue does not affect me directly, I don’t let it bother me."
  },
  {
    "key": "q18",
    "domain": "self_management",
    "text": "I can restrain myself when I feel anger towards someone."
  },
  {
    "key": "q19",
    "domain": "self_management",
    "text": "I control urges to overindulge in things that could damage my well-being."
  },
  {
    "key": "q20",
    "domain": "self_management",
    "text": "I direct my energy into creative work or hobbies."
  },
  {
    "key": "q21",
    "domain": "social_awareness",
    "text": "I consider the impact of my decisions on other people."
  },
  {
    "key": "q22",
    "domain": "social_awareness",
    "text": "I can easily tell if the people around me are becoming annoyed."
  },
  {
    "key": "q23",
    "domain": "social_awareness",
    "text": "I sense it when a person’s mood changes."
  },
  {
    "key": "q24",
    "domain": "social_awareness",
    "text": "I am able to be supportive when giving bad news to others."
  },
  {
    "key": "q25",
    "domain": "social_awareness",
    "text": "I am generally able to understand the way other people feel."
  },
  {
    "key": "q26",
    "domain": "social_awareness",
    "text": "My friends can tell me intimate things about themselves."
  },
  {
    "key": "q27",
    "domain": "social_awareness",
    "text": "It genuinely bothers me to see other people suffer."
  },
  {
    "key": "q28",
    "domain": "social_awareness",
    "text": "I usually know when to speak and when to be silent."
  },
  {
    "key": "q29",
    "domain": "social_awareness",
    "text": "I care what happens to other people."
  },
  {
    "key": "q30",
    "domain": "social_awareness",
    "text": "I understand when people’s plans change."
  },
  {
    "key": "q31",
    "domain": "relationship_management",
    "text": "I am able to show affection."
  },
  {
    "key": "q32",
    "domain": "relationship_management",
    "text": "My relationships are safe places for me."
  },
  {
    "key": "q33",
    "domain": "relationship_management",
    "text": "I find it easy to share my deep feelings with others."
  },
  {
    "key": "q34",
    "domain": "relationship_management",
    "text": "I am good at motivating others."
  },
  {
    "key": "q35",
    "domain": "relationship_management",
    "text": "I am a fairly cheerful person."
  },
  {
    "key": "q36",
    "domain": "relationship_management",
    "text": "It is easy for me to make friends."
  },
  {
    "key": "q37",
    "domain": "relationship_management",
    "text": "People tell me I am sociable and fun."
  },
  {
    "key": "q38",
    "domain": "relationship_management",
    "text": "I like helping people."
  },
  {
    "key": "q39",
    "domain": "relationship_management",
    "text": "Others can depend on me."
  },
  {
    "key": "q40",
    "domain": "relationship_management",
    "text": "I am able to talk someone down if they are very upset."
  }
];
const object = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
export function normalizeEmotionalHealthAnswers(input: unknown): EmotionalHealthAnswers {
  const data = object(input), source = object(data.answers ?? data);
  return Object.fromEntries(EMOTIONAL_HEALTH_QUESTIONS.flatMap(({ key }) => typeof source[key] === "number" && EMOTIONAL_HEALTH_SCALE.some(option => option.value === source[key]) ? [[key, source[key]]] : []));
}
export function emotionalHealthComplete(answers: EmotionalHealthAnswers) { return EMOTIONAL_HEALTH_QUESTIONS.every(q => EMOTIONAL_HEALTH_SCALE.some(option => option.value === answers[q.key])); }
export function emotionalHealthBand(score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 50) throw new Error("Invalid section score.");
  return EMOTIONAL_HEALTH_BANDS.find(band => score >= band.minimum && score <= band.maximum)!;
}
export function emotionalHealthResults(answers: EmotionalHealthAnswers) {
  if (!emotionalHealthComplete(answers)) return null;
  return { scores: EMOTIONAL_HEALTH_DOMAINS.map(domain => {
    const score = EMOTIONAL_HEALTH_QUESTIONS.filter(q => q.domain === domain.key).reduce((sum, q) => sum + answers[q.key], 0);
    return { domain, score, band: emotionalHealthBand(score) };
  }) };
}
export function normalizeEmotionalHealthOrder(input: unknown): string[] {
  return Array.isArray(input) && input.length === 40 && new Set(input).size === 40 && input.every(key => EMOTIONAL_HEALTH_QUESTIONS.some(q => q.key === key)) ? [...input] : EMOTIONAL_HEALTH_QUESTIONS.map(q => q.key);
}
/** Shuffle identities, never scoring positions. Supply RNG only for deterministic tests. */
export function shuffleEmotionalHealthQuestions(random: () => number = Math.random) {
  const order = EMOTIONAL_HEALTH_QUESTIONS.map(q => q.key);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
export type EmotionalHealthSnapshot = { completedAt: string; answers: EmotionalHealthAnswers; order: string[]; scores: Record<EmotionalHealthDomain, number> };
export type EmotionalHealthEnvelope = { schemaVersion: 1; answers: EmotionalHealthAnswers; order: string[]; retakeOf: string | null; finished: EmotionalHealthSnapshot | null; history: EmotionalHealthSnapshot[] };
export function normalizeEmotionalHealthEnvelope(input: unknown): EmotionalHealthEnvelope {
  const data = object(input);
  function snapshot(input: unknown): EmotionalHealthSnapshot | null {
    const item = object(input), answers = normalizeEmotionalHealthAnswers(item.answers), results = emotionalHealthResults(answers);
    return typeof item.completedAt === "string" && Number.isFinite(Date.parse(item.completedAt)) && results ? { completedAt: item.completedAt, answers, order: normalizeEmotionalHealthOrder(item.order), scores: Object.fromEntries(results.scores.map(({ domain, score }) => [domain.key, score])) as Record<EmotionalHealthDomain, number> } : null;
  }
  return { schemaVersion: 1, answers: normalizeEmotionalHealthAnswers(data.answers), order: normalizeEmotionalHealthOrder(data.order), retakeOf: typeof data.retakeOf === "string" ? data.retakeOf : null, finished: snapshot(data.finished), history: Array.isArray(data.history) ? data.history.flatMap(item => { const value = snapshot(item); return value ? [value] : []; }) : [] };
}
/** Preserve completed material during drafts, archive it only on an explicit retake finish. */
export function projectEmotionalHealthSave(prior: unknown, input: unknown, finalize: boolean, now: string, retakeOf?: string | null): EmotionalHealthEnvelope {
  const previous = normalizeEmotionalHealthEnvelope(prior), next = normalizeEmotionalHealthEnvelope(input);
  if (previous.finished && retakeOf !== previous.finished.completedAt) {
    // A completed write may be retried after enrollment completion failed.
    if (retakeOf && finalize && previous.history.at(-1)?.completedAt === retakeOf && JSON.stringify(previous.finished.answers) === JSON.stringify(next.answers)) return previous;
    if (retakeOf) throw new Error("A newer result has been saved. Reload before retaking this assessment.");
    if (finalize && JSON.stringify(previous.finished.answers) !== JSON.stringify(next.answers)) throw new Error("A result is already saved. Reload and choose Retake assessment to change it.");
    return previous;
  }
  const results = emotionalHealthResults(next.answers);
  if (finalize && !results) throw new Error("Answer all 40 statements before saving your results.");
  return { ...next, retakeOf: finalize ? null : retakeOf ?? null,
    history: [...previous.history, ...(finalize && previous.finished ? [previous.finished] : [])],
    finished: finalize && results ? { completedAt: now, answers: next.answers, order: next.order, scores: Object.fromEntries(results.scores.map(({ domain, score }) => [domain.key, score])) as Record<EmotionalHealthDomain, number> } : previous.finished,
  };
}
