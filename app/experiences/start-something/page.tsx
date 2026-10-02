import { notFound } from "next/navigation";
import { selfEnrollAction } from "@/app/experiences/[slug]/actions";
import { StartSomethingExperience } from "@/components/experiences/builder/StartSomethingExperience";
import { ParticipantCourseState } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { resolveEmbeddedAssessmentReturnContext } from "@/lib/experiences/builder/embedded-assessment-context";
import { resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";
import { START_SOMETHING_RENDERER_KEY, START_SOMETHING_SLUG } from "@/lib/experiences/builder/start-something";

export default async function StartSomethingPage({ searchParams }: { searchParams: Promise<{ embeddedAttempt?: string; returnTo?: string; enrollmentError?: string }> }) {
  const query = await searchParams;
  const result = await resolveParticipantCourse(START_SOMETHING_SLUG);
  if (result.status === "not_found" || result.status === "custom") notFound();
  if (result.status === "signed_out") return <PlatformShell><ParticipantCourseState title="Start Something" signedOut><p>Sign in to start or continue this guided experience.</p></ParticipantCourseState><PlatformAuthGate/></PlatformShell>;
  if (result.status === "enrollment_available") return <PlatformShell><ParticipantCourseState title={result.experience.name}><p>{result.experience.description}</p>{query.enrollmentError && <p role="alert">{query.enrollmentError}</p>}<form action={selfEnrollAction.bind(null, START_SOMETHING_SLUG)}><button className="button button-primary" type="submit">Start Experience</button></form></ParticipantCourseState></PlatformShell>;
  if (result.status !== "ready" || !result.enrollmentId) return <PlatformShell><ParticipantCourseState title="Start Something unavailable"><p>This guided experience is not currently available to your account.</p></ParticipantCourseState></PlatformShell>;
  const locations = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.flatMap((section) => section.layout?.columns.flatMap((column) => column.blocks.map((block) => ({ module, lesson, section, block }))) ?? [])));
  const target = locations.find(({ block }) => block.block_type === "custom_component" && block.custom_renderer_key === START_SOMETHING_RENDERER_KEY && block.status === "active" && block.visibility === "visible");
  if (!target) return <PlatformShell><ParticipantCourseState title="Start Something unavailable"><p>The published guided experience is unavailable.</p></ParticipantCourseState></PlatformShell>;
  const response = result.responses[target.block.id];
  if (!response || response.definition.response_type !== "structured_response") return <PlatformShell><ParticipantCourseState title="Start Something unavailable"><p>The response definition is unavailable.</p></ParticipantCourseState></PlatformShell>;
  const returnTo = await resolveEmbeddedAssessmentReturnContext({ attemptId: query.embeddedAttempt, candidateReturnTo: query.returnTo, participantId: result.participantId, assessmentEnrollmentId: result.enrollmentId, assessmentExperienceId: result.structure.experience.id });
  return <PlatformShell contextTitle={result.structure.version.title || result.structure.experience.name} contextLogoUrl={result.headerLogoUrl}><StartSomethingExperience initialData={response.response?.response_data ?? {}} route={{ slug: START_SOMETHING_SLUG, moduleKey: target.module.module_key, lessonKey: target.lesson.lesson_key, sectionKey: target.section.section_key, blockKey: target.block.block_key }} returnTo={returnTo} mode={returnTo ? "course" : "standalone"}/></PlatformShell>;
}
