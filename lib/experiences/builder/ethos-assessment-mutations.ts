import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveParticipantCourse } from "./participant-runtime";
import { ETHOS_RENDERER_KEY, ethosComplete, normalizeEthosAnswers } from "./ethos-assessment";
import { recordParticipantSectionVisit } from "./progress-mutations";

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function saveEthosAssessment(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown) {
  if (![slug, moduleKey, lessonKey, sectionKey, blockKey].every((value) => value.length <= 120 && KEY.test(value))) throw new Error("This assessment is unavailable.");
  const resolution = await resolveParticipantCourse(slug, cohortId ?? null);
  if (resolution.status !== "ready" || !resolution.enrollmentId) throw new Error("This assessment is unavailable.");
  const target = resolution.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find(({ module, lesson, section }) => module.module_key === moduleKey && lesson.lesson_key === lessonKey && section.section_key === sectionKey);
  const block = target?.section.layout?.columns.flatMap((column) => column.blocks).find((candidate) => candidate.block_key === blockKey);
  const response = block ? resolution.responses[block.id] : null;
  if (!target || !block || block.block_type !== "system_component" || block.custom_renderer_key !== ETHOS_RENDERER_KEY || block.status !== "active" || block.visibility !== "visible" || !response || response.definition.response_type !== "structured_response" || !response.definition.is_required) throw new Error("This assessment is unavailable.");
  const answers = normalizeEthosAnswers(input);
  const complete = ethosComplete(answers);
  const now = new Date().toISOString();
  const payload = { participant_id: resolution.participantId, enrollment_id: resolution.enrollmentId, experience_version_id: resolution.structure.version.id, response_definition_id: response.definition.id, response_data: { answers }, status: complete ? "submitted" : "draft", finalized_at: null, updated_at: now };
  const db = createAdminSupabaseClient();
  const result = response.response
    ? await db.from("participant_responses").update(payload).eq("id", response.response.id).eq("participant_id", resolution.participantId).eq("enrollment_id", resolution.enrollmentId)
    : await db.from("participant_responses").insert(payload);
  if (result.error) throw new Error(`Unable to save the Ethos Assessment: ${result.error.message}`);
  await recordParticipantSectionVisit(slug, moduleKey, lessonKey, sectionKey, cohortId);
  return { complete };
}
