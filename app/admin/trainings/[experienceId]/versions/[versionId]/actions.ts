"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLesson, createModule, createSection, deleteItem, moveSection, reorderItem, updateLesson, updateModule, updateSection } from "@/lib/experiences/admin/curriculum-mutations";

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
export async function reorderAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, direction: "up" | "down") { await run(experienceId, versionId, () => reorderItem(experienceId, versionId, kind, itemId, direction), `${kind[0].toUpperCase()}${kind.slice(1)} reordered.`); }
export async function moveSectionAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, () => moveSection(experienceId, versionId, sectionId, String(form.get("target_lesson_id") ?? "")), "Section moved."); }
export async function deleteAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, form: FormData) { await run(experienceId, versionId, () => deleteItem(experienceId, versionId, kind, itemId, form.get("confirm_delete") === "yes"), `${kind[0].toUpperCase()}${kind.slice(1)} deleted.`); }
