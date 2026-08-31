export const LMU_SESSION_COOKIE = "wayfinders_lmu_session";
export const LMU_SESSION_DAYS = 30;
export const LMU_MAX_PAYLOAD_BYTES = 256 * 1024;

export const LMU_SECTION_KEYS = [
  "success_stories",
  "transferable_skills",
  "teammates",
  "supervisor",
  "values",
  "growth",
  "location",
  "x_factor",
  "salary",
  "motivator_rankings",
] as const;

export type LMUSectionKey = (typeof LMU_SECTION_KEYS)[number];

const sectionKeySet = new Set<string>(LMU_SECTION_KEYS);

export function isLMUSectionKey(value: string): value is LMUSectionKey {
  return sectionKeySet.has(value);
}
