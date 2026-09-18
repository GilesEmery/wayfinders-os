import Link from "next/link";
import Image from "next/image";
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
import { accentInk, normalizeCourseConfiguration } from "@/lib/experiences/builder/course-configuration";
import { validateThemeConfiguration } from "@/lib/experiences/builder/theme-validation";
import type { ResolvedAsset } from "@/lib/experiences/builder/resource-assets";
import { finishCourseAction, navigateForwardAction } from "@/lib/experiences/builder/progress-actions";
import { ParticipantCompanion } from "./ParticipantCompanion";
import type { CompanionRuntimeData } from "@/lib/experiences/builder/companion-data";

function RuntimeUnavailable({ children = "This content is currently unavailable." }: { children?: ReactNode }) {
  return <div className="participant-runtime-unavailable" role="status">{children}</div>;
}

type ResponseRoute = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null };

function ColumnContent({ column, responses, assets, route, preview }: { column: BuilderColumn; responses: Readonly<Record<string, ParticipantResponseContext>>; assets: Readonly<Record<string, ResolvedAsset>>; route: ResponseRoute; preview: boolean }) {
  const blocks = column.blocks.filter((block) => block.status === "active" && block.visibility === "visible");
  return <div className="participant-column-content">{blocks.length ? blocks.map((block) => <ParticipantBlockRenderer block={block} response={responses[block.id]} asset={assets[block.id]} route={route} preview={preview} key={block.id}/>) : <p className="participant-section-empty">No content is available in this Column yet.</p>}</div>;
}

function RuntimeColumn({ column, responses, assets, route, preview }: { column: BuilderColumn; responses: Readonly<Record<string, ParticipantResponseContext>>; assets: Readonly<Record<string, ResolvedAsset>>; route: ResponseRoute; preview: boolean }) {
  const width = Math.min(100, Math.max(1, Number(column.width_percent) || 100));
  const mobileOrder = Math.min(20, Math.max(0, Number(column.mobile_order) || 0));
  const className = ["participant-runtime-column", column.sticky ? "is-sticky" : "", `mobile-${column.mobile_behavior}`].filter(Boolean).join(" ");
  const style = { "--participant-column-width": `${width}%`, "--participant-mobile-order": mobileOrder } as CSSProperties;
  const collapsible = column.collapsible || column.mobile_behavior === "collapsible";
  return <section className={className} style={style}>{collapsible ? <details open={!column.default_collapsed}><summary>{column.label || "Page content"}</summary><ColumnContent column={column} responses={responses} assets={assets} route={route} preview={preview}/></details> : <ColumnContent column={column} responses={responses} assets={assets} route={route} preview={preview}/>}</section>;
}

function SectionRuntime({ section, responses, assets, route, preview }: { section: BuilderSection; responses: Readonly<Record<string, ParticipantResponseContext>>; assets: Readonly<Record<string, ResolvedAsset>>; route: ResponseRoute; preview: boolean }) {
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
  return <div className={`participant-runtime-columns is-${section.layout.layout_mode}`}>{section.layout.columns.map((column) => <RuntimeColumn column={column} responses={responses} assets={assets} route={route} preview={preview} key={column.id}/>)}</div>;
}

export function ParticipantCourseRuntime({ structure, courseTemplate, themeConfiguration, coverUrl, logoUrl, headerLogoUrl, assets = { blocks: {}, heroes: {} }, companion, current, progress, responses, cohortId = null, preview, navigationError, companionNotice, companionError }: { structure: BuilderCourseStructure; courseTemplate: CourseTemplate; themeConfiguration: unknown; coverUrl?: string | null; logoUrl?: string | null; headerLogoUrl?: string | null; assets?: { blocks: Readonly<Record<string, ResolvedAsset>>; heroes: Readonly<Record<string, ResolvedAsset>> }; companion: CompanionRuntimeData; current: CourseSectionLocation; progress: ParticipantProgressSnapshot; responses: Readonly<Record<string, ParticipantResponseContext>>; cohortId?: string | null; preview?: { experienceId: string; versionId: string; cohortId?: string | null }; navigationError?: string; companionNotice?: string; companionError?: string }) {
  const theme = resolveExperienceTheme(themeConfiguration);
  const configuration = normalizeCourseConfiguration(structure.version.course_configuration);
  const parsedTheme = validateThemeConfiguration(themeConfiguration);
  const accent = configuration.appearance.accent_color ?? (parsedTheme.ok ? parsedTheme.value.colors?.primaryAccent : null) ?? structure.experience.accent_color ?? theme.configuration.colors?.primaryAccent ?? "#0054a1";
  const colors = configuration.appearance.colors; const primary = colors.primaryAccent ?? accent;
  const appearanceStyle = { ...theme.style, "--experience-accent": primary, "--experience-accent-secondary": colors.secondaryAccent ?? theme.configuration.colors?.secondaryAccent, "--experience-background": colors.background ?? theme.configuration.colors?.background, "--experience-surface": colors.surface ?? theme.configuration.colors?.surface, "--experience-surface-elevated": colors.surface ?? theme.configuration.colors?.elevatedSurface, "--experience-text": colors.text ?? theme.configuration.colors?.text, "--experience-muted": colors.mutedText ?? theme.configuration.colors?.mutedText, "--experience-border": colors.borderColor ?? theme.configuration.colors?.borderColor, "--experience-completion": colors.completion ?? theme.configuration.colors?.completion ?? primary, "--course-header-ink": accentInk(primary) } as CSSProperties;
  const themeClasses = [theme.typographyClass, theme.headingClass, theme.buttonClass, theme.cardClass, theme.navigationClass, theme.spacingClass, theme.cornerClass].join(" ");
  const sections = flattenCourseSections(structure);
  const index = sections.findIndex((item) => item.section.id === current.section.id);
  const previous = index > 0 ? sections[index - 1] : null;
  const next = index >= 0 && index < sections.length - 1 ? sections[index + 1] : null;
  const href = (item: CourseSectionLocation) => preview ? adminPreviewHref(preview.experienceId, preview.versionId, item.moduleKey, item.lessonKey, item.section.section_key, preview.cohortId) : participantSectionHref(structure.experience.slug, item.moduleKey, item.lessonKey, item.section.section_key, cohortId);
  const progressEnabled = !preview && Boolean(progress.enrollmentId) && !current.section.legacy && (current.section.renderer_mode === "builder" || (current.section.renderer_mode === "hybrid" && !current.section.custom_renderer_key));
  return <div className={`participant-course ${themeClasses} course-header-${configuration.appearance.header_treatment} course-reading-${configuration.appearance.reading_width}`} style={appearanceStyle}>
    {preview && <div className="participant-preview-banner" role="status">Admin Preview · Read only · No progress or responses are saved</div>}
    <header className="participant-course-header">{configuration.appearance.header_treatment === "image" && coverUrl && <Image className="participant-course-cover" src={coverUrl} alt="" fill unoptimized sizes="100vw"/>}<div>{headerLogoUrl ? <Image className="participant-course-header-logo" src={headerLogoUrl} alt="" width={150} height={30} unoptimized/> : <p>PurposeOS</p>}<h1>{structure.version.title || structure.experience.name}</h1></div>{logoUrl && <Image className="participant-course-logo" src={logoUrl} alt={`${structure.version.title || structure.experience.name} logo`} width={220} height={44} unoptimized/>}{preview ? <Link href={`/admin/trainings/${preview.experienceId}/versions/${preview.versionId}`}>Back to Builder ↗</Link> : <Link href="/dashboard">My Learning ↗</Link>}</header>
    <div className={`participant-course-layout is-${courseTemplate.key}`}><main>
      <SectionVisitRecorder enabled={progressEnabled} slug={structure.experience.slug} moduleKey={current.moduleKey} lessonKey={current.lessonKey} sectionKey={current.section.section_key} cohortId={cohortId}/>
      <header className="participant-section-header"><p>{current.moduleTitle} / {current.lessonTitle}</p><span className="participant-lesson-label">Lesson {index + 1}</span><h1>{current.section.title}</h1>{current.section.description && <span>{current.section.description}</span>}</header>
      {assets.heroes[current.section.id] && <figure className="participant-lesson-hero"><Image src={assets.heroes[current.section.id].url} alt="" width={1400} height={700} unoptimized sizes="(max-width: 760px) 100vw, 70vw"/></figure>}
      <SectionRuntime section={current.section} responses={responses} assets={assets.blocks} route={{ slug: structure.experience.slug, moduleKey: current.moduleKey, lessonKey: current.lessonKey, sectionKey: current.section.section_key, cohortId }} preview={Boolean(preview)}/>
      <SectionCompletionControl enabled={progressEnabled} slug={structure.experience.slug} moduleKey={current.moduleKey} lessonKey={current.lessonKey} sectionKey={current.section.section_key} cohortId={cohortId} completionRule={current.section.completion_rule} status={progress.sections[current.section.id] ?? "not_started"}/>
      {navigationError && <p className="participant-navigation-error" role="alert">{navigationError}</p>}
      <nav className="participant-section-pagination" aria-label="Lesson navigation">{previous ? <Link href={href(previous)}><small>Previous</small><strong>{previous.section.title}</strong></Link> : <span/>}{next ? preview ? <Link href={href(next)}><small>Continue to next</small><strong>{next.section.title}</strong></Link> : <form action={navigateForwardAction.bind(null, structure.experience.slug, current.moduleKey, current.lessonKey, current.section.section_key, next.moduleKey, next.lessonKey, next.section.section_key, cohortId)}><button type="submit"><small>Continue to next</small><strong>{next.section.title}</strong></button></form> : preview ? <div><small>Preview end</small><strong>You have reached the final Page.</strong></div> : progress.sections[current.section.id] === "completed" && progress.experience.status === "completed" ? <div><small>Course complete</small><strong>Your progress has been saved.</strong></div> : <form action={finishCourseAction.bind(null, structure.experience.slug, current.moduleKey, current.lessonKey, current.section.section_key, cohortId)}><button type="submit"><small>Final Page</small><strong>Complete Course</strong></button></form>}</nav>
    </main><aside className="participant-course-outline"><details open><summary>Course Outline</summary><div className="participant-outline-identity"><strong>{structure.version.title || structure.experience.name}</strong>{structure.version.description && <span>{structure.version.description}</span>}<div className="participant-progress-summary"><span>{progress.experience.requiredPercent}% complete · {progress.experience.requiredCompleted} of {progress.experience.requiredTotal} required Pages</span><i aria-label="Required Page progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress.experience.requiredPercent} role="progressbar"><span style={{ width: `${progress.experience.requiredPercent}%` }}/></i></div></div><CourseNavigator structure={structure} current={current} progress={progress} hrefFor={href} completeOnForward={!preview} cohortId={cohortId}/></details></aside>{courseTemplate.shell.includes("group_companion") && <ParticipantCompanion companion={companion} current={current} preview={Boolean(preview)} notice={companionNotice} error={companionError} route={{ slug: structure.experience.slug, moduleKey: current.moduleKey, lessonKey: current.lessonKey, sectionKey: current.section.section_key, cohortId }}/>}</div>
  </div>;
}

export function ParticipantCourseState({ title, children, signedOut = false }: { title: string; children: ReactNode; signedOut?: boolean }) {
  return <section className="participant-course-state"><p className="platform-eyebrow">PurposeOS Experience</p><h1>{title}</h1><div>{children}</div>{!signedOut && <Link href="/experiences">Return to Experiences →</Link>}</section>;
}
