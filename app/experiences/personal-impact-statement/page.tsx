import { notFound } from "next/navigation";
import { selfEnrollAction } from "@/app/experiences/[slug]/actions";
import { PersonalImpactStatementAssessment } from "@/components/experiences/builder/PersonalImpactStatementAssessment";
import { ParticipantCourseState } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { resolveEmbeddedAssessmentReturnContext } from "@/lib/experiences/builder/embedded-assessment-context";
import { PERSONAL_IMPACT_RENDERER_KEY, PERSONAL_IMPACT_SLUG } from "@/lib/experiences/builder/personal-impact-statement";
import { resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";

export default async function PersonalImpactStatementPage({ searchParams }: { searchParams: Promise<{ embeddedAttempt?: string; returnTo?: string; enrollmentError?: string }> }) {
  const query = await searchParams;
  const result = await resolveParticipantCourse(PERSONAL_IMPACT_SLUG);
  if (result.status === "not_found" || result.status === "custom") notFound();
  if (result.status === "signed_out") return <PlatformShell><ParticipantCourseState title={result.experience.name} signedOut><p>Sign in to start or continue your Personal Impact Statement.</p></ParticipantCourseState><PlatformAuthGate/></PlatformShell>;
  if (result.status === "enrollment_available") return <PlatformShell><ParticipantCourseState title={result.experience.name}><p>{result.experience.description}</p>{query.enrollmentError && <p role="alert">{query.enrollmentError}</p>}<form action={selfEnrollAction.bind(null, PERSONAL_IMPACT_SLUG)}><button className="button button-primary" type="submit">Start Assessment</button></form></ParticipantCourseState></PlatformShell>;
  if (result.status !== "ready" || !result.enrollmentId) return <PlatformShell><ParticipantCourseState title="Personal Impact Statement unavailable"><p>This assessment is not currently available to your account.</p></ParticipantCourseState></PlatformShell>;

  const locations = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.flatMap((section) => section.layout?.columns.flatMap((column) => column.blocks.map((block) => ({ module, lesson, section, block }))) ?? [])));
  const target = locations.find(({ block }) => block.block_type === "custom_component" && block.custom_renderer_key === PERSONAL_IMPACT_RENDERER_KEY && block.status === "active" && block.visibility === "visible");
  if (!target) return <PlatformShell><ParticipantCourseState title="Personal Impact Statement unavailable"><p>The published assessment content is unavailable.</p></ParticipantCourseState></PlatformShell>;
  const response = result.responses[target.block.id];
  if (!response || response.definition.response_type !== "structured_response") return <PlatformShell><ParticipantCourseState title="Personal Impact Statement unavailable"><p>The assessment response definition is unavailable.</p></ParticipantCourseState></PlatformShell>;
  const returnTo = await resolveEmbeddedAssessmentReturnContext({ attemptId: query.embeddedAttempt, candidateReturnTo: query.returnTo, participantId: result.participantId, assessmentEnrollmentId: result.enrollmentId, assessmentExperienceId: result.structure.experience.id });
  return <PersonalImpactStatementAssessment initialData={response.response?.response_data ?? {}} route={{ slug: PERSONAL_IMPACT_SLUG, moduleKey: target.module.module_key, lessonKey: target.lesson.lesson_key, sectionKey: target.section.section_key, blockKey: target.block.block_key }} returnTo={returnTo} mode={returnTo ? "course" : "standalone"}/>;
}
