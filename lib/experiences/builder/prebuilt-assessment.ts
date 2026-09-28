import type { Json } from "@/lib/supabase/database.types";

export const PREBUILT_ASSESSMENT_BLOCK_TYPE = "prebuilt_assessment";

export type PrebuiltAssessmentConfiguration = Readonly<{
  assessmentExperienceId: string;
  title: string;
  description: string;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePrebuiltAssessmentConfiguration(input: unknown): { ok: true; value: PrebuiltAssessmentConfiguration } | { ok: false; errors: string[] } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["Assessment configuration must be an object."] };
  const object = input as Record<string, unknown>;
  const unknown = Object.keys(object).filter((key) => !["assessmentExperienceId", "title", "description"].includes(key));
  const assessmentExperienceId = typeof object.assessmentExperienceId === "string" ? object.assessmentExperienceId.trim() : "";
  const title = typeof object.title === "string" ? object.title.trim() : "";
  const description = typeof object.description === "string" ? object.description.trim() : "";
  const errors = [
    ...unknown.map((key) => `Unknown configuration field: ${key}.`),
    UUID.test(assessmentExperienceId) && assessmentExperienceId !== "00000000-0000-4000-8000-000000000000" ? "" : "Select a prebuilt Assessment.",
    title.length <= 200 ? "" : "Assessment title must be 200 characters or fewer.",
    description.length <= 1000 ? "" : "Assessment description must be 1000 characters or fewer.",
  ].filter(Boolean);
  return errors.length ? { ok: false, errors } : { ok: true, value: { assessmentExperienceId, title, description } };
}

export function prebuiltAssessmentConfiguration(input: PrebuiltAssessmentConfiguration): Record<string, Json> {
  return { assessmentExperienceId: input.assessmentExperienceId, title: input.title, description: input.description };
}

export function embeddedAssessmentReturnPath(route: { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null }) {
  const base = `/experiences/${encodeURIComponent(route.slug)}/course/${encodeURIComponent(route.moduleKey)}/${encodeURIComponent(route.lessonKey)}/${encodeURIComponent(route.sectionKey)}`;
  return route.cohortId ? `${base}?cohort=${encodeURIComponent(route.cohortId)}` : base;
}

export function embeddedAssessmentLaunchPath(launchPath: string, attemptId: string, returnTo: string) {
  const separator = launchPath.includes("?") ? "&" : "?";
  return `${launchPath}${separator}embeddedAttempt=${encodeURIComponent(attemptId)}&returnTo=${encodeURIComponent(returnTo)}`;
}

export function validatedEmbeddedReturnPath(candidate: string | undefined, expectedPath: string) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return null;
  try {
    const parsed = new URL(candidate, "https://purposeos.invalid");
    const expected = new URL(expectedPath, "https://purposeos.invalid");
    if (parsed.origin !== expected.origin || parsed.pathname !== expected.pathname) return null;
    const cohort = parsed.searchParams.get("cohort");
    if (cohort && !UUID.test(cohort)) return null;
    return cohort ? `${expected.pathname}?cohort=${encodeURIComponent(cohort)}` : expected.pathname;
  } catch {
    return null;
  }
}
