import "server-only";
import { isAssessmentRetake } from "./assessment-retake";
import { measureOperation } from "./performance-measurement";

import { persistAssessmentResponse, confirmAssessmentCompletion } from "./assessment-response-save";
import { resolveParticipantCourseForMutation } from "./participant-runtime";
import { PERSONAL_IMPACT_RENDERER_KEY, projectPersonalImpactSave } from "./personal-impact-statement";
import { completeSectionResponsesForAuthorizedCourse, recordSectionVisitForAuthorizedCourse } from "./progress-mutations";

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function savePersonalImpactStatement(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, finish = false, retakeCompletedAt?: string) {
  return measureOperation(finish ? "pis-finish" : "pis-save", () => persistPersonalImpactStatement(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, finish, retakeCompletedAt));
}

async function persistPersonalImpactStatement(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, finish: boolean, retakeCompletedAt?: string) {
  if (![slug, moduleKey, lessonKey, sectionKey, blockKey].every((value) => value.length <= 120 && KEY.test(value))) throw new Error("This assessment is unavailable.");
  const resolution = await resolveParticipantCourseForMutation(slug, cohortId ?? null);
  if (resolution.status !== "ready" || !resolution.enrollmentId) throw new Error("This assessment is unavailable.");
  const target = resolution.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find(({ module, lesson, section }) => module.module_key === moduleKey && lesson.lesson_key === lessonKey && section.section_key === sectionKey);
  const block = target?.section.layout?.columns.flatMap((column) => column.blocks).find((candidate) => candidate.block_key === blockKey);
  const response = block ? resolution.responses[block.id] : null;
  if (!target || !block || block.block_type !== "custom_component" || block.custom_renderer_key !== PERSONAL_IMPACT_RENDERER_KEY || block.status !== "active" || block.visibility !== "visible" || !response || response.definition.response_type !== "structured_response" || !response.definition.is_required) throw new Error("This assessment is unavailable.");
  const saved = await persistAssessmentResponse({ participantId: resolution.participantId, enrollmentId: resolution.enrollmentId, versionId: resolution.structure.version.id, definitionId: response.definition.id },
    (prior, now, finalizedAt) => { const retaking = isAssessmentRetake(prior, retakeCompletedAt, finish); return projectPersonalImpactSave(retaking ? {} : prior, input, now, retaking ? null : finalizedAt, finish); });
  await recordSectionVisitForAuthorizedCourse(resolution, moduleKey, lessonKey, sectionKey);
  if (finish) {
    await completeSectionResponsesForAuthorizedCourse(resolution, moduleKey, lessonKey, sectionKey);
    await confirmAssessmentCompletion(resolution.participantId, resolution.enrollmentId, resolution.structure.version.id);
  }
  return { status: saved.completedAt ? "submitted" : "draft", ...saved } as const;
}
