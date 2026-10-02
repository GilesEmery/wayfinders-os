import { notFound } from "next/navigation";
import { selfEnrollAction } from "@/app/experiences/[slug]/actions";
import { EthosAssessment } from "@/components/experiences/builder/EthosAssessment";
import { ParticipantCourseState } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { resolveEmbeddedAssessmentReturnContext } from "@/lib/experiences/builder/embedded-assessment-context";
import { ETHOS_RENDERER_KEY } from "@/lib/experiences/builder/ethos-assessment";
import { resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";

const ASSESSMENT_SLUG = "wayfinders-ethos";

export default async function EthosAssessmentPage({ searchParams }: { searchParams: Promise<{ embeddedAttempt?: string; returnTo?: string; enrollmentError?: string }> }) {
  const query = await searchParams;
  const result = await resolveParticipantCourse(ASSESSMENT_SLUG);
  if (result.status === "not_found" || result.status === "custom") notFound();
  if (result.status === "signed_out") return <PlatformShell><ParticipantCourseState title={result.experience.name} signedOut><p>Sign in to start or continue your Wayfinders Ethos Reflection.</p></ParticipantCourseState><PlatformAuthGate/></PlatformShell>;
  if (result.status === "enrollment_available") return <PlatformShell><ParticipantCourseState title={result.experience.name}><p>{result.experience.description}</p>{query.enrollmentError && <p role="alert">{query.enrollmentError}</p>}<form action={selfEnrollAction.bind(null, ASSESSMENT_SLUG)}><button className="button button-primary" type="submit">Start Assessment</button></form></ParticipantCourseState></PlatformShell>;
  if (result.status !== "ready" || !result.enrollmentId) return <PlatformShell><ParticipantCourseState title="Wayfinders Ethos Reflection unavailable"><p>This assessment is not currently available to your account.</p></ParticipantCourseState></PlatformShell>;

  const locations = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.flatMap((section) => section.layout?.columns.flatMap((column) => column.blocks.map((block) => ({ module, lesson, section, block }))) ?? [])));
  const target = locations.find(({ block }) => block.block_type === "system_component" && block.custom_renderer_key === ETHOS_RENDERER_KEY && block.status === "active" && block.visibility === "visible");
  if (!target) return <PlatformShell><ParticipantCourseState title="Wayfinders Ethos Reflection unavailable"><p>The published assessment content is unavailable.</p></ParticipantCourseState></PlatformShell>;
  const response = result.responses[target.block.id];
  if (!response || response.definition.response_type !== "structured_response") return <PlatformShell><ParticipantCourseState title="Wayfinders Ethos Reflection unavailable"><p>The assessment response definition is unavailable.</p></ParticipantCourseState></PlatformShell>;
  const returnTo = await resolveEmbeddedAssessmentReturnContext({ attemptId: query.embeddedAttempt, candidateReturnTo: query.returnTo, participantId: result.participantId, assessmentEnrollmentId: result.enrollmentId, assessmentExperienceId: result.structure.experience.id });
  return <PlatformShell contextTitle={result.structure.version.title || result.structure.experience.name} contextLogoUrl={result.headerLogoUrl}>{returnTo && <a className="dashboard-back-link" href={returnTo}>← Back to Course</a>}<EthosAssessment autoStart={Boolean(returnTo)} standalone initialData={response.response?.response_data ?? {}} route={{ slug: ASSESSMENT_SLUG, moduleKey: target.module.module_key, lessonKey: target.lesson.lesson_key, sectionKey: target.section.section_key, blockKey: target.block.block_key }}/></PlatformShell>;
}
