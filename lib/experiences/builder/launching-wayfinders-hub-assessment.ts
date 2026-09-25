export const LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY = "launching-wayfinders-hub-assessment.v1";
export const LAUNCHING_WAYFINDERS_HUB_RESPONSE_KEY = "launching_wayfinders_hub_assessment";

export type LaunchingHubAnswer = 1 | 2 | 3 | 4 | 5;
export type LaunchingHubAnswers = Readonly<Record<string, LaunchingHubAnswer>>;

export const LAUNCHING_HUB_SCALE = [
  { value: 1, label: "Not yet" },
  { value: 2, label: "Beginning" },
  { value: 3, label: "In process" },
  { value: 4, label: "Growing" },
  { value: 5, label: "Confident and ready to multiply" },
] as const;

export const LAUNCHING_HUB_QUESTIONS = [
  { key: "q1", prompt: "I can help others discover their purpose and clarify how they’re uniquely designed to make an impact." },
  { key: "q2", prompt: "I have a method or tool I can use to walk others through personal growth or leadership development." },
  { key: "q3", prompt: "I feel confident creating safe, relational spaces that others could also replicate in their own communities." },
  { key: "q4", prompt: "I can model and pass on simple practices of spiritual formation and mentoring to others." },
  { key: "q5", prompt: "I know how to help someone move from an idea or passion to launching something practical in their community." },
  { key: "q6", prompt: "I feel equipped to help others recognize needs in their community and align their gifts to meet them." },
  { key: "q7", prompt: "I can guide others in creating an actionable plan for real-world impact, not just inspiration." },
  { key: "q8", prompt: "I can identify and raise up leaders who are capable of guiding others through purpose and discipleship." },
  { key: "q9", prompt: "I maintain spiritual rhythms that both sustain me and serve as a model for others." },
  { key: "q10", prompt: "I’m ready to integrate Wayfinders’ tools and values into my context in a way that others can adopt and multiply." },
] as const;

export const LAUNCHING_HUB_QUESTION_KEYS = LAUNCHING_HUB_QUESTIONS.map(({ key }) => key);

export type ReadinessResult = Readonly<{ key: string; label: string; range: string; description: string; focus: string }>;

export const READINESS_RESULTS = {
  strongHeart: { key: "strong-heart", label: "Strong Heart, Needs Framework", range: "10–20", description: "Strong Heart, Needs Framework – You care deeply and are actively leading, but you may not yet have the confidence or models to replicate what you do.", focus: "The Hub Leader Cohort will give you the confidence, clarity, and support you need to grow. You’ll be personally formed through spiritual rhythms (like Kaleo), and you’ll learn how to use practical tools to lead others into purpose, growth, and multiplication. You won’t just lead; you’ll be transformed." },
  forming: { key: "forming-foundations", label: "Forming Foundations", range: "21–30", description: "Forming Foundations – You’re actively doing meaningful work, but you may need help turning instinctive leadership into something transferable.", focus: "The Hub Leader Cohort will help you build a strong foundation by giving you a proven structure for leadership development, spiritual formation, and local impact. You’ll learn how to equip others with confidence, using tools that are simple and actionable." },
  builder: { key: "builder-in-progress", label: "Builder in Progress", range: "31–40", description: "Builder in Progress – You have solid foundations and emerging tools. You’re practicing leadership and discipleship, and you’re beginning to think about reproducibility.", focus: "The Hub Leader Cohort will give you the language, tools, and clarity to turn what you’re already doing into a repeatable process others can adopt. You’ll gain practical methods for coaching, multiplying, and launching a sustainable hub." },
  reproducer: { key: "reproducer-ready", label: "Reproducer Ready", range: "41–50", description: "Reproducer Ready – You already think like a multiplier. You have strong instincts and practices that others can follow. You’re ready to sharpen and scale.", focus: "The Hub Leader Cohort will help you streamline and scale what you’re already doing by providing transferable tools, simple systems, and frameworks like LMU and Start Something. You’ll be empowered to raise up leaders who multiply others in your context." },
} as const satisfies Record<string, ReadinessResult>;

export function normalizeLaunchingHubAnswers(input: unknown): Record<string, LaunchingHubAnswer> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const value = input as Record<string, unknown>;
  const source = value.answers && typeof value.answers === "object" && !Array.isArray(value.answers) ? value.answers as Record<string, unknown> : value;
  return Object.fromEntries(LAUNCHING_HUB_QUESTION_KEYS.flatMap((key) => [1, 2, 3, 4, 5].includes(Number(source[key])) ? [[key, Number(source[key]) as LaunchingHubAnswer]] : []));
}

export const launchingHubComplete = (answers: LaunchingHubAnswers) => LAUNCHING_HUB_QUESTION_KEYS.every((key) => [1, 2, 3, 4, 5].includes(answers[key]));
export const launchingHubStatus = (answers: LaunchingHubAnswers): "draft" | "submitted" => launchingHubComplete(answers) ? "submitted" : "draft";
export function firstIncompleteLaunchingHubQuestion(answers: LaunchingHubAnswers) { const index = LAUNCHING_HUB_QUESTION_KEYS.findIndex((key) => ![1, 2, 3, 4, 5].includes(answers[key])); return index < 0 ? 10 : index; }
export function readinessForScore(score: number): ReadinessResult { if (score <= 20) return READINESS_RESULTS.strongHeart; if (score <= 30) return READINESS_RESULTS.forming; if (score <= 40) return READINESS_RESULTS.builder; return READINESS_RESULTS.reproducer; }
export function launchingHubResult(answers: LaunchingHubAnswers) { if (!launchingHubComplete(answers)) return null; const score = LAUNCHING_HUB_QUESTION_KEYS.reduce((sum, key) => sum + answers[key], 0); return { score, readiness: readinessForScore(score) }; }
