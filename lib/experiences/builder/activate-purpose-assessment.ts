export const ACTIVATE_PURPOSE_RENDERER_KEY = "activate-your-purpose-assessment.v1";
export const ACTIVATE_PURPOSE_RESPONSE_KEY = "activate_your_purpose_assessment";

export type ActivatePurposeAnswer = "A" | "B" | "C" | "D";
export type ActivatePurposeAnswers = Readonly<Record<string, ActivatePurposeAnswer>>;

export type ActivatePurposeArea = Readonly<{
  key: "everyday-disciple" | "everyday-leader" | "everyday-impact";
  title: string;
  description: string;
  questions: readonly ActivatePurposeQuestion[];
}>;

export type ActivatePurposeQuestion = Readonly<{
  key: `q${number}`;
  prompt: string;
  options: Readonly<Record<ActivatePurposeAnswer, string>>;
}>;

export type GrowthStage = Readonly<{
  key: "onlooker" | "participant" | "leader" | "multiplier";
  title: "Onlooker" | "Participant" | "Leader" | "Multiplier";
  range: "5–8" | "9–13" | "14–17" | "18–20";
  description: string;
}>;

const options = (A: string, B: string, C: string, D: string): ActivatePurposeQuestion["options"] => ({ A, B, C, D });

export const ACTIVATE_PURPOSE_AREAS: readonly ActivatePurposeArea[] = [
  {
    key: "everyday-disciple",
    title: "Everyday Disciple",
    description: "Discovering who I am and growing in my relationship with God and others.",
    questions: [
      { key: "q1", prompt: "How would you describe your current relationship with God?", options: options("I’m curious but not consistently connected.", "I’m learning spiritual practices like prayer, Bible reading, and community.", "I help others grow spiritually and intentionally disciple a few.", "I actively raise up others who also make disciples.") },
      { key: "q2", prompt: "How often do you engage with Scripture in a meaningful way?", options: options("Rarely or occasionally when I hear it at church or online.", "A few times a week on my own or with a group.", "Daily, with an intentional rhythm of study and application.", "I teach others how to engage with Scripture in transformative ways.") },
      { key: "q3", prompt: "How connected are you to Christian community?", options: options("I attend a service or gathering from time to time.", "I’m regularly involved in a group or community.", "I help lead or serve within a Christian community.", "I equip others to start and lead communities.") },
      { key: "q4", prompt: "How do you respond to spiritual struggles or questions?", options: options("I mostly wrestle with them alone or feel stuck.", "I seek help from others and reflect on God’s truth.", "I process them with others and help them navigate their own.", "I coach or mentor others in their spiritual questions and growth.") },
      { key: "q5", prompt: "How do you live out your faith daily?", options: options("I think about it sometimes, but it’s not part of my everyday life.", "I try to apply what I’m learning to my daily choices.", "I intentionally bring my faith into every sphere of life.", "I help others integrate faith into their everyday living.") },
    ],
  },
  {
    key: "everyday-leader",
    title: "Everyday Leader",
    description: "Developing my influence and guiding others toward growth and purpose.",
    questions: [
      { key: "q6", prompt: "How do you view your role in influencing others?", options: options("I don’t think I have much influence.", "I try to be a good example in my relationships.", "I intentionally guide or lead others in a group, team, or role.", "I empower and coach others to become leaders themselves.") },
      { key: "q7", prompt: "How do you respond when someone seeks your help or advice?", options: options("I feel unsure of what to say or do.", "I listen and share from my own experience.", "I help others grow by asking questions and offering guidance.", "I train others to support and lead those around them.") },
      { key: "q8", prompt: "How are you developing as a leader?", options: options("I haven’t taken steps toward leadership yet.", "I’ve started learning about leadership and serving on a team.", "I lead others in some capacity and continue to grow in it.", "I develop new leaders and help build leadership pathways.") },
      { key: "q9", prompt: "When faced with challenges in leadership or influence, how do you respond?", options: options("I avoid or defer to others.", "I ask for help and do my best to grow through it.", "I take ownership and help others through challenges.", "I equip others to lead through challenges with wisdom and courage.") },
      { key: "q10", prompt: "How do you contribute to shaping vision or direction in your context?", options: options("I mostly follow the lead of others.", "I share ideas and offer feedback when asked.", "I help clarify and communicate vision with a team.", "I create environments where others develop and carry vision forward.") },
    ],
  },
  {
    key: "everyday-impact",
    title: "Everyday Impact",
    description: "Living out my purpose through service, generosity, and multiplying good.",
    questions: [
      { key: "q11", prompt: "How do you currently engage in meeting the needs of others?", options: options("I notice needs but rarely take action.", "I participate in projects or give when I can.", "I consistently serve in ways aligned with my skills and passion.", "I lead others in serving and mobilize people for greater impact.") },
      { key: "q12", prompt: "How are you using your gifts and passions for the common good?", options: options("I’m not sure what my gifts or passions are.", "I’ve explored them and am starting to use them.", "I’m using them with focus and intentionality in specific areas.", "I help others discover and activate their gifts and passions.") },
      { key: "q13", prompt: "How are you investing in the next generation or future leaders?", options: options("I haven’t thought much about it.", "I occasionally encourage or support younger people.", "I intentionally mentor or develop someone younger.", "I create structures or systems that help others multiply impact.") },
      { key: "q14", prompt: "What role does generosity play in your life?", options: options("I give when I can, but it’s not regular or planned.", "I give regularly and try to be mindful of needs around me.", "I practice sacrificial generosity as a part of my lifestyle.", "I invite and inspire others to live generously with their resources.") },
      { key: "q15", prompt: "How do you approach problems or brokenness in your community or world?", options: options("I feel overwhelmed and unsure where to start.", "I join others in addressing needs when possible.", "I initiate efforts to solve problems and bring healing.", "I equip others to take action and multiply solutions.") },
    ],
  },
] as const;

export const ACTIVATE_PURPOSE_QUESTIONS = ACTIVATE_PURPOSE_AREAS.flatMap((area) => area.questions);
export const ACTIVATE_PURPOSE_QUESTION_KEYS = ACTIVATE_PURPOSE_QUESTIONS.map((question) => question.key);
export const ACTIVATE_PURPOSE_SCORE: Readonly<Record<ActivatePurposeAnswer, number>> = { A: 1, B: 2, C: 3, D: 4 };

export function normalizeActivatePurposeAnswers(input: unknown): Record<string, ActivatePurposeAnswer> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const value = input as Record<string, unknown>;
  const source = value.answers && typeof value.answers === "object" && !Array.isArray(value.answers) ? value.answers as Record<string, unknown> : value;
  return Object.fromEntries(ACTIVATE_PURPOSE_QUESTION_KEYS.flatMap((key) => ["A", "B", "C", "D"].includes(String(source[key])) ? [[key, source[key] as ActivatePurposeAnswer]] : []));
}

export function activatePurposeComplete(answers: ActivatePurposeAnswers): boolean {
  return ACTIVATE_PURPOSE_QUESTION_KEYS.every((key) => Boolean(ACTIVATE_PURPOSE_SCORE[answers[key]]));
}

export function activatePurposeStatus(answers: ActivatePurposeAnswers): "draft" | "submitted" {
  return activatePurposeComplete(answers) ? "submitted" : "draft";
}

export function firstIncompleteActivatePurposeQuestion(answers: ActivatePurposeAnswers): number {
  const index = ACTIVATE_PURPOSE_QUESTION_KEYS.findIndex((key) => !ACTIVATE_PURPOSE_SCORE[answers[key]]);
  return index < 0 ? ACTIVATE_PURPOSE_QUESTION_KEYS.length : index;
}

export function growthStage(score: number): GrowthStage {
  if (score <= 8) return { key: "onlooker", title: "Onlooker", range: "5–8", description: "You’re exploring or observing this area of growth. You may feel curious but haven’t stepped in consistently yet." };
  if (score <= 13) return { key: "participant", title: "Participant", range: "9–13", description: "You’ve started engaging intentionally and are growing through experience and learning." };
  if (score <= 17) return { key: "leader", title: "Leader", range: "14–17", description: "You’re actively leading, guiding others, and taking responsibility in this area." };
  return { key: "multiplier", title: "Multiplier", range: "18–20", description: "You’re equipping and empowering others to grow, lead, and multiply their own impact." };
}

export function activatePurposeResults(answers: ActivatePurposeAnswers) {
  if (!activatePurposeComplete(answers)) return null;
  return ACTIVATE_PURPOSE_AREAS.map((area) => {
    const score = area.questions.reduce((sum, question) => sum + ACTIVATE_PURPOSE_SCORE[answers[question.key]], 0);
    return { area, score, stage: growthStage(score) };
  });
}
