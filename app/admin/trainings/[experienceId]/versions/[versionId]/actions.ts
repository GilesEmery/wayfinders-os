"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLesson, createModule, createSection, deleteItem, moveLesson, moveModule, moveSection, renameCurriculumItem, reorderItem, updateLesson, updateModule, updateSection } from "@/lib/experiences/admin/curriculum-mutations";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { uploadCourseAsset } from "@/lib/experiences/builder/resource-assets";

function url(experienceId: string, versionId: string, values?: { error?: string; saved?: string; section?: string }) {
  const base = `/admin/trainings/${experienceId}/versions/${versionId}`;
  if (!values) return base;
  const query = new URLSearchParams();
  if (values.error) query.set("error", values.error);
  if (values.saved) query.set("saved", values.saved);
  if (values.section) query.set("section", values.section);
  return `${base}?${query}`;
}

async function run(experienceId: string, versionId: string, operation: () => Promise<unknown>, saved: string, section?: string) {
  try { await operation(); }
  catch (error) { redirect(url(experienceId, versionId, { error: error instanceof Error ? error.message : "The curriculum change could not be completed." })); }
  revalidatePath(url(experienceId, versionId));
  redirect(url(experienceId, versionId, { saved, section }));
}

export async function createModuleAction(experienceId: string, versionId: string, form: FormData) { await run(experienceId, versionId, () => createModule(experienceId, versionId, form), "Module created."); }
export async function updateModuleAction(experienceId: string, versionId: string, moduleId: string, form: FormData) { await run(experienceId, versionId, () => updateModule(experienceId, versionId, moduleId, form), "Module updated."); }
export async function createLessonAction(experienceId: string, versionId: string, moduleId: string, form: FormData) { await run(experienceId, versionId, () => createLesson(experienceId, versionId, moduleId, form), "Lesson created."); }
export async function createCourseLessonAction(experienceId: string, versionId: string, moduleId: string, form: FormData) {
  let lessonId: string;
  try { lessonId = await createLesson(experienceId, versionId, moduleId, form); }
  catch (error) { redirect(url(experienceId, versionId, { error: error instanceof Error ? error.message : "Unable to create Lesson." })); }
  const page = new FormData();
  page.set("title", String(form.get("title") ?? "Lesson"));
  page.set("requirement_level", "required");
  page.set("completion_rule", "all_required_blocks");
  page.set("renderer_mode", "builder");
  let sectionId: string;
  try { sectionId = await createSection(experienceId, versionId, lessonId, page); }
  catch (error) { redirect(url(experienceId, versionId, { error: `Lesson was created, but its Content Page needs attention: ${error instanceof Error ? error.message : "Unable to create Page."}` })); }
  revalidatePath(url(experienceId, versionId));
  redirect(url(experienceId, versionId, { saved: "Lesson created.", section: sectionId }));
}
export async function updateLessonAction(experienceId: string, versionId: string, lessonId: string, form: FormData) { await run(experienceId, versionId, () => updateLesson(experienceId, versionId, lessonId, form), "Lesson updated."); }
export async function createSectionAction(experienceId: string, versionId: string, lessonId: string, form: FormData) {
  let sectionId: string;
  try { sectionId = await createSection(experienceId, versionId, lessonId, form); }
  catch (error) { redirect(url(experienceId, versionId, { error: error instanceof Error ? error.message : "Unable to create Page." })); }
  revalidatePath(url(experienceId, versionId));
  redirect(url(experienceId, versionId, { saved: "Page created.", section: sectionId }));
}
export async function updateSectionAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, () => updateSection(experienceId, versionId, sectionId, form), "Lesson introduction saved.", sectionId); }
export async function setLessonHeroAction(experienceId: string, versionId: string, sectionId: string, form: FormData) {
  await run(experienceId, versionId, async () => {
    const admin = await requireAdmin();
    const authorization = await getAuthorizationContext(admin.id, admin.email);
    if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to edit this Course.");
    const db = createAdminSupabaseClient();
    const section = await db.from("experience_sections").select("id,settings").eq("id", sectionId).eq("experience_version_id", versionId).maybeSingle();
    const version = await db.from("experience_versions").select("status").eq("id", versionId).eq("experience_id", experienceId).maybeSingle();
    if (section.error || version.error || !section.data || version.data?.status !== "draft") throw new Error("Only a Page in this Draft Course can be edited.");
    const operation = String(form.get("asset_operation") ?? "select");
    let resourceId: string | null = String(form.get("resource_id") ?? "") || null;
    if (operation === "upload") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.type.startsWith("image/")) throw new Error("Choose a supported image.");
      resourceId = (await uploadCourseAsset(db, file, experienceId, admin.id, String(form.get("asset_title") ?? ""))).id;
    } else if (operation === "remove") resourceId = null;
    if (resourceId) {
      const resource = await db.from("resources").select("id").eq("id", resourceId).eq("resource_type", "image").eq("status", "active").not("storage_path", "is", null).maybeSingle();
      if (resource.error || !resource.data) throw new Error("Choose an available uploaded image.");
    }
    const settings = section.data.settings && typeof section.data.settings === "object" && !Array.isArray(section.data.settings) ? section.data.settings as Record<string, unknown> : {};
    const result = await db.from("experience_sections").update({ settings: { ...settings, hero_resource_id: resourceId } }).eq("id", sectionId).eq("experience_version_id", versionId);
    if (result.error) throw new Error(`Lesson Hero could not be saved: ${result.error.message}`);
    await audit(admin, "course.lesson_hero.updated", "experience_section", sectionId, { experienceId, versionId, resourceId });
  }, "Lesson Hero saved.", sectionId);
}
export async function reorderAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, direction: "up" | "down") { await run(experienceId, versionId, () => reorderItem(experienceId, versionId, kind, itemId, direction), `${kind[0].toUpperCase()}${kind.slice(1)} reordered.`); }
export async function reorderCurriculumAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, direction: "up" | "down", sectionId?: string) { await run(experienceId, versionId, () => reorderItem(experienceId, versionId, kind, itemId, direction), "Order saved.", sectionId); }
export async function renameCurriculumItemAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, sectionId: string | undefined, form: FormData) { await run(experienceId, versionId, () => renameCurriculumItem(experienceId, versionId, kind, itemId, form), "Title saved.", sectionId); }
export async function moveSectionAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, () => moveSection(experienceId, versionId, sectionId, String(form.get("target_lesson_id") ?? ""), Number(form.get("position"))), "Page moved.", sectionId); }
export async function moveLessonAction(experienceId: string, versionId: string, lessonId: string, form: FormData) { await run(experienceId, versionId, () => moveLesson(experienceId, versionId, lessonId, String(form.get("target_module_id") ?? ""), Number(form.get("position"))), "Lesson moved."); }
export async function dragCurriculumAction(experienceId: string, versionId: string, selectedSectionId: string | undefined, form: FormData) {
  const kind = String(form.get("kind") ?? "");
  const itemId = String(form.get("item_id") ?? "");
  const parentId = String(form.get("parent_id") ?? "");
  const position = Number(form.get("position"));
  if (!itemId || !parentId || !Number.isInteger(position) || !["module", "lesson", "section"].includes(kind)) {
    await run(experienceId, versionId, async () => { throw new Error("That curriculum drop was invalid."); }, "", selectedSectionId);
    return;
  }
  const operation = kind === "module"
    ? () => moveModule(experienceId, versionId, itemId, position)
    : kind === "lesson"
      ? () => moveLesson(experienceId, versionId, itemId, parentId, position)
      : () => moveSection(experienceId, versionId, itemId, parentId, position);
  await run(experienceId, versionId, operation, "Order saved.", selectedSectionId);
}
export async function deleteAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, form: FormData) { await run(experienceId, versionId, () => deleteItem(experienceId, versionId, kind, itemId, form.get("confirm_delete") === "yes"), `${kind[0].toUpperCase()}${kind.slice(1)} deleted.`); }
