import Link from "next/link";
import { participantSectionHref } from "@/lib/experiences/builder/participant-runtime";
import type { ParticipantProgressSnapshot } from "@/lib/experiences/builder/progress";
import type { BuilderCourseStructure, BuilderSection } from "@/lib/experiences/builder/types";

export type CourseSectionLocation = Readonly<{ moduleKey: string; moduleTitle: string; lessonKey: string; lessonTitle: string; section: BuilderSection }>;
export function flattenCourseSections(structure: BuilderCourseStructure): CourseSectionLocation[] {
  return structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ moduleKey: module.module_key, moduleTitle: module.title, lessonKey: lesson.lesson_key, lessonTitle: lesson.title, section }))));
}
function ProgressState({ status }: { status: string }) { return <span className={`participant-progress-state is-${status}`}><span aria-hidden="true"/>{status.replaceAll("_", " ")}</span>; }

export function CourseNavigator({ structure, current, progress, hrefFor }: { structure: BuilderCourseStructure; current: CourseSectionLocation; progress: ParticipantProgressSnapshot; hrefFor?: (location: CourseSectionLocation) => string }) {
  return <nav className="participant-course-navigator" aria-label="Course navigator"><p>Course Navigator</p>{structure.modules.map((module) => {
    const activeModule = module.module_key === current.moduleKey;
    return <details key={module.id} open={activeModule}><summary><span>{module.title}</span><ProgressState status={progress.modules[module.id] ?? "not_started"}/></summary><div>{module.lessons.map((lesson) => {
      const activeLesson = activeModule && lesson.lesson_key === current.lessonKey;
      return <details key={lesson.id} open={activeLesson}><summary><span>{lesson.title}</span><ProgressState status={progress.lessons[lesson.id] ?? "not_started"}/></summary><ol>{lesson.sections.map((section) => {
        const active = activeLesson && section.id === current.section.id;
        const status = section.legacy ? "unavailable" : progress.sections[section.id] ?? "not_started";
        const location = { moduleKey: module.module_key, moduleTitle: module.title, lessonKey: lesson.lesson_key, lessonTitle: lesson.title, section };
        const href = hrefFor?.(location) ?? participantSectionHref(structure.experience.slug, module.module_key, lesson.lesson_key, section.section_key);
        return <li key={section.id}><Link aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} href={href}><span>{section.title}{section.requirement_level !== "required" && <small>{section.requirement_level}</small>}</span><ProgressState status={status}/></Link></li>;
      })}</ol></details>;
    })}</div></details>;
  })}</nav>;
}
