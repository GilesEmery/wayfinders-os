import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getBlockDefinition } from "./block-registry";
import { resolveParticipantCourse } from "./participant-runtime";
import { recordParticipantSectionVisit } from "./progress-mutations";
import { responseDataJson, validateResponseData } from "./response-registry";

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function context(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string) {
  if (![slug, moduleKey, lessonKey, sectionKey, blockKey].every((value) => value.length <= 120 && KEY.test(value))) return null;
  const resolution = await resolveParticipantCourse(slug);
  if (resolution.status !== "ready" || !resolution.enrollmentId) return null;
  const target = resolution.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find(({ module, lesson, section }) => module.module_key === moduleKey && lesson.lesson_key === lessonKey && section.section_key === sectionKey);
  if (!target || target.section.legacy || target.section.renderer_mode === "custom" || target.section.renderer_mode === "route_handoff" || target.section.custom_renderer_key) return null;
  const block = target.section.layout?.columns.flatMap((column) => column.blocks).find((candidate) => candidate.block_key === blockKey);
  const definition = block ? getBlockDefinition(block.block_type) : null;
  const responseContract = definition?.response;
  const response = block ? resolution.responses[block.id] : null;
  if (!block || block.status !== "active" || block.visibility !== "visible" || !definition || !responseContract || !response || response.definition.response_type !== responseContract.responseType || response.definition.lesson_id !== target.lesson.id || response.definition.experience_version_id !== resolution.structure.version.id) return null;
  return { resolution, target, block, response, definition, responseContract };
}

async function mutate(mode: "draft" | "final", slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, form: FormData) {
  const authorized = await context(slug, moduleKey, lessonKey, sectionKey, blockKey);
  if (!authorized) throw new Error("This response is unavailable.");
  if (authorized.response.response?.status === "submitted" || authorized.response.response?.status === "finalized") return;
  const responseInput = authorized.responseContract.responseKind === "multi_select"
    ? { values: form.getAll("response") }
    : authorized.responseContract.responseKind === "boolean"
      ? { value: form.get("response") === "true" }
      : { value: form.get("response") };
  const parsed = validateResponseData(authorized.responseContract.responseKind, responseInput, mode === "final" && authorized.response.definition.is_required, authorized.response.definition.configuration, mode === "final");
  if (!parsed.ok) throw new Error(parsed.errors.join(" "));
  const blockConfiguration = authorized.block.configuration;
  const configuredMax = typeof blockConfiguration.maxLength === "number" ? blockConfiguration.maxLength : null;
  if (configuredMax && "value" in parsed.value && typeof parsed.value.value === "string" && parsed.value.value.length > configuredMax) throw new Error(`Response must be ${configuredMax} characters or fewer.`);
  const db = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const payload = { participant_id: authorized.resolution.participantId, enrollment_id: authorized.resolution.enrollmentId!, experience_version_id: authorized.resolution.structure.version.id, response_definition_id: authorized.response.definition.id, response_data: responseDataJson(parsed.value), status: mode === "final" ? "finalized" : "draft", finalized_at: mode === "final" ? now : null, updated_at: now };
  const result = authorized.response.response
    ? await db.from("participant_responses").update(payload).eq("id", authorized.response.response.id).eq("participant_id", authorized.resolution.participantId).eq("enrollment_id", authorized.resolution.enrollmentId!).eq("status", "draft")
    : await db.from("participant_responses").insert(payload);
  if (result.error) throw new Error(`Unable to ${mode === "final" ? "submit" : "save"} the response: ${result.error.message}`);
  await recordParticipantSectionVisit(slug, moduleKey, lessonKey, sectionKey);
}

export const saveParticipantResponseDraft = mutate.bind(null, "draft");
export const finalizeParticipantResponse = mutate.bind(null, "final");
