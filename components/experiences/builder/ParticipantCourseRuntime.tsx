import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { getRouteHandoff, getSectionRenderer } from "@/lib/experiences/builder/runtime-registry";
import { participantSectionHref, type ParticipantResponseContext } from "@/lib/experiences/builder/participant-runtime";
import { resolveExperienceTheme } from "@/lib/experiences/builder/theme-resolver";
import type { BuilderColumn, BuilderCourseStructure, BuilderSection } from "@/lib/experiences/builder/types";
import type { ParticipantProgressSnapshot } from "@/lib/experiences/builder/progress";
import type { CourseTemplate } from "@/lib/experiences/builder/course-templates";
import { adminPreviewHref } from "@/lib/experiences/admin/preview";
import { CourseNavigator, flattenCourseSections, type CourseSectionLocation } from "./CourseNavigator";
import { ParticipantBlockRenderer } from "./ParticipantBlockRenderer";
import { SectionCompletionControl, SectionVisitRecorder } from "./ParticipantProgressControls";

function RuntimeUnavailable({ children = "This content is currently unavailable." }: { children?: ReactNode }) {
  return <div className="participant-runtime-unavailable" role="status">{children}</div>;
}

type ResponseRoute = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string };

function ColumnContent({ column, responses, route, preview }: { column: BuilderColumn; responses: Readonly<Record<string, ParticipantResponseContext>>; route: ResponseRoute; preview: boolean }) {
  const blocks = column.blocks.filter((block) => block.status === "active" && block.visibility === "visible");
  return <div className="participant-column-content">{blocks.length ? blocks.map((block) => <ParticipantBlockRenderer block={block} response={responses[block.id]} route={route} preview={preview} key={block.id}/>) : <p className="participant-section-empty">No content is available in this Column yet.</p>}</div>;
}

function RuntimeColumn({ column, responses, route, preview }: { column: BuilderColumn; responses: Readonly<Record<string, ParticipantResponseContext>>; route: ResponseRoute; preview: boolean }) {
  const width = Math.min(100, Math.max(1, Number(column.width_percent) || 100));
  const mobileOrder = Math.min(20, Math.max(0, Number(column.mobile_order) || 0));
  const className = ["participant-runtime-column", column.sticky ? "is-sticky" : "", `mobile-${column.mobile_behavior}`].filter(Boolean).join(" ");
  const style = { "--participant-column-width": `${width}%`, "--participant-mobile-order": mobileOrder } as CSSProperties;
  const collapsible = column.collapsible || column.mobile_behavior === "collapsible";
  return <section className={className} style={style}>{collapsible ? <details open={!column.default_collapsed}><summary>{column.label || "Page content"}</summary><ColumnContent column={column} responses={responses} route={route} preview={preview}/></details> : <ColumnContent column={column} responses={responses} route={route} preview={preview}/>}</section>;
}

function SectionRuntime({ section, responses, route, preview }: { section: BuilderSection; responses: Readonly<Record<string, ParticipantResponseContext>>; route: ResponseRoute; preview: boolean }) {
  if (section.renderer_mode === "route_handoff") {
    const handoff = section.custom_renderer_key ? getRouteHandoff(section.custom_renderer_key) : null;
    const parsed = handoff?.validateConfiguration(section.settings);
    return handoff && parsed?.ok ? <div className="participant-route-handoff"><p>This Section continues in an approved PurposeOS experience surface.</p><Link href={handoff.route(parsed.value)}>Continue →</Link></div> : <RuntimeUnavailable>This Section handoff is unavailable.</RuntimeUnavailable>;
  }
  if (section.renderer_mode === "custom" || section.renderer_mode === "hybrid" && section.custom_renderer_key) {
    const renderer = section.custom_renderer_key ? getSectionRenderer(section.custom_renderer_key) : null;
    return <RuntimeUnavailable>{renderer ? "This registered Section renderer does not yet provide a participant component." : "This Section renderer is unavailable."}</RuntimeUnavailable>;
  }
  if (!section.layout) return <RuntimeUnavailable>This Section does not have a participant layout yet.</RuntimeUnavailable>;
  if (!section.layout.columns.length) return <RuntimeUnavailable>This Section layout does not contain any Columns.</RuntimeUnavailable>;
  return <div className={`participant-runtime-columns is-${section.layout.layout_mode}`}>{section.layout.columns.map((column) => <RuntimeColumn column={column} responses={responses} route={route} preview={preview} key={column.id}/>)}</div>;
}

export function ParticipantCourseRuntime({ structure, courseTemplate, themeConfiguration, current, progress, responses, preview }: { structure: BuilderCourseStructure; courseTemplate: CourseTemplate; themeConfiguration: unknown; current: CourseSectionLocation; progress: ParticipantProgressSnapshot; responses: Readonly<Record<string, ParticipantResponseContext>>; preview?: { experienceId: string; versionId: string } }) {
  const theme = resolveExperienceTheme(themeConfiguration);
  const themeClasses = [theme.typographyClass, theme.headingClass, theme.buttonClass, theme.cardClass, theme.navigationClass, theme.spacingClass, theme.cornerClass].join(" ");
  const sections = flattenCourseSections(structure);
  const index = sections.findIndex((item) => item.section.id === current.section.id);
  const previous = index > 0 ? sections[index - 1] : null;
  const next = index >= 0 && index < sections.length - 1 ? sections[index + 1] : null;
  const href = (item: CourseSectionLocation) => preview ? adminPreviewHref(preview.experienceId, preview.versionId, item.moduleKey, item.lessonKey, item.section.section_key) : participantSectionHref(structure.experience.slug, item.moduleKey, item.lessonKey, item.section.section_key);
  const progressEnabled = !preview && Boolean(progress.enrollmentId) && !current.section.legacy && (current.section.renderer_mode === "builder" || (current.section.renderer_mode === "hybrid" && !current.section.custom_renderer_key));
  return <div className={`participant-course ${themeClasses}`} style={theme.style}>
    {preview && <div className="participant-preview-banner" role="status">Admin Preview · Read only · No progress or responses are saved</div>}
    <header className="participant-course-header"><div><p>PurposeOS</p><h1>{structure.version.title || structure.experience.name}</h1></div><Link href="/dashboard">My Learning ↗</Link></header>
    <div className={`participant-course-layout is-${courseTemplate.key}`}><main>
      <SectionVisitRecorder enabled={progressEnabled} slug={structure.experience.slug} moduleKey={current.moduleKey} lessonKey={current.lessonKey} sectionKey={current.section.section_key}/>
      <header className="participant-section-header"><p>{current.moduleTitle} / {current.lessonTitle}</p><span className="participant-lesson-label">Lesson {index + 1}</span><h1>{current.section.title}</h1>{current.section.description && <span>{current.section.description}</span>}</header>
      <SectionRuntime section={current.section} responses={responses} route={{ slug: structure.experience.slug, moduleKey: current.moduleKey, lessonKey: current.lessonKey, sectionKey: current.section.section_key }} preview={Boolean(preview)}/>
      <SectionCompletionControl enabled={progressEnabled} slug={structure.experience.slug} moduleKey={current.moduleKey} lessonKey={current.lessonKey} sectionKey={current.section.section_key} completionRule={current.section.completion_rule} status={progress.sections[current.section.id] ?? "not_started"}/>
      <nav className="participant-section-pagination" aria-label="Section navigation">{previous ? <Link href={href(previous)}><small>Previous</small><strong>{previous.section.title}</strong></Link> : <span/>}{next ? <Link href={href(next)}><small>Next</small><strong>{next.section.title}</strong></Link> : <div><small>End of Experience</small><strong>You have reached the final Section.</strong></div>}</nav>
    </main><aside className="participant-course-outline"><details><summary>Course Outline</summary><div className="participant-outline-identity"><strong>{structure.version.title || structure.experience.name}</strong>{structure.version.description && <span>{structure.version.description}</span>}<div className="participant-progress-summary"><span>{progress.experience.requiredPercent}% complete · {progress.experience.requiredCompleted} of {progress.experience.requiredTotal} required Pages</span><i aria-label="Required Page progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress.experience.requiredPercent} role="progressbar"><span style={{ width: `${progress.experience.requiredPercent}%` }}/></i></div></div><CourseNavigator structure={structure} current={current} progress={progress} hrefFor={href}/></details></aside>{courseTemplate.shell.includes("group_companion") && <aside className="participant-group-companion"><details><summary>Companion</summary><p>Supporting space</p><span>Notes, Resources and Community will appear here when available. Your lesson stays at the center.</span></details></aside>}</div>
  </div>;
}

export function ParticipantCourseState({ title, children, signedOut = false }: { title: string; children: ReactNode; signedOut?: boolean }) {
  return <section className="participant-course-state"><p className="platform-eyebrow">PurposeOS Experience</p><h1>{title}</h1><div>{children}</div>{!signedOut && <Link href="/experiences">Return to Experiences →</Link>}</section>;
}
