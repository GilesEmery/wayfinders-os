import "server-only";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { isApprovedSectionRendererKey } from "../builder/section-renderer-registry";
import { assertVersionEditable } from "../builder/validation";

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIREMENTS = new Set(["required", "recommended", "optional"]);
const LESSON_COMPLETION = new Set(["view", "manual", "blocks_complete", "response_submitted"]);
const SECTION_COMPLETION = new Set(["view", "manual", "all_required_blocks", "response_submitted"]);
const RENDERERS = new Set(["builder", "hybrid", "custom", "route_handoff"]);
type Kind = "module" | "lesson" | "section";
type Direction = "up" | "down";

function field(form: FormData, name: string, max: number, required = false) {
  const value = String(form.get(name) ?? "").trim();
  if ((required && !value) || value.length > max) throw new Error(`Enter a valid ${name.replaceAll("_", " ")}.`);
  return value;
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "item";
}

async function context(experienceId: string, versionId: string) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to author this Experience.");
  const db = createAdminSupabaseClient();
  const result = await db.from("experience_versions").select("id,experience_id,status").eq("id", versionId).eq("experience_id", experienceId).maybeSingle();
  if (result.error || !result.data) throw new Error("The Version does not belong to this Experience.");
  assertVersionEditable(result.data.status);
  return { admin, db };
}

async function uniqueKey(table: "experience_modules" | "experience_lessons" | "experience_sections", _parentColumn: "experience_version_id" | "module_id" | "lesson_id", parentId: string, requested: string, currentId?: string) {
  const base = slug(requested);
  for (let index = 1; index < 1000; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const db = createAdminSupabaseClient();
    let query = table === "experience_modules"
      ? db.from("experience_modules").select("id").eq("experience_version_id", parentId).eq("module_key", candidate)
      : table === "experience_lessons"
        ? db.from("experience_lessons").select("id").eq("module_id", parentId).eq("lesson_key", candidate)
        : db.from("experience_sections").select("id").eq("lesson_id", parentId).eq("section_key", candidate);
    if (currentId) query = query.neq("id", currentId);
    const result = await query.maybeSingle();
    if (result.error) throw new Error(`Unable to verify the key: ${result.error.message}`);
    if (!result.data) return candidate;
  }
  throw new Error("Unable to generate a unique key.");
}

async function normalize(table: "experience_modules" | "experience_lessons" | "experience_sections", _parentColumn: "experience_version_id" | "module_id" | "lesson_id", parentId: string) {
  const db = createAdminSupabaseClient();
  const rows = table === "experience_modules"
    ? await db.from("experience_modules").select("id,sort_order").eq("experience_version_id", parentId).order("sort_order").order("created_at")
    : table === "experience_lessons"
      ? await db.from("experience_lessons").select("id,sort_order").eq("module_id", parentId).order("sort_order").order("created_at")
      : await db.from("experience_sections").select("id,sort_order").eq("lesson_id", parentId).order("sort_order").order("created_at");
  if (rows.error) throw new Error(`Unable to load sibling order: ${rows.error.message}`);
  for (const [sortOrder, row] of (rows.data ?? []).entries()) {
    if (row.sort_order !== sortOrder) {
      const update = table === "experience_modules"
        ? await db.from("experience_modules").update({ sort_order: sortOrder }).eq("id", row.id)
        : table === "experience_lessons"
          ? await db.from("experience_lessons").update({ sort_order: sortOrder }).eq("id", row.id)
          : await db.from("experience_sections").update({ sort_order: sortOrder }).eq("id", row.id);
      if (update.error) throw new Error(`Unable to normalize sibling order: ${update.error.message}`);
    }
  }
}

async function parentMax(table: "experience_modules" | "experience_lessons" | "experience_sections", _parentColumn: "experience_version_id" | "module_id" | "lesson_id", parentId: string) {
  const db = createAdminSupabaseClient();
  const result = table === "experience_modules"
    ? await db.from("experience_modules").select("sort_order").eq("experience_version_id", parentId).order("sort_order", { ascending: false }).limit(1)
    : table === "experience_lessons"
      ? await db.from("experience_lessons").select("sort_order").eq("module_id", parentId).order("sort_order", { ascending: false }).limit(1)
      : await db.from("experience_sections").select("sort_order").eq("lesson_id", parentId).order("sort_order", { ascending: false }).limit(1);
  if (result.error) throw new Error(`Unable to determine sort order: ${result.error.message}`);
  return (result.data?.[0]?.sort_order ?? -1) + 1;
}

function requirement(form: FormData) {
  const value = field(form, "requirement_level", 20, true);
  if (!REQUIREMENTS.has(value)) throw new Error("Invalid requirement level.");
  return value;
}

export async function createModule(experienceId: string, versionId: string, form: FormData) {
  const { admin, db } = await context(experienceId, versionId);
  const title = field(form, "title", 200, true);
  const requested = field(form, "module_key", 80) || title;
  const moduleKey = await uniqueKey("experience_modules", "experience_version_id", versionId, requested);
  const payload: TablesInsert<"experience_modules"> = { experience_version_id: versionId, title, module_key: moduleKey, description: field(form, "description", 3000) || null, requirement_level: requirement(form), is_required: form.get("requirement_level") === "required", sort_order: await parentMax("experience_modules", "experience_version_id", versionId) };
  const result = await db.from("experience_modules").insert(payload).select("id").single();
  if (result.error) throw new Error(`Unable to create Module: ${result.error.message}`);
  await audit(admin, "module.created", "experience_module", result.data.id, { experienceId, versionId, moduleKey });
}

export async function updateModule(experienceId: string, versionId: string, moduleId: string, form: FormData) {
  const { admin, db } = await context(experienceId, versionId);
  const current = await db.from("experience_modules").select("id").eq("id", moduleId).eq("experience_version_id", versionId).maybeSingle();
  if (!current.data) throw new Error("Module not found in this Version.");
  const title = field(form, "title", 200, true);
  const key = field(form, "module_key", 80, true).toLowerCase();
  if (!KEY.test(key)) throw new Error("Module key must use lowercase letters, numbers, and single hyphens.");
  const moduleKey = await uniqueKey("experience_modules", "experience_version_id", versionId, key, moduleId);
  if (moduleKey !== key) throw new Error("That Module key is already in use.");
  const level = requirement(form);
  const updates: TablesUpdate<"experience_modules"> = { title, module_key: key, description: field(form, "description", 3000) || null, requirement_level: level, is_required: level === "required" };
  const result = await db.from("experience_modules").update(updates).eq("id", moduleId).eq("experience_version_id", versionId);
  if (result.error) throw new Error(`Unable to update Module: ${result.error.message}`);
  await audit(admin, "module.updated", "experience_module", moduleId, { experienceId, versionId });
}

export async function createLesson(experienceId: string, versionId: string, moduleId: string, form: FormData) {
  const { admin, db } = await context(experienceId, versionId);
  const parent = await db.from("experience_modules").select("id").eq("id", moduleId).eq("experience_version_id", versionId).maybeSingle();
  if (!parent.data) throw new Error("Module not found in this Version.");
  const title = field(form, "title", 200, true);
  const lessonKey = await uniqueKey("experience_lessons", "module_id", moduleId, field(form, "lesson_key", 80) || title);
  const completion = field(form, "completion_rule", 40) || "view";
  if (!LESSON_COMPLETION.has(completion)) throw new Error("Invalid Lesson completion rule.");
  const level = requirement(form);
  const result = await db.from("experience_lessons").insert({ module_id: moduleId, experience_version_id: versionId, lesson_key: lessonKey, title, description: field(form, "description", 3000) || null, requirement_level: level, is_required: level === "required", completion_rule: completion, sort_order: await parentMax("experience_lessons", "module_id", moduleId) }).select("id").single();
  if (result.error) throw new Error(`Unable to create Lesson: ${result.error.message}`);
  await audit(admin, "lesson.created", "experience_lesson", result.data.id, { experienceId, versionId, moduleId, lessonKey });
}

export async function updateLesson(experienceId: string, versionId: string, lessonId: string, form: FormData) {
  const { admin, db } = await context(experienceId, versionId);
  const current = await db.from("experience_lessons").select("id,module_id").eq("id", lessonId).eq("experience_version_id", versionId).maybeSingle();
  if (!current.data) throw new Error("Lesson not found in this Version.");
  const key = field(form, "lesson_key", 80, true).toLowerCase();
  if (!KEY.test(key)) throw new Error("Lesson key must use lowercase letters, numbers, and single hyphens.");
  if (await uniqueKey("experience_lessons", "module_id", current.data.module_id, key, lessonId) !== key) throw new Error("That Lesson key is already in use.");
  const completion = field(form, "completion_rule", 40, true);
  if (!LESSON_COMPLETION.has(completion)) throw new Error("Invalid Lesson completion rule.");
  const level = requirement(form);
  const result = await db.from("experience_lessons").update({ title: field(form, "title", 200, true), lesson_key: key, description: field(form, "description", 3000) || null, requirement_level: level, is_required: level === "required", completion_rule: completion }).eq("id", lessonId).eq("experience_version_id", versionId);
  if (result.error) throw new Error(`Unable to update Lesson: ${result.error.message}`);
  await audit(admin, "lesson.updated", "experience_lesson", lessonId, { experienceId, versionId });
}

export async function createSection(experienceId: string, versionId: string, lessonId: string, form: FormData) {
  const { admin, db } = await context(experienceId, versionId);
  const lesson = await db.from("experience_lessons").select("id,module_id").eq("id", lessonId).eq("experience_version_id", versionId).maybeSingle();
  if (!lesson.data) throw new Error("Lesson not found in this Version.");
  const title = field(form, "title", 200, true);
  const sectionKey = await uniqueKey("experience_sections", "lesson_id", lessonId, field(form, "section_key", 80) || title);
  const rendererMode = field(form, "renderer_mode", 30) || "builder";
  const customKey = field(form, "custom_renderer_key", 120) || null;
  const completion = field(form, "completion_rule", 40) || "all_required_blocks";
  if (!RENDERERS.has(rendererMode) || !SECTION_COMPLETION.has(completion)) throw new Error("Invalid Section behavior.");
  if ((rendererMode === "custom" || rendererMode === "route_handoff") && !customKey) throw new Error("Custom and route handoff Sections require an approved renderer key.");
  if (customKey && !isApprovedSectionRendererKey(customKey)) throw new Error("That Section renderer key is not approved in the source-controlled registry.");
  const result = await db.from("experience_sections").insert({ lesson_id: lessonId, module_id: lesson.data.module_id, experience_version_id: versionId, section_key: sectionKey, title, description: field(form, "description", 3000) || null, requirement_level: requirement(form), renderer_mode: rendererMode, custom_renderer_key: customKey, completion_rule: completion, sort_order: await parentMax("experience_sections", "lesson_id", lessonId) }).select("id").single();
  if (result.error) throw new Error(`Unable to create Section: ${result.error.message}`);
  await audit(admin, "section.created", "experience_section", result.data.id, { experienceId, versionId, lessonId, sectionKey });
}

export async function updateSection(experienceId: string, versionId: string, sectionId: string, form: FormData) {
  const { admin, db } = await context(experienceId, versionId);
  const current = await db.from("experience_sections").select("id,lesson_id").eq("id", sectionId).eq("experience_version_id", versionId).maybeSingle();
  if (!current.data) throw new Error("Section not found in this Version.");
  const key = field(form, "section_key", 80, true).toLowerCase();
  if (!KEY.test(key)) throw new Error("Section key must use lowercase letters, numbers, and single hyphens.");
  if (await uniqueKey("experience_sections", "lesson_id", current.data.lesson_id, key, sectionId) !== key) throw new Error("That Section key is already in use.");
  const rendererMode = field(form, "renderer_mode", 30, true);
  const customKey = field(form, "custom_renderer_key", 120) || null;
  const completion = field(form, "completion_rule", 40, true);
  if (!RENDERERS.has(rendererMode) || !SECTION_COMPLETION.has(completion)) throw new Error("Invalid Section behavior.");
  if ((rendererMode === "custom" || rendererMode === "route_handoff") && !customKey) throw new Error("Custom and route handoff Sections require an approved renderer key.");
  if (customKey && !isApprovedSectionRendererKey(customKey)) throw new Error("That Section renderer key is not approved in the source-controlled registry.");
  const result = await db.from("experience_sections").update({ title: field(form, "title", 200, true), section_key: key, description: field(form, "description", 3000) || null, requirement_level: requirement(form), renderer_mode: rendererMode, custom_renderer_key: customKey, completion_rule: completion }).eq("id", sectionId).eq("experience_version_id", versionId);
  if (result.error) throw new Error(`Unable to update Section: ${result.error.message}`);
  await audit(admin, "section.updated", "experience_section", sectionId, { experienceId, versionId });
}

export async function reorderItem(experienceId: string, versionId: string, kind: Kind, itemId: string, direction: Direction) {
  const { admin, db } = await context(experienceId, versionId);
  const current = kind === "module"
    ? await db.from("experience_modules").select("id,sort_order,experience_version_id").eq("id", itemId).eq("experience_version_id", versionId).maybeSingle()
    : kind === "lesson"
      ? await db.from("experience_lessons").select("id,sort_order,module_id,experience_version_id").eq("id", itemId).eq("experience_version_id", versionId).maybeSingle()
      : await db.from("experience_sections").select("id,sort_order,lesson_id,experience_version_id").eq("id", itemId).eq("experience_version_id", versionId).maybeSingle();
  if (!current.data) throw new Error(`${kind} not found in this Version.`);
  const parentId = String("module_id" in current.data ? current.data.module_id : "lesson_id" in current.data ? current.data.lesson_id : versionId);
  const table = kind === "module" ? "experience_modules" : kind === "lesson" ? "experience_lessons" : "experience_sections";
  const parent = kind === "module" ? "experience_version_id" : kind === "lesson" ? "module_id" : "lesson_id";
  await normalize(table, parent, parentId);
  const refreshed = kind === "module" ? await db.from("experience_modules").select("id,sort_order").eq("id", itemId).single() : kind === "lesson" ? await db.from("experience_lessons").select("id,sort_order").eq("id", itemId).single() : await db.from("experience_sections").select("id,sort_order").eq("id", itemId).single();
  if (!refreshed.data) throw new Error("Unable to reorder item.");
  const targetOrder = refreshed.data.sort_order + (direction === "up" ? -1 : 1);
  const sibling = kind === "module" ? await db.from("experience_modules").select("id,sort_order").eq("experience_version_id", parentId).eq("sort_order", targetOrder).maybeSingle() : kind === "lesson" ? await db.from("experience_lessons").select("id,sort_order").eq("module_id", parentId).eq("sort_order", targetOrder).maybeSingle() : await db.from("experience_sections").select("id,sort_order").eq("lesson_id", parentId).eq("sort_order", targetOrder).maybeSingle();
  if (!sibling.data) return;
  const temporary = -1 - refreshed.data.sort_order;
  for (const [id, order] of [[itemId, temporary], [sibling.data.id, refreshed.data.sort_order], [itemId, targetOrder]] as const) {
    const result = kind === "module" ? await db.from("experience_modules").update({ sort_order: order }).eq("id", id) : kind === "lesson" ? await db.from("experience_lessons").update({ sort_order: order }).eq("id", id) : await db.from("experience_sections").update({ sort_order: order }).eq("id", id);
    if (result.error) throw new Error(`Unable to reorder ${kind}: ${result.error.message}`);
  }
  await audit(admin, `${kind}.reordered`, `experience_${kind}`, itemId, { experienceId, versionId, direction });
}

export async function moveSection(experienceId: string, versionId: string, sectionId: string, targetLessonId: string) {
  const { admin, db } = await context(experienceId, versionId);
  const [section, lesson] = await Promise.all([
    db.from("experience_sections").select("id,lesson_id,module_id").eq("id", sectionId).eq("experience_version_id", versionId).maybeSingle(),
    db.from("experience_lessons").select("id,module_id").eq("id", targetLessonId).eq("experience_version_id", versionId).maybeSingle(),
  ]);
  if (!section.data || !lesson.data) throw new Error("Source Section or target Lesson is outside this Version.");
  if (section.data.lesson_id === targetLessonId) return;
  const sourceLessonId = section.data.lesson_id;
  const result = await db.from("experience_sections").update({ lesson_id: targetLessonId, module_id: lesson.data.module_id, sort_order: await parentMax("experience_sections", "lesson_id", targetLessonId) }).eq("id", sectionId).eq("experience_version_id", versionId);
  if (result.error) throw new Error(`Unable to move Section: ${result.error.message}`);
  await normalize("experience_sections", "lesson_id", sourceLessonId);
  await normalize("experience_sections", "lesson_id", targetLessonId);
  await audit(admin, "section.moved", "experience_section", sectionId, { experienceId, versionId, sourceLessonId, targetLessonId, targetModuleId: lesson.data.module_id });
}

export async function deleteItem(experienceId: string, versionId: string, kind: Kind, itemId: string, confirmed: boolean) {
  if (!confirmed) throw new Error("Confirm the destructive impact before deleting.");
  const { admin, db } = await context(experienceId, versionId);
  const current = kind === "module" ? await db.from("experience_modules").select("id,experience_version_id").eq("id", itemId).eq("experience_version_id", versionId).maybeSingle() : kind === "lesson" ? await db.from("experience_lessons").select("id,module_id").eq("id", itemId).eq("experience_version_id", versionId).maybeSingle() : await db.from("experience_sections").select("id,lesson_id").eq("id", itemId).eq("experience_version_id", versionId).maybeSingle();
  if (!current.data) throw new Error(`${kind} not found in this Version.`);
  if (kind === "module") {
    const children = await db.from("experience_lessons").select("id", { count: "exact", head: true }).eq("module_id", itemId);
    if (children.count) throw new Error("This Module still contains Lessons. Delete its child curriculum explicitly first.");
  }
  if (kind === "lesson") {
    const children = await db.from("experience_sections").select("id", { count: "exact", head: true }).eq("lesson_id", itemId);
    if (children.count) throw new Error("This Lesson still contains Sections. Delete its child curriculum explicitly first.");
  }
  const result = kind === "module" ? await db.from("experience_modules").delete().eq("id", itemId).eq("experience_version_id", versionId) : kind === "lesson" ? await db.from("experience_lessons").delete().eq("id", itemId).eq("experience_version_id", versionId) : await db.from("experience_sections").delete().eq("id", itemId).eq("experience_version_id", versionId);
  if (result.error) throw new Error(`Unable to delete ${kind}: ${result.error.message}`);
  const parentId = String("module_id" in current.data ? current.data.module_id : "lesson_id" in current.data ? current.data.lesson_id : versionId);
  await normalize(kind === "module" ? "experience_modules" : kind === "lesson" ? "experience_lessons" : "experience_sections", kind === "module" ? "experience_version_id" : kind === "lesson" ? "module_id" : "lesson_id", parentId);
  await audit(admin, `${kind}.deleted`, `experience_${kind}`, itemId, { experienceId, versionId });
}
