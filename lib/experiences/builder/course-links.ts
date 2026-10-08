import { safeExternalUrl } from "./media-source.ts";

export type CourseLinkOption = { href: string; week: string; lesson: string; page: string };
const COURSE_LINK = /^\/experiences\/([a-z0-9]+(?:-[a-z0-9]+)*)\/course\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
export function safeCourseLink(input: unknown) {
  return typeof input === "string" && COURSE_LINK.test(input) ? input : null;
}
export function safeRichTextLink(input: unknown) { return safeCourseLink(input) ?? safeExternalUrl(input); }
export type CourseLinkContext = { slug: string; cohortId?: string | null; previewBase?: string };
export function contextualCourseLink(href: string, context?: CourseLinkContext) {
  const match = href.match(COURSE_LINK);
  if (!match || !context || match[1] !== context.slug) return href;
  const base = context.previewBase ? `${context.previewBase}/${match.slice(2).join("/")}` : href;
  return context.cohortId ? `${base}?cohort=${encodeURIComponent(context.cohortId)}` : base;
}
