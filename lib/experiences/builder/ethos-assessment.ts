export const ETHOS_RENDERER_KEY = "wayfinders-ethos-assessment.v1";
export const ETHOS_RESPONSE_KEY = "wayfinders_ethos_assessment";

export type EthosAnswerKey = `q${number}`;
export type EthosAnswers = Readonly<Record<string, number>>;

export type EthosCategory = Readonly<{
  key: string;
  title: string;
  belief: string;
  description: string;
  questions: readonly Readonly<{ key: EthosAnswerKey; text: string }>[];
}>;

export const ETHOS_CATEGORIES: readonly EthosCategory[] = [
  {
    key: "purpose-driven-identity",
    title: "Purpose-Driven Identity",
    belief: "Everyone is made with a purpose. That purpose activated allows others to discover their path to peace.",
    description: "Wayfinders live from the deep conviction that every person is created with a unique, God-given purpose. Our identity is not found in our titles, accomplishments, or failures, but in being beloved children of God. When we live from that place, we don’t strive to prove ourselves. We live to align our actions with the calling placed on our lives.",
    questions: [
      { key: "q1", text: "I know who I am apart from my roles, achievements, or others' expectations." },
      { key: "q2", text: "I regularly reflect on how God has uniquely designed me to make an impact." },
      { key: "q3", text: "I make decisions that align with my calling, not just my comfort." },
    ],
  },
  {
    key: "abundance-over-scarcity",
    title: "Abundance Over Scarcity",
    belief: "We are called to promote the common good through personal growth and understanding the needs of those around us.",
    description: "Wayfinders trust that God’s provision is enough. Rather than leading from fear, competition, or self-protection, we choose generosity, collaboration, and hope. We believe there is always enough time, space, and opportunity for everyone to thrive when we steward our gifts with open hands and hearts.",
    questions: [
      { key: "q4", text: "I trust God to provide what I need, even when resources feel limited." },
      { key: "q5", text: "I willingly share my time, wisdom, or resources with others." },
      { key: "q6", text: "I celebrate others' success without comparing or competing." },
    ],
  },
  {
    key: "presence-over-performance",
    title: "Presence Over Performance",
    belief: "Together, we can find the way.",
    description: "Wayfinders value people over platforms. We believe that true transformation happens through Spirit-led relationships, not polished presentations. In every setting—ministry, leadership, work, and home—we slow down, listen well, and show up authentically, knowing that presence is more powerful than performance.",
    questions: [
      { key: "q7", text: "I value people over productivity." },
      { key: "q8", text: "I intentionally slow down to be fully present in relationships." },
      { key: "q9", text: "I resist the pressure to prove my worth through performance." },
    ],
  },
  {
    key: "pathways-not-programs",
    title: "Pathways, Not Programs",
    belief: "In everything I do, I seek to build pathways that eliminate barriers.",
    description: "Wayfinders don’t build systems to “fix” people. They create pathways to walk with them. We meet people where they are and help them take their next step toward growth. Our leadership is flexible, Spirit-responsive, and focused on removing barriers so others can encounter God’s purpose for their lives.",
    questions: [
      { key: "q10", text: "I walk with people in their growth instead of trying to “fix” them." },
      { key: "q11", text: "I can recognize and name realistic next steps for myself and others." },
      { key: "q12", text: "I adapt how I lead based on the needs and readiness of others." },
    ],
  },
  {
    key: "multiplication-through-empowerment",
    title: "Multiplication Through Empowerment",
    belief: "We are commissioned to go into the world and share the Good News by living as the royal priesthood.",
    description: "Wayfinders don’t just lead; they release. We equip and empower others to live out their purpose and multiply their impact. Rather than holding onto leadership or influence, we pour into others so that they can go further, lead boldly, and disciple others in return. Our legacy is not in what we build but in who we raise up.",
    questions: [
      { key: "q13", text: "I regularly invest in others and help them grow." },
      { key: "q14", text: "I release leadership instead of holding onto control." },
      { key: "q15", text: "I equip others to multiply their own impact, not just assist mine." },
    ],
  },
] as const;

export const ETHOS_QUESTION_KEYS = ETHOS_CATEGORIES.flatMap((category) => category.questions.map((question) => question.key));

export function normalizeEthosAnswers(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = "answers" in input && input.answers && typeof input.answers === "object" && !Array.isArray(input.answers) ? input.answers as Record<string, unknown> : input as Record<string, unknown>;
  return Object.fromEntries(ETHOS_QUESTION_KEYS.flatMap((key) => Number.isInteger(source[key]) && Number(source[key]) >= 1 && Number(source[key]) <= 5 ? [[key, Number(source[key])]] : []));
}

export function ethosComplete(answers: EthosAnswers) {
  return ETHOS_QUESTION_KEYS.every((key) => Number.isInteger(answers[key]) && answers[key] >= 1 && answers[key] <= 5);
}

export function ethosResults(answers: EthosAnswers) {
  if (!ethosComplete(answers)) return null;
  const scores = ETHOS_CATEGORIES.map((category) => ({ category, score: category.questions.reduce((sum, question) => sum + answers[question.key], 0) }));
  const maximum = Math.max(...scores.map((item) => item.score));
  const minimum = Math.min(...scores.map((item) => item.score));
  return { scores, strongest: scores.filter((item) => item.score === maximum), growth: scores.filter((item) => item.score === minimum), allEqual: maximum === minimum };
}
