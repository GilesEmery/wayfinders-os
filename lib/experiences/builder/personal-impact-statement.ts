export const PERSONAL_IMPACT_RENDERER_KEY = "personal-impact-statement.v1";
export const PERSONAL_IMPACT_RESPONSE_KEY = "personal_impact_statement";
export const PERSONAL_IMPACT_SLUG = "personal-impact-statement";
export const PERSONAL_IMPACT_ACCENT = "#349fd5";

export const PERSONAL_IMPACT_FIELDS = [
  "area_of_influence", "causes", "rough_1_to", "rough_1_by", "rough_1_so_that",
  "world_change", "mission_loss", "rough_2_i_will", "rough_2_help",
  "rough_2_provides", "distilled_statement", "final_impact_statement",
] as const;

export type PersonalImpactField = typeof PERSONAL_IMPACT_FIELDS[number];
export type PersonalImpactData = Record<Exclude<PersonalImpactField, "causes">, string> & {
  causes: string[];
  causes_other: string;
};

export const PERSONAL_IMPACT_STAGES = [
  "Area of Influence", "Conflicts & Causes", "Personal Impact Statement: Rough Draft #1",
  "What’s at Stake?", "Personal Impact Statement: Rough Draft #2", "Refine Your Statement",
  "Final Personal Impact Statement",
] as const;

export const PERSONAL_IMPACT_CAUSES = [
  "No Poverty", "Mentoring Youth", "Addiction Recovery", "Mental Health", "Athletics",
  "Helping Others Spiritually", "Reduced Inequalities", "Physical Health & Wellness",
  "Refugees or Displaced Families", "Education", "Environmental Causes", "Human Trafficking",
  "Clean Water", "People with Disabilities", "Foster Care", "Arts & Music",
  "Leadership Development", "Healthy Organizations/ Communities", "Elder Care",
  "Prison & Reentry Support", "Hospitality", "Global Missions", "Using Technology for Good",
  "Business as Mission",
] as const;

export const PERSONAL_IMPACT_SOURCE_MAP = Object.freeze({
  Q12: "area_of_influence", Q80: "causes", Q87: "rough_1_to", Q89: "rough_1_by",
  Q90: "rough_1_so_that", Q92: "world_change", Q93: "mission_loss",
  Q96: "rough_2_i_will", Q97: "rough_2_help", Q98: "rough_2_provides",
  Q21: "distilled_statement", Q31: "final_impact_statement",
});

export function emptyPersonalImpactData(): PersonalImpactData {
  return {
    area_of_influence: "", causes: [], causes_other: "", rough_1_to: "", rough_1_by: "",
    rough_1_so_that: "", world_change: "", mission_loss: "", rough_2_i_will: "",
    rough_2_help: "", rough_2_provides: "", distilled_statement: "", final_impact_statement: "",
  };
}

export function normalizePersonalImpactData(input: unknown): PersonalImpactData {
  const empty = emptyPersonalImpactData();
  if (!input || typeof input !== "object" || Array.isArray(input)) return empty;
  const outer = input as Record<string, unknown>;
  const source = outer.response && typeof outer.response === "object" && !Array.isArray(outer.response)
    ? outer.response as Record<string, unknown> : outer;
  const allowed = new Set<string>([...PERSONAL_IMPACT_CAUSES, "Other"]);
  const causes = Array.isArray(source.causes)
    ? [...new Set(source.causes.filter((item): item is string => typeof item === "string" && allowed.has(item)))].slice(0, 4)
    : [];
  const strings = Object.fromEntries(Object.keys(empty).filter((key) => key !== "causes").map((key) => [key, typeof source[key] === "string" ? source[key].trimStart() : ""]));
  return { ...empty, ...strings, causes };
}

export function personalImpactComplete(data: PersonalImpactData): boolean {
  return data.causes.length >= 1 && data.causes.length <= 4
    && PERSONAL_IMPACT_FIELDS.filter((key) => key !== "causes").every((key) => data[key].trim().length > 0);
}

export function personalImpactStatus(data: PersonalImpactData): "draft" | "submitted" {
  return personalImpactComplete(data) ? "submitted" : "draft";
}

export function firstIncompletePersonalImpactStage(data: PersonalImpactData): number {
  const complete = [
    Boolean(data.area_of_influence.trim()),
    data.causes.length >= 1 && data.causes.length <= 4 && (!data.causes.includes("Other") || Boolean(data.causes_other.trim())),
    Boolean(data.rough_1_to.trim() && data.rough_1_by.trim() && data.rough_1_so_that.trim()),
    Boolean(data.world_change.trim() && data.mission_loss.trim()),
    Boolean(data.rough_2_i_will.trim() && data.rough_2_help.trim() && data.rough_2_provides.trim()),
    Boolean(data.distilled_statement.trim()), Boolean(data.final_impact_statement.trim()),
  ];
  const index = complete.findIndex((value) => !value);
  return index < 0 ? 6 : index;
}

export const composeRoughDraftOne = (data: PersonalImpactData) =>
  `To ${data.rough_1_to.trim()} by ${data.rough_1_by.trim()} so that ${data.rough_1_so_that.trim()}.`;
export const composeRoughDraftTwo = (data: PersonalImpactData) =>
  `I will ${data.rough_2_i_will.trim()} in order to help ${data.rough_2_help.trim()} in a way that produces/ provides ${data.rough_2_provides.trim()}.`;

export function publicPersonalImpactSummary(data: PersonalImpactData) {
  return { final_impact_statement: data.final_impact_statement.trim(), causes: [...data.causes], complete: personalImpactComplete(data) };
}
