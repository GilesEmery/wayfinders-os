import Link from "next/link";
import { participantSectionHref } from "@/lib/experiences/builder/participant-runtime";
import type { ParticipantProgressSnapshot } from "@/lib/experiences/builder/progress";
import type { BuilderCourseStructure, BuilderSection } from "@/lib/experiences/builder/types";
import { groupLabel, normalizeCourseConfiguration } from "@/lib/experiences/builder/course-configuration";
import { navigateForwardAction } from "@/lib/experiences/builder/progress-actions";

export type CourseSectionLocation = Readonly<{ moduleKey: string; moduleTitle: string; lessonKey: string; lessonTitle: string; section: BuilderSection }>;
export function flattenCourseSections(structure: BuilderCourseStructure): CourseSectionLocation[] {
  return structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ moduleKey: module.module_key, moduleTitle: module.title, lessonKey: lesson.lesson_key, lessonTitle: lesson.title, section }))));
}
function ProgressState({ status }: { status: string }) { return <span className={`participant-progress-state is-${status}`}><span aria-hidden="true"/>{status.replaceAll("_", " ")}</span>; }

export function CourseNavigator({ structure, current, progress, hrefFor, completeOnForward = false }: { structure: BuilderCourseStructure; current: CourseSectionLocation; progress: ParticipantProgressSnapshot; hrefFor?: (location: CourseSectionLocation) => string; completeOnForward?: boolean }) {
  const group = normalizeCourseConfiguration(structure.version.course_configuration).terminology.group_label;
  const locations = flattenCourseSections(structure);
  const locationIndexes = new Map(locations.map((location, index) => [location.section.id, index]));
  const currentIndex = locationIndexes.get(current.section.id) ?? -1;
  return <nav className="participant-course-navigator" aria-label="Course navigator"><p>{groupLabel(group)} Navigator</p>{structure.modules.map((module) => {
    const activeModule = module.module_key === current.moduleKey;
    return <details key={module.id} open={activeModule}><summary><span>{module.title}</span><ProgressState status={progress.modules[module.id] ?? "not_started"}/></summary><div>{module.lessons.map((lesson) => {
      const activeLesson = activeModule && lesson.lesson_key === current.lessonKey;
      return <details key={lesson.id} open={activeLesson}><summary><span>{lesson.title}</span><ProgressState status={progress.lessons[lesson.id] ?? "not_started"}/></summary><ol>{lesson.sections.map((section) => {
        const active = activeLesson && section.id === current.section.id;
        const status = section.legacy ? "unavailable" : progress.sections[section.id] ?? "not_started";
        const location = { moduleKey: module.module_key, moduleTitle: module.title, lessonKey: lesson.lesson_key, lessonTitle: lesson.title, section };
        const href = hrefFor?.(location) ?? participantSectionHref(structure.experience.slug, module.module_key, lesson.lesson_key, section.section_key);
        const targetIndex = locationIndexes.get(section.id) ?? -1;
        const content = <><span>{section.title}{section.requirement_level !== "required" && <small>{section.requirement_level}</small>}</span><ProgressState status={status}/></>;
        return <li key={section.id}>{completeOnForward && targetIndex > currentIndex ? <form action={navigateForwardAction.bind(null, structure.experience.slug, current.moduleKey, current.lessonKey, current.section.section_key, location.moduleKey, location.lessonKey, location.section.section_key)}><button aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} type="submit">{content}</button></form> : <Link aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} href={href}>{content}</Link>}</li>;
      })}</ol></details>;
    })}</div></details>;
  })}</nav>;
}
