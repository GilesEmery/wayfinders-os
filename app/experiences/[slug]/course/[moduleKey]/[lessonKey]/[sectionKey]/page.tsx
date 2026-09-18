import { notFound, redirect } from "next/navigation";
import { flattenCourseSections } from "@/components/experiences/builder/CourseNavigator";
import { ParticipantCourseRuntime, ParticipantCourseState } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { participantMissingSectionFallback, resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";

type Params = Promise<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string }>;
type SearchParams = Promise<{ progressError?: string; companionError?: string; companionSaved?: string; cohort?: string }>;

export default async function ParticipantCoursePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug, moduleKey, lessonKey, sectionKey } = await params;
  const { progressError, companionError, companionSaved, cohort } = await searchParams;
  const cohortId = typeof cohort === "string" ? cohort : null;
  const result = await resolveParticipantCourse(slug, cohortId);
  if (result.status === "not_found") notFound();
  if (result.status === "custom") redirect(result.route);

  if (result.status === "signed_out") {
    return <PlatformShell><ParticipantCourseState title={result.experience.name} signedOut><p>Sign in to continue to this Experience.</p></ParticipantCourseState><PlatformAuthGate/></PlatformShell>;
  }
  if (result.status === "denied") {
    return <PlatformShell><ParticipantCourseState title="Experience access required"><p>This Experience is not currently available to your Wayfinder account.</p></ParticipantCourseState></PlatformShell>;
  }
  if (result.status === "invalid_context") redirect(`/experiences/${encodeURIComponent(slug)}`);
  if (result.status === "enrollment_available") redirect(`/experiences/${slug}`);
  if (result.status === "unavailable") {
    return <PlatformShell><ParticipantCourseState title={result.experience.name}><p>This Experience is not currently available.</p></ParticipantCourseState></PlatformShell>;
  }

  const current = flattenCourseSections(result.structure).find((item) => item.moduleKey === moduleKey && item.lessonKey === lessonKey && item.section.section_key === sectionKey);
  if (!current) {
    const fallback = await participantMissingSectionFallback(result, { moduleKey, lessonKey, sectionKey });
    if (fallback) redirect(fallback);
    return <PlatformShell><ParticipantCourseState title="Section unavailable"><p>The requested Section is not part of this published Experience Version.</p></ParticipantCourseState></PlatformShell>;
  }

  return <PlatformShell><ParticipantCourseRuntime structure={result.structure} courseTemplate={result.courseTemplate} themeConfiguration={result.themeConfiguration} coverUrl={result.coverUrl} logoUrl={result.logoUrl} headerLogoUrl={result.headerLogoUrl} assets={result.assets} companion={result.companion} current={current} progress={result.progress} responses={result.responses} cohortId={result.cohortId} navigationError={progressError} companionError={companionError} companionNotice={companionSaved === "1" ? "Private notes saved." : companionSaved}/></PlatformShell>;
}
