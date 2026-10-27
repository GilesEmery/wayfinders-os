import "server-only";

import { resolveParticipantCourseForMutation } from "./participant-runtime";
import { FIVE_VOICES_RENDERER_KEY, FIVE_VOICES_RESPONSE_KEY, fiveVoicesComplete, normalizeFiveVoicesEnvelope, projectFiveVoicesSave } from "./five-voices";
import { persistAssessmentResponse, confirmAssessmentCompletion } from "./assessment-response-save";
import { completeSectionResponsesForAuthorizedCourse } from "./progress-mutations";
import { recordSectionVisitForAuthorizedCourse } from "./progress-mutations";

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function saveFiveVoicesAssessment(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, finalize = false, retakeCompletedAt?: string) {
  if (![slug, moduleKey, lessonKey, sectionKey, blockKey].every((value) => value.length <= 120 && KEY.test(value))) throw new Error("This assessment is unavailable.");
  const resolution = await resolveParticipantCourseForMutation(slug, cohortId ?? null, { moduleKey, lessonKey, sectionKey });
  if (resolution.status !== "ready" || !resolution.enrollmentId) throw new Error("This assessment is unavailable.");
  const target = resolution.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find(({ module, lesson, section }) => module.module_key === moduleKey && lesson.lesson_key === lessonKey && section.section_key === sectionKey);
  const block = target?.section.layout?.columns.flatMap((column) => column.blocks).find((candidate) => candidate.block_key === blockKey);
  const response = block ? resolution.responses[block.id] : null;
  if (!target || !block || block.block_type !== "custom_component" || block.custom_renderer_key !== FIVE_VOICES_RENDERER_KEY || block.status !== "active" || block.visibility !== "visible" || !response || response.definition.response_type !== "structured_response" || response.definition.response_key !== FIVE_VOICES_RESPONSE_KEY) throw new Error("This assessment is unavailable.");
  const envelope = normalizeFiveVoicesEnvelope(input);
  if (finalize && !fiveVoicesComplete(envelope.answers)) throw new Error("Answer all 25 statements before saving your results.");
  const saved = await persistAssessmentResponse({ participantId: resolution.participantId, enrollmentId: resolution.enrollmentId, versionId: resolution.structure.version.id, definitionId: response.definition.id }, (prior, now) => projectFiveVoicesSave(prior, envelope, finalize, now, retakeCompletedAt));
  await recordSectionVisitForAuthorizedCourse(resolution, moduleKey, lessonKey, sectionKey);
  if (saved.completedAt) {
    await completeSectionResponsesForAuthorizedCourse(resolution, moduleKey, lessonKey, sectionKey);
    if (slug === "five-voices") await confirmAssessmentCompletion(resolution.participantId, resolution.enrollmentId, resolution.structure.version.id);
  }
  return { completedAt: saved.completedAt, complete: Boolean(saved.completedAt) };
}
