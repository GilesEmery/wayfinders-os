import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getBlockDefinition } from "./block-registry";
import { resolveParticipantCourseForMutation } from "./participant-runtime";
import { recordSectionVisitForAuthorizedCourse } from "./progress-mutations";
import { responseDataJson, validateResponseData } from "./response-registry";

export class ResponseSaveError extends Error {}

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function context(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId?: string | null) {
  if (![slug, moduleKey, lessonKey, sectionKey, blockKey].every((value) => value.length <= 120 && KEY.test(value))) return null;
  const resolution = await resolveParticipantCourseForMutation(slug, cohortId ?? null, { moduleKey, lessonKey, sectionKey });
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

async function mutate(mode: "draft" | "final", slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, form: FormData) {
  const authorized = await context(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId);
  if (!authorized) throw new Error("This response is unavailable.");
  const expectedRevision = form.get("response_revision");
  if (expectedRevision !== (authorized.response.response?.updated_at ?? "")) throw new ResponseSaveError("This response changed while saving. Reload before trying again; keep your current text.");
  const replacingFinalResponse = authorized.resolution.requirementsBypassed && (authorized.response.response?.status === "submitted" || authorized.response.response?.status === "finalized");
  if (!replacingFinalResponse && (authorized.response.response?.status === "submitted" || authorized.response.response?.status === "finalized")) {
    throw new ResponseSaveError("This response is already submitted. Reload to verify your saved answer and progress.");
  }
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
  const updateQuery = authorized.response.response
    ? db.from("participant_responses").update(payload).eq("id", authorized.response.response.id).eq("participant_id", authorized.resolution.participantId).eq("enrollment_id", authorized.resolution.enrollmentId!).eq("updated_at", authorized.response.response.updated_at)
    : null;
  const result = updateQuery
    ? replacingFinalResponse ? await updateQuery.select("id").maybeSingle() : await updateQuery.eq("status", "draft").select("id").maybeSingle()
    : await db.from("participant_responses").insert(payload).select("id").single();
  if (result.error?.code === "23505") throw new ResponseSaveError("This response changed while saving. Reload before trying again; keep your current text.");
  if (result.error) throw new Error(`Unable to ${mode === "final" ? "submit" : "save"} the response: ${result.error.message}`);
  if (!result.data) throw new ResponseSaveError("This response changed while saving. Reload before trying again; keep your current text.");
  try {
    const progress = await recordSectionVisitForAuthorizedCourse(authorized.resolution, moduleKey, lessonKey, sectionKey);
    if (!progress.ok) throw new Error("Progress unavailable");
  } catch {
    throw new ResponseSaveError("Your response is saved, but progress could not be confirmed. Reload and try again.");
  }
}

export const saveParticipantResponseDraft = mutate.bind(null, "draft");
export const finalizeParticipantResponse = mutate.bind(null, "final");
