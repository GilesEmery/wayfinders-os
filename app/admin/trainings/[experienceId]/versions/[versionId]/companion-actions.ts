"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { COMPANION_LIBRARY, companionAvailability, companionType, type CompanionAudience, type CompanionScope } from "@/lib/experiences/builder/companion";

const route = (experienceId: string, versionId: string, selectedId?: string, saved?: string) => {
  const query = new URLSearchParams();
  if (selectedId) query.set("section", selectedId);
  if (saved) query.set("saved", saved);
  return `/admin/trainings/${experienceId}/versions/${versionId}${query.size ? `?${query}` : ""}`;
};

async function editable(experienceId: string, versionId: string) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to configure this Companion.");
  const db = createAdminSupabaseClient();
  const version = await db.from("experience_versions").select("id,status,course_configuration").eq("id", versionId).eq("experience_id", experienceId).maybeSingle();
  if (version.error || version.data?.status !== "draft") throw new Error("Only a Draft Course Companion can be changed.");
  return { admin, db, version: version.data };
}

export async function addCompanionModuleAction(experienceId: string, versionId: string, selectedId: string | undefined, form: FormData) {
  const { admin, db } = await editable(experienceId, versionId);
  const type = companionType(form.get("module_type"));
  if (!type) throw new Error("Choose a supported Companion module.");
  const definition = COMPANION_LIBRARY[type];
  const selected = selectedId ? await db.from("experience_sections").select("id,module_id,lesson_id").eq("id", selectedId).eq("experience_version_id", versionId).maybeSingle() : { data: null, error: null };
  if (selected.error) throw new Error("The current curriculum location could not be resolved.");
  const scope = definition.defaultScope === "course" || selected.data ? definition.defaultScope : "course";
  const targetModuleId = scope === "course" ? null : selected.data?.module_id ?? null;
  const targetLessonId = scope === "lesson" || scope === "page" ? selected.data?.lesson_id ?? null : null;
  const targetSectionId = scope === "page" ? selected.data?.id ?? null : null;
  const latest = await db.from("companion_modules").select("sort_order").eq("experience_version_id", versionId).order("sort_order", { ascending: false }).limit(1);
  if (latest.error) throw new Error("Companion ordering could not be loaded.");
  const inserted = await db.from("companion_modules").insert({ experience_version_id: versionId, module_type: type, scope, audience: definition.defaultAudience, availability_context: definition.defaultAvailability, target_module_id: targetModuleId, target_lesson_id: targetLessonId, target_section_id: targetSectionId, display_title: definition.label, sort_order: (latest.data?.[0]?.sort_order ?? -1) + 1, configuration: {}, created_by: admin.id }).select("id").single();
  if (inserted.error) throw new Error(`Companion module could not be added: ${inserted.error.message}`);
  await audit(admin, "course.companion.module_added", "companion_module", inserted.data.id, { experienceId, versionId, type });
  revalidatePath(route(experienceId, versionId));
  redirect(route(experienceId, versionId, selectedId, `${definition.label} added.`));
}

function configuration(form: FormData, type: string): Json {
  const values: Record<string, Json> = {};
  for (const key of ["content", "url", "provider", "instructions", "recurring_time", "button_label", "who_can_start", "date", "time", "location", "note", "name", "role", "action_url", "action_label"]) {
    const value = String(form.get(key) ?? "").trim();
    if (value) values[key] = value;
  }
  const items = String(form.get("items") ?? "").split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 50);
  if (items.length) values.items = items;
  if (form.has("allow_participant_posting")) values.allow_participant_posting = "true";
  else if (type === "chat") values.allow_participant_posting = "false";
  return values;
}

export async function updateCompanionModuleAction(experienceId: string, versionId: string, moduleId: string, selectedId: string | undefined, form: FormData) {
  const { admin, db } = await editable(experienceId, versionId);
  const existing = await db.from("companion_modules").select("*").eq("id", moduleId).eq("experience_version_id", versionId).maybeSingle();
  if (existing.error || !existing.data) throw new Error("Companion module was not found.");
  const type = companionType(existing.data.module_type); if (!type) throw new Error("Unsupported Companion module type.");
  const scope = String(form.get("scope") ?? "") as CompanionScope;
  const audience = String(form.get("audience") ?? "") as CompanionAudience;
  const availability = companionAvailability(form.get("availability_context"));
  const definition = COMPANION_LIBRARY[type];
  if (!(["course", "module", "lesson", "page"] as string[]).includes(scope)) throw new Error("Choose where this module should appear.");
  if (!definition.audiences.includes(audience)) throw new Error(`${definition.label} does not support that audience.`);
  if (!availability || !definition.availabilities.includes(availability)) throw new Error(`${definition.label} does not support that availability.`);
  const targetModuleId = scope === "course" ? null : String(form.get("target_module_id") ?? "") || null;
  const targetLessonId = scope === "lesson" || scope === "page" ? String(form.get("target_lesson_id") ?? "") || null : null;
  const targetSectionId = scope === "page" ? String(form.get("target_section_id") ?? "") || null : null;
  if (scope !== "course" && !targetModuleId || (scope === "lesson" || scope === "page") && !targetLessonId || scope === "page" && !targetSectionId) throw new Error("Choose the curriculum target for this scope.");
  const title = String(form.get("display_title") ?? "").trim(); if (!title || title.length > 200) throw new Error("Enter a module title of 200 characters or fewer.");
  const result = await db.from("companion_modules").update({ display_title: title, scope, audience, availability_context: availability, target_module_id: targetModuleId, target_lesson_id: targetLessonId, target_section_id: targetSectionId, configuration: configuration(form, type) }).eq("id", moduleId).eq("experience_version_id", versionId);
  if (result.error) throw new Error(`Companion module could not be saved: ${result.error.message}`);
  if (type === "resources" || type === "shared_resources") {
    const resourceIds = [...new Set(form.getAll("resource_id").map(String).filter(Boolean))];
    const removed = await db.from("companion_module_resources").delete().eq("companion_module_id", moduleId).is("delivery_override_id", null);
    if (removed.error) throw new Error("Existing Companion resources could not be updated.");
    if (resourceIds.length) { const linked = await db.from("companion_module_resources").insert(resourceIds.map((resourceId, sortOrder) => ({ companion_module_id: moduleId, resource_id: resourceId, sort_order: sortOrder }))); if (linked.error) throw new Error(`Companion resources could not be linked: ${linked.error.message}`); }
  }
  await audit(admin, "course.companion.module_updated", "companion_module", moduleId, { experienceId, versionId, scope, audience, availability });
  revalidatePath(route(experienceId, versionId));
  redirect(route(experienceId, versionId, selectedId, `${title} saved.`));
}

export async function companionModuleCommandAction(experienceId: string, versionId: string, moduleId: string, selectedId: string | undefined, command: "up" | "down" | "toggle" | "remove") {
  const { admin, db } = await editable(experienceId, versionId);
  const all = await db.from("companion_modules").select("id,sort_order,visibility,display_title").eq("experience_version_id", versionId).order("sort_order");
  if (all.error) throw new Error("Companion modules could not be loaded.");
  const index = (all.data ?? []).findIndex((item) => item.id === moduleId); if (index < 0) throw new Error("Companion module was not found.");
  const current = all.data![index];
  if (command === "remove") {
    const removed = await db.from("companion_modules").delete().eq("id", moduleId).eq("experience_version_id", versionId); if (removed.error) throw new Error(`Companion module could not be removed: ${removed.error.message}`);
  } else if (command === "toggle") {
    const updated = await db.from("companion_modules").update({ visibility: current.visibility === "hidden" ? "visible" : "hidden" }).eq("id", moduleId); if (updated.error) throw new Error("Companion visibility could not be changed.");
  } else {
    const target = all.data![index + (command === "up" ? -1 : 1)];
    if (target) {
      const temporary = Math.max(...all.data!.map((item) => item.sort_order)) + 1000;
      const first = await db.from("companion_modules").update({ sort_order: temporary }).eq("id", current.id);
      const second = first.error ? first : await db.from("companion_modules").update({ sort_order: current.sort_order }).eq("id", target.id);
      const third = second.error ? second : await db.from("companion_modules").update({ sort_order: target.sort_order }).eq("id", current.id);
      if (first.error || second.error || third.error) throw new Error("Companion order could not be changed.");
    }
  }
  await audit(admin, `course.companion.module_${command}`, "companion_module", moduleId, { experienceId, versionId });
  revalidatePath(route(experienceId, versionId));
  redirect(route(experienceId, versionId, selectedId, command === "remove" ? `${current.display_title} removed.` : "Companion updated."));
}
