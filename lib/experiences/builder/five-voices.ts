export const FIVE_VOICES_RENDERER_KEY = "five-voices-assessment.v1";
export const FIVE_VOICES_RESPONSE_KEY = "five_voices_assessment";
export const FIVE_VOICES_SCALE = [
  { value: 1, label: "Rarely" }, { value: 1.5, label: "Occasionally" },
  { value: 2, label: "Sometimes" }, { value: 2.5, label: "Often" }, { value: 3, label: "Always" },
] as const;
export const FIVE_VOICES_DOMAINS = [
  {
    "key": "nurturer",
    "mark": "N",
    "title": "Nurturer",
    "description": "You tend to notice the people in a situation and what will help them feel valued, supported, and included.",
    "strength": "You create room for honest conversation and help a group stay attentive to people and shared values.",
    "growth": "Express your own perspective early, even when it may lead to disagreement. Caring for others can include saying something difficult.",
    "practice": "At your next meeting, offer your view before asking what everyone else thinks.",
    "communication": "You often communicate through careful listening, encouragement, and attention to how a message will land.",
    "collaboration": "Ask for time to contribute and invite others to consider the human impact of a decision."
  },
  {
    "key": "creative",
    "mark": "Cr",
    "title": "Creative",
    "description": "You tend to see possibilities beyond the immediate situation and imagine how things could be different.",
    "strength": "You help others reconsider assumptions, connect ideas, and explore a fresh direction.",
    "growth": "Make your thinking easier to follow by moving from the big idea to one concrete example and a manageable first step.",
    "practice": "Choose one idea and explain the need it addresses, what it could change, and one small way to try it.",
    "communication": "You often communicate through possibilities, patterns, and connections that others may need time to absorb.",
    "collaboration": "Invite a practical thinker to help turn an emerging idea into an experiment you can evaluate together."
  },
  {
    "key": "guardian",
    "mark": "G",
    "title": "Guardian",
    "description": "You tend to look closely at what a plan requires and what will make it dependable in practice.",
    "strength": "You bring careful judgment, useful questions, and attention to resources and follow-through.",
    "growth": "Pair concerns with a way forward so others can hear your questions as a contribution to progress.",
    "practice": "When you identify a risk, suggest one adjustment or test that would make the next step more workable.",
    "communication": "You often communicate through evidence, clear expectations, and questions about how an idea will work.",
    "collaboration": "Ask what decision is needed now, which details matter most, and what can be learned along the way."
  },
  {
    "key": "connector",
    "mark": "Co",
    "title": "Connector",
    "description": "You tend to see opportunities in relationships and help people become part of something they care about.",
    "strength": "You bring people together, communicate shared purpose, and build enthusiasm for collaboration.",
    "growth": "Leave room for others to shape the idea and be clear about what you can realistically commit to.",
    "practice": "After sharing an idea, ask someone what would make it more meaningful or useful to them.",
    "communication": "You often communicate through stories, invitations, and connections between people and a shared purpose.",
    "collaboration": "Bring the right people into the conversation, then agree on a clear next step and who will follow through."
  },
  {
    "key": "pioneer",
    "mark": "P",
    "title": "Pioneer",
    "description": "You tend to focus on direction, decisions, and the action needed to achieve a meaningful result.",
    "strength": "You help a group clarify priorities, face difficult choices, and turn discussion into action.",
    "growth": "Give others enough time and context to contribute before moving toward a decision.",
    "practice": "Before proposing your preferred direction, ask each person what opportunity or concern they see.",
    "communication": "You often communicate directly, emphasizing the goal, the trade-offs, and what needs to happen next.",
    "collaboration": "Explain why the outcome matters and invite perspectives that might strengthen your chosen approach."
  }
] as const;
export type FiveVoicesDomain = typeof FIVE_VOICES_DOMAINS[number]["key"];
export type FiveVoicesAnswers = Record<string, number>;
/** Original PurposeOS statements. Domain mapping is independent of display order. */
export const FIVE_VOICES_QUESTIONS: readonly { key: string; domain: FiveVoicesDomain; text: string }[] = [
  {
    "key": "q1",
    "domain": "nurturer",
    "text": "Before agreeing to a change, I consider who may need extra support."
  },
  {
    "key": "q2",
    "domain": "nurturer",
    "text": "In group discussions, I notice when someone has not had room to speak."
  },
  {
    "key": "q3",
    "domain": "nurturer",
    "text": "I adjust how I give feedback so the other person feels respected."
  },
  {
    "key": "q4",
    "domain": "nurturer",
    "text": "When a decision affects our values, I draw attention to its impact on people."
  },
  {
    "key": "q5",
    "domain": "nurturer",
    "text": "I make time to check in with a teammate who seems overwhelmed."
  },
  {
    "key": "q6",
    "domain": "creative",
    "text": "I notice possibilities that other people have not considered yet."
  },
  {
    "key": "q7",
    "domain": "creative",
    "text": "When a plan feels stuck, I suggest a different approach."
  },
  {
    "key": "q8",
    "domain": "creative",
    "text": "I connect ideas from unrelated experiences to help solve a problem."
  },
  {
    "key": "q9",
    "domain": "creative",
    "text": "I think ahead about how today’s decisions could shape the future."
  },
  {
    "key": "q10",
    "domain": "creative",
    "text": "I question a familiar way of working when I see a better possibility."
  },
  {
    "key": "q11",
    "domain": "guardian",
    "text": "Before committing to a plan, I ask what time, people, and resources it will require."
  },
  {
    "key": "q12",
    "domain": "guardian",
    "text": "I notice missing details that could cause a problem later."
  },
  {
    "key": "q13",
    "domain": "guardian",
    "text": "I seek evidence behind a suggestion before deciding whether to support it."
  },
  {
    "key": "q14",
    "domain": "guardian",
    "text": "I turn an agreed idea into clear, practical steps."
  },
  {
    "key": "q15",
    "domain": "guardian",
    "text": "When reviewing work, I check whether we have followed through on our commitments."
  },
  {
    "key": "q16",
    "domain": "connector",
    "text": "I introduce people whose interests or abilities could help each other."
  },
  {
    "key": "q17",
    "domain": "connector",
    "text": "I share ideas in a way that makes people want to join in."
  },
  {
    "key": "q18",
    "domain": "connector",
    "text": "I help people see how their contribution connects to a shared purpose."
  },
  {
    "key": "q19",
    "domain": "connector",
    "text": "I bring different groups together when they could benefit from working with each other."
  },
  {
    "key": "q20",
    "domain": "connector",
    "text": "In a new setting, I start conversations to build relationships."
  },
  {
    "key": "q21",
    "domain": "pioneer",
    "text": "When a group keeps debating, I help identify the decision that would move us forward."
  },
  {
    "key": "q22",
    "domain": "pioneer",
    "text": "I challenge an accepted plan when I think it will not achieve the intended outcome."
  },
  {
    "key": "q23",
    "domain": "pioneer",
    "text": "I set ambitious goals that stretch what a group thinks is possible."
  },
  {
    "key": "q24",
    "domain": "pioneer",
    "text": "When comparing options, I focus on which will lead to the most meaningful progress."
  },
  {
    "key": "q25",
    "domain": "pioneer",
    "text": "I take responsibility for moving work from discussion into action."
  }
];
const object = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
export function normalizeFiveVoicesAnswers(input: unknown): FiveVoicesAnswers {
  const data = object(input), source = object(data.answers ?? data);
  return Object.fromEntries(FIVE_VOICES_QUESTIONS.flatMap(({ key }) => typeof source[key] === "number" && FIVE_VOICES_SCALE.some(option => option.value === source[key]) ? [[key, source[key]]] : []));
}
export function fiveVoicesComplete(answers: FiveVoicesAnswers) { return FIVE_VOICES_QUESTIONS.every(q => FIVE_VOICES_SCALE.some(option => option.value === answers[q.key])); }
export function fiveVoicesResults(answers: FiveVoicesAnswers) {
  if (!fiveVoicesComplete(answers)) return null;
  const scores = FIVE_VOICES_DOMAINS.map(domain => ({ domain, score: FIVE_VOICES_QUESTIONS.filter(q => q.domain === domain.key).reduce((sum, q) => sum + answers[q.key], 0) }));
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
export function normalizeFiveVoicesOrder(input: unknown): string[] {
  return Array.isArray(input) && input.length === 25 && new Set(input).size === 25 && input.every(key => FIVE_VOICES_QUESTIONS.some(q => q.key === key)) ? [...input] : FIVE_VOICES_QUESTIONS.map(q => q.key);
}
/** Shuffle identities, never scoring positions. Supply RNG only for deterministic tests. */
export function shuffleFiveVoicesQuestions(random: () => number = Math.random) {
  const order = FIVE_VOICES_QUESTIONS.map(q => q.key);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
export type FiveVoicesSnapshot = { completedAt: string; answers: FiveVoicesAnswers; order: string[]; scores: Record<FiveVoicesDomain, number> };
export type FiveVoicesEnvelope = { schemaVersion: 1; answers: FiveVoicesAnswers; order: string[]; retakeOf: string | null; finished: FiveVoicesSnapshot | null; history: FiveVoicesSnapshot[] };
export function normalizeFiveVoicesEnvelope(input: unknown): FiveVoicesEnvelope {
  const data = object(input);
  function snapshot(input: unknown): FiveVoicesSnapshot | null {
    const item = object(input), answers = normalizeFiveVoicesAnswers(item.answers), results = fiveVoicesResults(answers);
    return typeof item.completedAt === "string" && Number.isFinite(Date.parse(item.completedAt)) && results ? { completedAt: item.completedAt, answers, order: normalizeFiveVoicesOrder(item.order), scores: Object.fromEntries(results.scores.map(({ domain, score }) => [domain.key, score])) as Record<FiveVoicesDomain, number> } : null;
  }
  return { schemaVersion: 1, answers: normalizeFiveVoicesAnswers(data.answers), order: normalizeFiveVoicesOrder(data.order), retakeOf: typeof data.retakeOf === "string" ? data.retakeOf : null, finished: snapshot(data.finished), history: Array.isArray(data.history) ? data.history.flatMap(item => { const value = snapshot(item); return value ? [value] : []; }) : [] };
}
/** Preserve completed material during drafts, archive it only on an explicit retake finish. */
export function projectFiveVoicesSave(prior: unknown, input: unknown, finalize: boolean, now: string, retakeOf?: string | null): FiveVoicesEnvelope {
  const previous = normalizeFiveVoicesEnvelope(prior), next = normalizeFiveVoicesEnvelope(input);
  if (previous.finished && retakeOf !== previous.finished.completedAt) {
    // A completed write may be retried after enrollment completion failed.
    if (retakeOf && finalize && previous.history.at(-1)?.completedAt === retakeOf && JSON.stringify(previous.finished.answers) === JSON.stringify(next.answers)) return previous;
    if (retakeOf) throw new Error("A newer result has been saved. Reload before retaking this assessment.");
    if (finalize && JSON.stringify(previous.finished.answers) !== JSON.stringify(next.answers)) throw new Error("A result is already saved. Reload and choose Retake assessment to change it.");
    return previous;
  }
  const results = fiveVoicesResults(next.answers);
  if (finalize && !results) throw new Error("Answer all 25 statements before saving your results.");
  return { ...next, retakeOf: finalize ? null : retakeOf ?? null,
    history: [...previous.history, ...(finalize && previous.finished ? [previous.finished] : [])],
    finished: finalize && results ? { completedAt: now, answers: next.answers, order: next.order, scores: Object.fromEntries(results.scores.map(({ domain, score }) => [domain.key, score])) as Record<FiveVoicesDomain, number> } : previous.finished,
  };
}
