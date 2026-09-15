import type { ExperienceDeliveryMode } from "./types";

export type CourseTemplateKey = "standard_course" | "enhanced_course" | "custom_experience";
export type CourseTemplate = Readonly<{ key: CourseTemplateKey; label: string; shell: readonly ("navigator" | "content" | "group_companion")[]; editableContent: boolean }>;

export const COURSE_TEMPLATES: Readonly<Record<CourseTemplateKey, CourseTemplate>> = {
  standard_course: { key: "standard_course", label: "Standard Course", shell: ["navigator", "content"], editableContent: true },
  enhanced_course: { key: "enhanced_course", label: "Enhanced Course", shell: ["navigator", "content", "group_companion"], editableContent: true },
  custom_experience: { key: "custom_experience", label: "Custom Experience", shell: ["content"], editableContent: false },
};

export function resolveCourseTemplate(deliveryMode: ExperienceDeliveryMode, shellMode?: string | null): CourseTemplate {
  if (deliveryMode === "custom_code") return COURSE_TEMPLATES.custom_experience;
  if (shellMode === "enhanced") return COURSE_TEMPLATES.enhanced_course;
  return COURSE_TEMPLATES.standard_course;
}
