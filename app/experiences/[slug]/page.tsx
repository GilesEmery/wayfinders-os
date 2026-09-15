import { notFound, redirect } from "next/navigation";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ParticipantCourseState } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { flattenCourseSections } from "@/components/experiences/builder/CourseNavigator";
import { participantSectionHref, resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";

export default async function ExperienceEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await resolveParticipantCourse(slug);
  if (result.status === "not_found") notFound();
  if (result.status === "custom") redirect(result.route);

  if (result.status === "signed_out") {
    return <PlatformShell><ParticipantCourseState title={result.experience.name} signedOut><p>Sign in to continue to this Experience.</p></ParticipantCourseState><PlatformAuthGate/></PlatformShell>;
  }
  if (result.status === "denied") {
    return <PlatformShell><ParticipantCourseState title="Experience access required"><p>This Experience is not currently available to your Wayfinder account.</p></ParticipantCourseState></PlatformShell>;
  }
  if (result.status === "unavailable") {
    return <PlatformShell><ParticipantCourseState title={result.experience.name}><p>This Experience is not currently available.</p></ParticipantCourseState></PlatformShell>;
  }

  const first = flattenCourseSections(result.structure)[0];
  if (!first) {
    return <PlatformShell><ParticipantCourseState title={result.structure.version.title}><p>This published Experience does not contain any available Sections yet.</p></ParticipantCourseState></PlatformShell>;
  }
  const resume = result.progress.currentSectionId ? flattenCourseSections(result.structure).find((item) => item.section.id === result.progress.currentSectionId) : null;
  const target = resume ?? first;
  redirect(participantSectionHref(slug, target.moduleKey, target.lessonKey, target.section.section_key));
}
