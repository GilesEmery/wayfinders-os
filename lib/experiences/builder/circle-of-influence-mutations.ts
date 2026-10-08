import "server-only";
import { isAssessmentRetake } from "./assessment-retake";

import { persistAssessmentResponse, confirmAssessmentCompletion } from "./assessment-response-save";
import { resolveParticipantCourseForMutation } from "./participant-runtime";
import { completeSectionResponsesForAuthorizedCourse, recordSectionVisitForAuthorizedCourse } from "./progress-mutations";
import { projectCircleSave, CIRCLE_RENDERER_KEY } from "./circle-of-influence";

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function saveCircleOfInfluence(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, finish: boolean, retakeCompletedAt?: string) {
  if (![slug, moduleKey, lessonKey, sectionKey, blockKey].every((value) => value.length <= 120 && KEY.test(value))) throw new Error("This guided experience is unavailable.");
  const resolution = await resolveParticipantCourseForMutation(slug, cohortId ?? null);
  if (resolution.status !== "ready" || !resolution.enrollmentId) throw new Error("This guided experience is unavailable.");
  const target = resolution.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find(({ module, lesson, section }) => module.module_key === moduleKey && lesson.lesson_key === lessonKey && section.section_key === sectionKey);
  const block = target?.section.layout?.columns.flatMap((column) => column.blocks).find((candidate) => candidate.block_key === blockKey);
  const response = block ? resolution.responses[block.id] : null;
  if (!target || !block || block.block_type !== "custom_component" || block.custom_renderer_key !== CIRCLE_RENDERER_KEY || block.status !== "active" || block.visibility !== "visible" || !response || response.definition.response_type !== "structured_response") throw new Error("This guided experience is unavailable.");
  const saved = await persistAssessmentResponse({ participantId: resolution.participantId, enrollmentId: resolution.enrollmentId, versionId: resolution.structure.version.id, definitionId: response.definition.id },
    (prior, now) => projectCircleSave(isAssessmentRetake(prior, retakeCompletedAt, finish) ? {} : prior, input, finish, now));
  await recordSectionVisitForAuthorizedCourse(resolution, moduleKey, lessonKey, sectionKey);
  if (saved.completedAt) {
    await completeSectionResponsesForAuthorizedCourse(resolution, moduleKey, lessonKey, sectionKey);
    await confirmAssessmentCompletion(resolution.participantId, resolution.enrollmentId, resolution.structure.version.id);
  }
  return { status: saved.completedAt ? "submitted" : "draft", ...saved } as const;
}
