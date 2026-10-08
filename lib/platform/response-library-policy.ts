import { CIRCLE_AREAS, CIRCLE_RESPONSE_KEY, normalizeCircleData } from "../experiences/builder/circle-of-influence.ts";
import { ACTIVATE_PURPOSE_QUESTIONS, activatePurposeResults, normalizeActivatePurposeAnswers } from "../experiences/builder/activate-purpose-assessment.ts";
import { ETHOS_CATEGORIES, ethosResults, normalizeEthosAnswers } from "../experiences/builder/ethos-assessment.ts";
import { LAUNCHING_HUB_QUESTIONS, LAUNCHING_HUB_SCALE, launchingHubResult, normalizeLaunchingHubAnswers } from "../experiences/builder/launching-wayfinders-hub-assessment.ts";
import { START_SOMETHING_PROMPTS, normalizeStartSomethingData } from "../experiences/builder/start-something.ts";
import { composeRoughDraftOne, composeRoughDraftTwo, normalizePersonalImpactData } from "../experiences/builder/personal-impact-statement.ts";

export type ResponseItem = { question: string; response: string; answered?: boolean };
export type SavedActivity = { loadKey?: string; id: string; title: string; location: string; assessment: boolean; status: string; updatedAt: string; items: ResponseItem[]; results?: ResponseItem[]; locked?: boolean; href?: string };
export type ResponseWeek = { id: string; title: string; activities: SavedActivity[] };
export type ResponseCourse = { id: string; title: string; version: string; weeks: ResponseWeek[]; locked?: boolean; href?: string };
export type ResponseLibraryData = { name: string; courses: ResponseCourse[] };

export function isAssessmentActivity(responseKey: string, blockType: string, rendererKey: string | null, experienceType: string) {
  return experienceType === "assessment"
    || responseKey.endsWith("_assessment")
    || /assessment(?:\.v\d+)?$/.test(rendererKey ?? "")
    || ["prebuilt_assessment", "custom_component", "system_component"].includes(blockType);
}

export function canReviewMemberResponses(input: { globalRole: string | null; scopedFacilitator: boolean; memberRole: string | null }) {
  return input.globalRole === "admin" || input.globalRole === "super_admin" || input.scopedFacilitator || input.memberRole === "facilitator";
}
export function weekTitle(title: string, index: number, assessment = false) {
  return assessment ? title : /^week\b/i.test(title.trim()) ? title : `Week ${index + 1} · ${title}`;
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function readable(key: string) { return key.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
const labels: Record<string, string> = { ...START_SOMETHING_PROMPTS, area_of_influence: "What is your area of influence?", causes: "Which causes do you care about?", causes_other: "Other causes", rough_1_to: "I want to…", rough_1_by: "By…", rough_1_so_that: "So that…", world_change: "What could change in the world?", mission_loss: "What would be lost without your mission?", rough_2_i_will: "I will…", rough_2_help: "Help…", rough_2_provides: "Which provides…", distilled_statement: "Distilled statement", final_impact_statement: "Final Personal Impact Statement" };
export function readableResponseFields(data: unknown, prefix = ""): ResponseItem[] {
  if (Array.isArray(data)) return data.flatMap((value, index) => typeof value === "object" ? readableResponseFields(value, `${prefix} ${index + 1}`) : value === null || value === "" ? [] : [{ question: prefix, response: String(value) }]);
  return Object.entries(object(data)).flatMap(([key, value]) => {
    if (["schemaVersion", "schema_version", "sourceVersion", "completedAt", "updatedAt", "finished", "finalized_at"].includes(key) || value === null || value === "" || value === undefined) return [];
    const question = labels[key] ?? [prefix, readable(key)].filter(Boolean).join(" · ");
    if (typeof value === "object") return readableResponseFields(value, question);
    return [{ question, response: typeof value === "boolean" ? value ? "Yes" : "No" : String(value) }];
  });
}
export function activityResponseItems(responseKey: string, data: unknown, configuration: unknown = {}, includeUnanswered = false): ResponseItem[] {
  const envelope = object(data), finished = object(envelope.finished);
  const currentDraft = envelope.draft ?? envelope.answers;
  const completedMaterial = finished.answers ?? finished.participantMaterial;
  if (responseKey === CIRCLE_RESPONSE_KEY) {
    const circle = normalizeCircleData(completedMaterial ?? currentDraft ?? data);
    return [...CIRCLE_AREAS.flatMap(area => {
      const response = circle.people[area.key].filter(name => name.trim()).join(" · ");
      return response || includeUnanswered ? [{ question: area.key === "other" ? circle.otherLabel || "Other" : area.title, response: response || "Not answered", answered: Boolean(response) }] : [];
    }), ...readableResponseFields({ prayer: circle.prayer, disciple: circle.disciple, next_step: circle.nextStep })];
  }
  if (responseKey === "personal_impact_statement") {
    const statement = normalizePersonalImpactData(completedMaterial ?? currentDraft ?? envelope.response ?? data);
    const response = statement.final_impact_statement.trim() || statement.distilled_statement.trim()
      || (statement.rough_2_i_will.trim() && statement.rough_2_help.trim() && statement.rough_2_provides.trim() ? composeRoughDraftTwo(statement) : "")
      || (statement.rough_1_to.trim() && statement.rough_1_by.trim() && statement.rough_1_so_that.trim() ? composeRoughDraftOne(statement) : "");
    if (includeUnanswered) return allResponseFields(statement);
    return [
      ...readableResponseFields({ area_of_influence: statement.area_of_influence, causes: statement.causes, causes_other: statement.causes_other, world_change: statement.world_change, mission_loss: statement.mission_loss }),
      ...(response ? [{ question: "Personal Impact Statement", response }] : []),
    ];
  }
  if (completedMaterial && currentDraft && JSON.stringify(currentDraft) !== JSON.stringify(completedMaterial)) {
    return [...activityResponseItems(responseKey, { finished }, configuration, includeUnanswered).map((item) => ({ ...item, question: `Completed · ${item.question}` })), ...activityResponseItems(responseKey, { draft: currentDraft }, configuration, includeUnanswered).map((item) => ({ ...item, question: `Current draft · ${item.question}` }))];
  }
  const saved = finished.answers ?? finished.participantMaterial ?? envelope.draft ?? envelope.response ?? data;
  if (responseKey === "activate_your_purpose_assessment") {
    const answers = normalizeActivatePurposeAnswers(saved);
    return ACTIVATE_PURPOSE_QUESTIONS.flatMap<ResponseItem>((question) => answers[question.key] ? [{ question: question.prompt, response: `${answers[question.key]} · ${question.options[answers[question.key]]}`, ...(includeUnanswered ? { answered: true } : {}) }] : includeUnanswered ? [{ question: question.prompt, response: "Not answered", answered: false }] : []);
  }
  if (responseKey === "wayfinders_ethos_assessment") {
    const answers = normalizeEthosAnswers(saved);
    return ETHOS_CATEGORIES.flatMap((category) => category.questions.flatMap<ResponseItem>((question) => answers[question.key] ? [{ question: `${category.title} · ${question.text}`, response: `${answers[question.key]} / 5`, ...(includeUnanswered ? { answered: true } : {}) }] : includeUnanswered ? [{ question: `${category.title} · ${question.text}`, response: "Not answered", answered: false }] : []));
  }
  if (responseKey === "launching_wayfinders_hub_assessment") {
    const answers = normalizeLaunchingHubAnswers(saved);
    return LAUNCHING_HUB_QUESTIONS.flatMap<ResponseItem>((question) => answers[question.key] ? [{ question: question.prompt, response: `${answers[question.key]} / 5 · ${LAUNCHING_HUB_SCALE.find((option) => option.value === answers[question.key])?.label ?? ""}`, ...(includeUnanswered ? { answered: true } : {}) }] : includeUnanswered ? [{ question: question.prompt, response: "Not answered", answered: false }] : []);
  }
  if (includeUnanswered && responseKey === "start_something") return allResponseFields(normalizeStartSomethingData(saved));
  const value = object(saved);
  const options = object(configuration).options;
  const optionLabel = (key: unknown) => Array.isArray(options) ? String(object(options.find((option) => object(option).key === key)).label ?? key) : String(key);
  if (typeof value.value === "string") return value.value.trim() ? [{ question: "", response: optionLabel(value.value), ...(includeUnanswered ? { answered: true } : {}) }] : includeUnanswered ? [{ question: "", response: "Not answered", answered: false }] : [];
  if (typeof value.value === "boolean") return [{ question: "", response: value.value ? "Yes" : "No", ...(includeUnanswered ? { answered: true } : {}) }];
  if (Array.isArray(value.values)) return value.values.length ? [{ question: "", response: value.values.map(optionLabel).join(" · "), ...(includeUnanswered ? { answered: true } : {}) }] : includeUnanswered ? [{ question: "", response: "Not answered", answered: false }] : [];
  const items = readableResponseFields(saved);
  return includeUnanswered ? (items.length ? items.map((item) => ({ ...item, ...(includeUnanswered ? { answered: true } : {}) })) : [{ question: "", response: "Not answered", answered: false }]) : items;
}

// Summaries use the same scoring functions as the participant result screens.
// Submitted inline assessments store answers directly; standalone assessments
// preserve them in a finished snapshot, which takes precedence over later drafts.
export function activityResultItems(responseKey: string, data: unknown, status: string, finalizedAt: string | null): ResponseItem[] {
  if (!["submitted", "finalized"].includes(status) || !finalizedAt) return [];
  const envelope = object(data), finished = object(envelope.finished);
  if (envelope.finished && finished.completedAt !== finalizedAt) return [];
  const answers = finished.answers ?? envelope.answers;
  if (responseKey === "activate_your_purpose_assessment") {
    const results = activatePurposeResults(normalizeActivatePurposeAnswers(answers));
    if (!results) return [];
    const maximum = Math.max(...results.map((result) => result.score));
    const minimum = Math.min(...results.map((result) => result.score));
    return [
      ...(maximum === minimum ? [{ question: "Area comparison", response: "All areas are tied." }] : [
        { question: "Highest areas", response: results.filter((result) => result.score === maximum).map((result) => `${result.area.title} · ${result.score} / 20`).join("; ") },
        { question: "Lowest areas", response: results.filter((result) => result.score === minimum).map((result) => `${result.area.title} · ${result.score} / 20`).join("; ") },
      ]),
      ...results.map(({ area, score, stage }) => ({ question: area.title, response: `${score} / 20 · ${stage.title}. ${stage.description}` })),
    ];
  }
  if (responseKey === "wayfinders_ethos_assessment") {
    const results = ethosResults(normalizeEthosAnswers(answers));
    if (!results) return [];
    return [
      ...(results.allEqual ? [{ question: "Area comparison", response: "All areas are tied." }] : [
        { question: "Highest Ethos · Strongest areas", response: results.strongest.map(({ category, score }) => `${category.title} · ${score} / 15`).join("; ") },
        { question: "Lowest Ethos · Growth areas", response: results.growth.map(({ category, score }) => `${category.title} · ${score} / 15`).join("; ") },
      ]),
      ...results.scores.map(({ category, score }) => ({ question: category.title, response: `${score} / 15. ${category.description}` })),
    ];
  }
  if (responseKey === "launching_wayfinders_hub_assessment") {
    const result = launchingHubResult(normalizeLaunchingHubAnswers(answers));
    return result ? [
      { question: "Readiness", response: `${result.score} / 50 · ${result.readiness.label}. ${result.readiness.description}` },
      { question: "Focus", response: result.readiness.focus },
    ] : [];
  }
  return [];
}

function allResponseFields(data: unknown, prefix = ""): ResponseItem[] {
  return Object.entries(object(data)).flatMap(([key, value]) => {
    const question = labels[key] ?? [prefix, readable(key)].filter(Boolean).join(" · ");
    if (Array.isArray(value)) {
      if (value.some((item) => item && typeof item === "object")) return value.flatMap((item, index) => allResponseFields(item, `${question} ${index + 1}`));
      const response = value.filter((item) => String(item).trim()).join(" · ");
      return [{ question, response: response || "Not answered", answered: Boolean(response) }];
    }
    if (value && typeof value === "object") return allResponseFields(value, question);
    const answered = value !== null && value !== undefined && String(value).trim() !== "";
    return [{ question, response: answered ? String(value) : "Not answered", answered }];
  });
}
