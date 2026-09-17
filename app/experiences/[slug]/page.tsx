import { notFound, redirect } from "next/navigation";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ParticipantCourseState } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { flattenCourseSections } from "@/components/experiences/builder/CourseNavigator";
import { participantSectionHref, resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";
import { selfEnrollAction } from "./actions";

export default async function ExperienceEntryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ enrollmentError?: string }> }) {
  const { slug } = await params;
  const { enrollmentError } = await searchParams;
  const result = await resolveParticipantCourse(slug);
  if (result.status === "not_found") notFound();
  if (result.status === "custom") redirect(result.route);

  if (result.status === "signed_out") {
    return <PlatformShell><ParticipantCourseState title={result.experience.name} signedOut><p>Sign in to continue to this Experience.</p></ParticipantCourseState><PlatformAuthGate/></PlatformShell>;
  }
  if (result.status === "denied") {
    if (result.experience.visibility === "public" && result.experience.admission_policy === "admin_assigned") {
      return <PlatformShell><ParticipantCourseState title={result.experience.name}><p>{result.experience.description ?? "A PurposeOS training."}</p><p>Enrollment in this training is assigned by Wayfinders staff.</p></ParticipantCourseState></PlatformShell>;
    }
    return <PlatformShell><ParticipantCourseState title="Experience access required"><p>This Experience is not currently available to your Wayfinder account.</p></ParticipantCourseState></PlatformShell>;
  }
  if (result.status === "enrollment_available") {
    return <PlatformShell><ParticipantCourseState title={result.experience.name}><p>{result.experience.description ?? "This training is open for enrollment."}</p>{enrollmentError && <p role="alert">{enrollmentError}</p>}<form action={selfEnrollAction.bind(null, result.experience.slug)}><button className="button button-primary" type="submit">Enroll</button></form></ParticipantCourseState></PlatformShell>;
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
