import type { Json } from "@/lib/supabase/database.types";

export type CurriculumContext = { module_key?: string; module_title?: string; lesson_key?: string; lesson_title?: string; section_key?: string; section_title?: string };

export function curriculumContext(value: Json): CurriculumContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, Json | undefined>; const result: CurriculumContext = {};
  for (const key of ["module_key", "module_title", "lesson_key", "lesson_title", "section_key", "section_title"] as const) if (typeof source[key] === "string" && source[key]) result[key] = source[key];
  return result;
}

export function curriculumLocationKey(value: Json) {
  const context = curriculumContext(value);
  const stable = [context.module_key, context.lesson_key, context.section_key].filter(Boolean);
  if (stable.length) return `key:${stable.join("/")}`;
  const snapshot = [context.module_title, context.lesson_title, context.section_title].filter(Boolean);
  return snapshot.length ? `title:${snapshot.join("/")}` : null;
}

export function curriculumLocationLabel(value: Json) {
  const context = curriculumContext(value);
  const primary = [context.module_title, context.lesson_title].filter(Boolean).join(" · ");
  return { primary: primary || context.section_title || "", secondary: primary && context.section_title ? context.section_title : "" };
}

export function validMeetingUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

export function videoConferenceEnabled(config: Record<string, Json | undefined>) {
  return config.enabled === "true" && validMeetingUrl(config.url);
}
