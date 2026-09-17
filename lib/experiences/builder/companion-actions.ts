"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPlatformUser, hasPlatformAdminAccess } from "@/lib/platform/auth";
import { companionText } from "./companion";
import { moduleApplies } from "./companion";
import { participantSectionHref, resolveParticipantCourse } from "./participant-runtime";

export async function savePersonalCompanionEntryAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, form: FormData) {
  const href = participantSectionHref(slug, moduleKey, lessonKey, sectionKey);
  const result = await resolveParticipantCourse(slug);
  if (result.status !== "ready" || !result.enrollmentId) redirect(`${href}?companionError=${encodeURIComponent("Notes require an active version-pinned enrollment.")}`);
  const location = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find((item) => item.module.module_key === moduleKey && item.lesson.lesson_key === lessonKey && item.section.section_key === sectionKey);
  const companionModule = result.companion.modules.find((item) => item.id === companionModuleId);
  if (!location || !companionModule || companionModule.module_type !== "personal_notes" || companionModule.audience !== "personal" || !moduleApplies(companionModule, { moduleId: location.module.id, lessonId: location.lesson.id, sectionId: location.section.id })) redirect(`${href}?companionError=${encodeURIComponent("This private notebook is unavailable here.")}`);
  const text = String(form.get("notes") ?? "").trim();
  if (text.length > 30000) redirect(`${href}?companionError=${encodeURIComponent("Notes must be 30,000 characters or fewer.")}`);
  const db = createAdminSupabaseClient();
  const saved = await db.from("participant_companion_entries").upsert({ companion_module_id: companionModule.id, participant_id: result.participantId, enrollment_id: result.enrollmentId, experience_version_id: result.structure.version.id, entry_data: { text } }, { onConflict: "enrollment_id,companion_module_id" });
  if (saved.error) redirect(`${href}?companionError=${encodeURIComponent("Your notes could not be saved.")}`);
  revalidatePath(href);
  redirect(`${href}?companionSaved=1`);
}

async function liveContext(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, expectedType: "video_call" | "chat") {
  const href = participantSectionHref(slug, moduleKey, lessonKey, sectionKey);
  const result = await resolveParticipantCourse(slug);
  if (result.status !== "ready" || !result.enrollmentId) redirect(`${href}?companionError=${encodeURIComponent("An active version-pinned enrollment is required.")}`);
  const location = result.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ module, lesson, section })))).find((item) => item.module.module_key === moduleKey && item.lesson.lesson_key === lessonKey && item.section.section_key === sectionKey);
  const companionModule = result.companion.modules.find((item) => item.id === companionModuleId);
  if (!location || !companionModule || companionModule.module_type !== expectedType || companionModule.audience !== "group" || !moduleApplies(companionModule, { moduleId: location.module.id, lessonId: location.lesson.id, sectionId: location.section.id }) || !result.companion.hasGroupContext || !companionModule.delivery_override_id) redirect(`${href}?companionError=${encodeURIComponent("This Group Companion item is unavailable for your delivery.")}`);
  return { href, result, module: companionModule };
}

export async function startCompanionCallAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string) {
  const { href, result, module: companionModule } = await liveContext(slug, moduleKey, lessonKey, sectionKey, companionModuleId, "video_call");
  const user = await getPlatformUser();
  const isAdmin = Boolean(user && await hasPlatformAdminAccess(user.id));
  const anyMember = companionText(companionModule.effective_configuration, "who_can_start") === "any_group_member";
  if (!anyMember && result.companion.currentMemberRole !== "facilitator" && !isAdmin) redirect(`${href}?companionError=${encodeURIComponent("Only a Leader or Admin can start this call.")}`);
  const db = createAdminSupabaseClient();
  const started = await db.from("companion_call_sessions").insert({ delivery_override_id: companionModule.delivery_override_id!, companion_module_id: companionModule.id, experience_version_id: result.structure.version.id, started_by_participant_id: result.participantId, started_by_enrollment_id: result.enrollmentId!, started_by_auth_user_id: user?.id ?? null, status: "live" });
  if (started.error && started.error.code !== "23505") redirect(`${href}?companionError=${encodeURIComponent("The call could not be started.")}`);
  revalidatePath(href); redirect(`${href}?companionSaved=${encodeURIComponent("Group call is live.")}`);
}

export async function endCompanionCallAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string) {
  const { href, result, module: companionModule } = await liveContext(slug, moduleKey, lessonKey, sectionKey, companionModuleId, "video_call");
  const user = await getPlatformUser();
  const isAdmin = Boolean(user && await hasPlatformAdminAccess(user.id));
  if (result.companion.currentMemberRole !== "facilitator" && !isAdmin) redirect(`${href}?companionError=${encodeURIComponent("Only a Leader or Admin can end this call.")}`);
  const ended = await createAdminSupabaseClient().from("companion_call_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("delivery_override_id", companionModule.delivery_override_id!).eq("status", "live");
  if (ended.error) redirect(`${href}?companionError=${encodeURIComponent("The call state could not be ended.")}`);
  revalidatePath(href); redirect(`${href}?companionSaved=${encodeURIComponent("Group call ended.")}`);
}

export async function sendCompanionChatMessageAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, companionModuleId: string, form: FormData) {
  const { href, result, module: companionModule } = await liveContext(slug, moduleKey, lessonKey, sectionKey, companionModuleId, "chat");
  if (companionText(companionModule.effective_configuration, "allow_participant_posting") === "false") redirect(`${href}?companionError=${encodeURIComponent("Participant posting is disabled for this Chat.")}`);
  const body = String(form.get("message") ?? "").trim();
  if (!body || body.length > 4000) redirect(`${href}?companionError=${encodeURIComponent("Messages must contain 1 to 4,000 characters.")}`);
  const sent = await createAdminSupabaseClient().from("companion_chat_messages").insert({ delivery_override_id: companionModule.delivery_override_id!, companion_module_id: companionModule.id, experience_version_id: result.structure.version.id, author_participant_id: result.participantId, author_enrollment_id: result.enrollmentId!, body });
  if (sent.error) redirect(`${href}?companionError=${encodeURIComponent("Your message could not be sent.")}`);
  revalidatePath(href); redirect(`${href}?companionSaved=${encodeURIComponent("Message sent.")}`);
}
