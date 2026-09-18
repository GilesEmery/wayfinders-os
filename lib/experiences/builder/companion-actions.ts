"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPlatformUser, hasPlatformAdminAccess } from "@/lib/platform/auth";
import { audienceAllowsParticipant, availabilityApplies, companionText, moduleApplies } from "./companion";
import { appendParticipantQuery, participantSectionHref, resolveParticipantCourse } from "./participant-runtime";

export async function savePersonalCompanionEntryAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, cohortId: string | null | undefined, form: FormData) {
  const href = participantSectionHref(slug, moduleKey, lessonKey, sectionKey, cohortId);
  const result = await resolveParticipantCourse(slug, cohortId ?? null);
  if (result.status !== "ready" || !result.enrollmentId) redirect(appendParticipantQuery(href, "companionError", "Notes require an active version-pinned enrollment."));
  const location = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find((item) => item.module.module_key === moduleKey && item.lesson.lesson_key === lessonKey && item.section.section_key === sectionKey);
  const companionModule = result.companion.modules.find((item) => item.id === companionModuleId);
  if (!location || !companionModule || companionModule.module_type !== "personal_notes" || companionModule.availability_context !== "individual" || companionModule.audience !== "personal" || !moduleApplies(companionModule, { moduleId: location.module.id, lessonId: location.lesson.id, sectionId: location.section.id })) redirect(appendParticipantQuery(href, "companionError", "This private notebook is unavailable here."));
  const text = String(form.get("notes") ?? "").trim();
  if (text.length > 30000) redirect(appendParticipantQuery(href, "companionError", "Notes must be 30,000 characters or fewer."));
  const db = createAdminSupabaseClient();
  const saved = await db.from("participant_companion_entries").upsert({ companion_module_id: companionModule.id, participant_id: result.participantId, enrollment_id: result.enrollmentId, experience_version_id: result.structure.version.id, entry_data: { text } }, { onConflict: "enrollment_id,companion_module_id" });
  if (saved.error) redirect(appendParticipantQuery(href, "companionError", "Your notes could not be saved."));
  revalidatePath(href);
  redirect(appendParticipantQuery(href, "companionSaved", "1"));
}

async function liveContext(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, cohortId: string | null | undefined, expectedType: "video_call" | "chat") {
  const href = participantSectionHref(slug, moduleKey, lessonKey, sectionKey, cohortId);
  const result = await resolveParticipantCourse(slug, cohortId ?? null);
  if (result.status !== "ready" || !result.enrollmentId) redirect(appendParticipantQuery(href, "companionError", "An active version-pinned enrollment is required."));
  const location = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find((item) => item.module.module_key === moduleKey && item.lesson.lesson_key === lessonKey && item.section.section_key === sectionKey);
  const companionModule = result.companion.modules.find((item) => item.id === companionModuleId);
  if (!location || !companionModule || companionModule.module_type !== expectedType || !availabilityApplies(companionModule.availability_context, result.companion.hasCohortContext) || companionModule.availability_context === "individual" || !audienceAllowsParticipant(companionModule.audience, result.companion.currentMemberRole) || !moduleApplies(companionModule, { moduleId: location.module.id, lessonId: location.lesson.id, sectionId: location.section.id }) || !result.companion.hasCohortContext || !companionModule.delivery_override_id) redirect(appendParticipantQuery(href, "companionError", "This Cohort Companion item is unavailable for your delivery."));
  return { href, result, module: companionModule };
}

export async function startCompanionCallAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, cohortId?: string | null) {
  const { href, result, module: companionModule } = await liveContext(slug, moduleKey, lessonKey, sectionKey, companionModuleId, cohortId, "video_call");
  const user = await getPlatformUser();
  const isAdmin = Boolean(user && await hasPlatformAdminAccess(user.id));
  const anyMember = companionText(companionModule.effective_configuration, "who_can_start") === "any_group_member";
  if (!anyMember && result.companion.currentMemberRole !== "facilitator" && !isAdmin) redirect(appendParticipantQuery(href, "companionError", "Only a Leader or Admin can start this call."));
  const db = createAdminSupabaseClient();
  const started = await db.from("companion_call_sessions").insert({ delivery_override_id: companionModule.delivery_override_id!, companion_module_id: companionModule.id, experience_version_id: result.structure.version.id, started_by_participant_id: result.participantId, started_by_enrollment_id: result.enrollmentId!, started_by_auth_user_id: user?.id ?? null, status: "live" });
  if (started.error && started.error.code !== "23505") redirect(appendParticipantQuery(href, "companionError", "The call could not be started."));
  revalidatePath(href); redirect(appendParticipantQuery(href, "companionSaved", "Cohort call is live."));
}

export async function endCompanionCallAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, cohortId?: string | null) {
  const { href, result, module: companionModule } = await liveContext(slug, moduleKey, lessonKey, sectionKey, companionModuleId, cohortId, "video_call");
  const user = await getPlatformUser();
  const isAdmin = Boolean(user && await hasPlatformAdminAccess(user.id));
  if (result.companion.currentMemberRole !== "facilitator" && !isAdmin) redirect(appendParticipantQuery(href, "companionError", "Only a Leader or Admin can end this call."));
  const ended = await createAdminSupabaseClient().from("companion_call_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("delivery_override_id", companionModule.delivery_override_id!).eq("status", "live");
  if (ended.error) redirect(appendParticipantQuery(href, "companionError", "The call state could not be ended."));
  revalidatePath(href); redirect(appendParticipantQuery(href, "companionSaved", "Cohort call ended."));
}

export async function sendCompanionChatMessageAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, cohortId: string | null | undefined, form: FormData) {
  const { href, result, module: companionModule } = await liveContext(slug, moduleKey, lessonKey, sectionKey, companionModuleId, cohortId, "chat");
  if (companionText(companionModule.effective_configuration, "allow_participant_posting") === "false") redirect(appendParticipantQuery(href, "companionError", "Participant posting is disabled for this Chat."));
  const body = String(form.get("message") ?? "").trim();
  if (!body || body.length > 4000) redirect(appendParticipantQuery(href, "companionError", "Messages must contain 1 to 4,000 characters."));
  const location = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find((item) => item.module.module_key === moduleKey && item.lesson.lesson_key === lessonKey && item.section.section_key === sectionKey);
  const curriculum_context = location ? { module_key: location.module.module_key, module_title: location.module.title, lesson_key: location.lesson.lesson_key, lesson_title: location.lesson.title, section_key: location.section.section_key, section_title: location.section.title } : {};
  const sent = await createAdminSupabaseClient().from("companion_chat_messages").insert({ delivery_override_id: companionModule.delivery_override_id!, companion_module_id: companionModule.id, experience_version_id: result.structure.version.id, author_participant_id: result.participantId, author_enrollment_id: result.enrollmentId!, body, curriculum_context });
  if (sent.error) redirect(appendParticipantQuery(href, "companionError", "Your message could not be sent."));
  revalidatePath(href); redirect(appendParticipantQuery(href, "companionSaved", "Message sent."));
}
