"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { getExperienceStructure } from "@/lib/experiences/builder/data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function saveJourneyVisibilityAction(experienceId: string, offeringId: string, form: FormData) {
  const admin = await requireAdmin(); const authorization = await getAuthorizationContext(admin.id, admin.email); if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to configure this Journey.");
  const db = createAdminSupabaseClient(); const offering = await db.from("experience_offerings").select("*").eq("id", offeringId).eq("experience_id", experienceId).maybeSingle();
  if (!offering.data?.experience_version_id) throw new Error("Pin this offering to a Course Version first.");
  const structure = await getExperienceStructure(experienceId, offering.data.experience_version_id, db); const visibleModules = new Set(form.getAll("visible_module").map(String)); const visibleLessons = new Set(form.getAll("visible_lesson").map(String)); const visibleSections = new Set(form.getAll("visible_section").map(String)); const hiddenLessons = structure.modules.flatMap((module) => module.lessons).filter((lesson) => !visibleLessons.has(lesson.id)).map((lesson) => lesson.id);
  if (offering.data.cohort_id) {
    const existing = await db.from("cohort_course_plans").select("id").eq("cohort_id", offering.data.cohort_id).eq("experience_version_id", structure.version.id).eq("status", "active").maybeSingle(); let planId = existing.data?.id;
    if (!planId) { const created = await db.from("cohort_course_plans").insert({ cohort_id: offering.data.cohort_id, experience_id: experienceId, experience_version_id: structure.version.id, name: `${offering.data.name} Journey`, status: "active", settings: { hidden_lesson_ids: hiddenLessons }, created_by: admin.id }).select("id").single(); if (created.error) throw new Error(created.error.message); planId = created.data.id; }
    else { const updated = await db.from("cohort_course_plans").update({ settings: { hidden_lesson_ids: hiddenLessons } }).eq("id", planId); if (updated.error) throw new Error(updated.error.message); await db.from("cohort_course_plan_sections").delete().eq("plan_id", planId); await db.from("cohort_course_plan_modules").delete().eq("plan_id", planId); }
    for (const [order, module] of structure.modules.entries()) { const row = await db.from("cohort_course_plan_modules").insert({ plan_id: planId, experience_version_id: structure.version.id, source_module_id: module.id, sort_order: order, visibility: visibleModules.has(module.id) ? "visible" : "hidden" }).select("id").single(); if (row.error) throw new Error(row.error.message); const sections = module.lessons.flatMap((lesson) => lesson.sections); if (sections.length) { const result = await db.from("cohort_course_plan_sections").insert(sections.map((section, index) => ({ plan_id: planId!, plan_module_id: row.data.id, experience_version_id: structure.version.id, occurrence_type: "canonical", source_section_id: section.id, sort_order: index, visibility: visibleSections.has(section.id) ? "visible" : "hidden" }))); if (result.error) throw new Error(result.error.message); } }
  } else {
    let templateId = offering.data.default_delivery_plan_template_id;
    if (!templateId) { const created = await db.from("delivery_plan_templates").insert({ experience_id: experienceId, experience_version_id: structure.version.id, name: `${offering.data.name} Journey`, sharing_scope: "private", status: "active", settings: { hidden_lesson_ids: hiddenLessons }, created_by: admin.id }).select("id").single(); if (created.error) throw new Error(created.error.message); templateId = created.data.id; const attached = await db.from("experience_offerings").update({ default_delivery_plan_template_id: templateId }).eq("id", offeringId); if (attached.error) throw new Error(attached.error.message); }
    else { const updated = await db.from("delivery_plan_templates").update({ settings: { hidden_lesson_ids: hiddenLessons } }).eq("id", templateId); if (updated.error) throw new Error(updated.error.message); await db.from("delivery_plan_template_sections").delete().eq("template_id", templateId); await db.from("delivery_plan_template_modules").delete().eq("template_id", templateId); }
    for (const [order, module] of structure.modules.entries()) { const row = await db.from("delivery_plan_template_modules").insert({ template_id: templateId, experience_version_id: structure.version.id, source_module_id: module.id, sort_order: order, visibility: visibleModules.has(module.id) ? "visible" : "hidden" }).select("id").single(); if (row.error) throw new Error(row.error.message); const sections = module.lessons.flatMap((lesson) => lesson.sections); if (sections.length) { const result = await db.from("delivery_plan_template_sections").insert(sections.map((section, index) => ({ template_id: templateId!, template_module_id: row.data.id, experience_version_id: structure.version.id, source_section_id: section.id, sort_order: index, visibility: visibleSections.has(section.id) ? "visible" : "hidden" }))); if (result.error) throw new Error(result.error.message); } }
  }
  await audit(admin, "course.journey_visibility.updated", "experience_offering", offeringId, { experienceId }); revalidatePath(`/admin/trainings/${experienceId}/delivery`); redirect(`/admin/trainings/${experienceId}/delivery?saved=1`);
}

export async function saveCompanionDeliveryOverrideAction(experienceId: string, offeringId: string, companionModuleId: string, form: FormData) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to configure this Companion delivery.");
  const db = createAdminSupabaseClient();
  const offering = await db.from("experience_offerings").select("id,name,experience_id,experience_version_id,cohort_id").eq("id", offeringId).eq("experience_id", experienceId).maybeSingle();
  if (!offering.data?.experience_version_id) throw new Error("Pin this offering to a Course Version first.");
  const companionModule = await db.from("companion_modules").select("id,display_title,module_type,experience_version_id").eq("id", companionModuleId).eq("experience_version_id", offering.data.experience_version_id).maybeSingle();
  if (!companionModule.data) throw new Error("This Companion module does not belong to the Offering's Course Version.");
  const plan = offering.data.cohort_id ? await db.from("cohort_course_plans").select("id").eq("cohort_id", offering.data.cohort_id).eq("experience_version_id", offering.data.experience_version_id).eq("status", "active").maybeSingle() : { data: null, error: null };
  if (plan.error) throw new Error(`The cohort delivery could not be resolved: ${plan.error.message}`);
  const values: Record<string, string> = {};
  for (const key of ["content", "url", "provider", "instructions", "recurring_time", "button_label", "who_can_start", "date", "time", "location", "note", "name", "role", "action_url", "action_label"]) {
    const value = String(form.get(key) ?? "").trim();
    if (value) values[key] = value;
  }
  if (companionModule.data.module_type === "chat") values.allow_participant_posting = form.has("allow_participant_posting") ? "true" : "false";
  const visibility = String(form.get("visibility") ?? "inherit");
  if (!(["inherit", "visible", "hidden"] as string[]).includes(visibility)) throw new Error("Choose a valid delivery visibility.");
  const existing = plan.data
    ? await db.from("companion_delivery_overrides").select("id").eq("companion_module_id", companionModuleId).eq("cohort_course_plan_id", plan.data.id).maybeSingle()
    : await db.from("companion_delivery_overrides").select("id").eq("companion_module_id", companionModuleId).eq("offering_id", offeringId).maybeSingle();
  if (existing.error) throw new Error(`The delivery override could not be loaded: ${existing.error.message}`);
  const payload = { companion_module_id: companionModuleId, experience_version_id: offering.data.experience_version_id, offering_id: plan.data ? null : offeringId, cohort_course_plan_id: plan.data?.id ?? null, visibility, configuration: values, updated_by: admin.id };
  const result = existing.data ? await db.from("companion_delivery_overrides").update(payload).eq("id", existing.data.id) : await db.from("companion_delivery_overrides").insert(payload);
  if (result.error) throw new Error(`The Companion delivery could not be saved: ${result.error.message}`);
  await audit(admin, "course.companion.delivery_updated", "companion_module", companionModuleId, { experienceId, offeringId, cohortCoursePlanId: plan.data?.id ?? null });
  revalidatePath(`/admin/trainings/${experienceId}/delivery`);
  redirect(`/admin/trainings/${experienceId}/delivery?companionSaved=1`);
}

export async function setAdminCompanionCallStateAction(experienceId: string, offeringId: string, companionModuleId: string, command: "start" | "end") {
  const admin = await requireAdmin();
  const db = createAdminSupabaseClient();
  const offering = await db.from("experience_offerings").select("id,experience_version_id,cohort_id").eq("id", offeringId).eq("experience_id", experienceId).maybeSingle();
  if (!offering.data?.experience_version_id) throw new Error("The Group delivery is not version-pinned.");
  const companionModule = await db.from("companion_modules").select("id,module_type,audience").eq("id", companionModuleId).eq("experience_version_id", offering.data.experience_version_id).maybeSingle();
  if (companionModule.data?.module_type !== "video_call" || companionModule.data.audience !== "group") throw new Error("This is not a Group Video Call module.");
  const plan = offering.data.cohort_id ? await db.from("cohort_course_plans").select("id").eq("cohort_id", offering.data.cohort_id).eq("experience_version_id", offering.data.experience_version_id).eq("status", "active").maybeSingle() : { data: null, error: null };
  const override = plan.data ? await db.from("companion_delivery_overrides").select("id").eq("companion_module_id", companionModuleId).eq("cohort_course_plan_id", plan.data.id).maybeSingle() : await db.from("companion_delivery_overrides").select("id").eq("companion_module_id", companionModuleId).eq("offering_id", offeringId).maybeSingle();
  if (!override.data) throw new Error("Save the delivery meeting details before starting the call.");
  const result = command === "start" ? await db.from("companion_call_sessions").insert({ delivery_override_id: override.data.id, companion_module_id: companionModuleId, experience_version_id: offering.data.experience_version_id, started_by_auth_user_id: admin.id, status: "live" }) : await db.from("companion_call_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("delivery_override_id", override.data.id).eq("status", "live");
  if (result.error && !(command === "start" && result.error.code === "23505")) throw new Error(`Call state could not be ${command === "start" ? "started" : "ended"}: ${result.error.message}`);
  await audit(admin, `course.companion.call_${command}`, "companion_module", companionModuleId, { experienceId, offeringId, deliveryOverrideId: override.data.id });
  revalidatePath(`/admin/trainings/${experienceId}/delivery`);
  redirect(`/admin/trainings/${experienceId}/delivery?companionSaved=1`);
}
