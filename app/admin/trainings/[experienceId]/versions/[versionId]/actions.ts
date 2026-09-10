"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLesson, createModule, createSection, deleteItem, moveSection, reorderItem, updateLesson, updateModule, updateSection } from "@/lib/experiences/admin/curriculum-mutations";

function url(experienceId: string, versionId: string, values?: { error?: string; saved?: string }) {
  const base = `/admin/trainings/${experienceId}/versions/${versionId}`;
  if (!values) return base;
  const query = new URLSearchParams();
  if (values.error) query.set("error", values.error);
  if (values.saved) query.set("saved", values.saved);
  return `${base}?${query}`;
}

async function run(experienceId: string, versionId: string, operation: () => Promise<void>, saved: string) {
  try { await operation(); }
  catch (error) { redirect(url(experienceId, versionId, { error: error instanceof Error ? error.message : "The curriculum change could not be completed." })); }
  revalidatePath(url(experienceId, versionId));
  redirect(url(experienceId, versionId, { saved }));
}

export async function createModuleAction(experienceId: string, versionId: string, form: FormData) { await run(experienceId, versionId, () => createModule(experienceId, versionId, form), "Module created."); }
export async function updateModuleAction(experienceId: string, versionId: string, moduleId: string, form: FormData) { await run(experienceId, versionId, () => updateModule(experienceId, versionId, moduleId, form), "Module updated."); }
export async function createLessonAction(experienceId: string, versionId: string, moduleId: string, form: FormData) { await run(experienceId, versionId, () => createLesson(experienceId, versionId, moduleId, form), "Lesson created."); }
export async function updateLessonAction(experienceId: string, versionId: string, lessonId: string, form: FormData) { await run(experienceId, versionId, () => updateLesson(experienceId, versionId, lessonId, form), "Lesson updated."); }
export async function createSectionAction(experienceId: string, versionId: string, lessonId: string, form: FormData) { await run(experienceId, versionId, () => createSection(experienceId, versionId, lessonId, form), "Section created."); }
export async function updateSectionAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, () => updateSection(experienceId, versionId, sectionId, form), "Section updated."); }
export async function reorderAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, direction: "up" | "down") { await run(experienceId, versionId, () => reorderItem(experienceId, versionId, kind, itemId, direction), `${kind[0].toUpperCase()}${kind.slice(1)} reordered.`); }
export async function moveSectionAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, () => moveSection(experienceId, versionId, sectionId, String(form.get("target_lesson_id") ?? "")), "Section moved."); }
export async function deleteAction(experienceId: string, versionId: string, kind: "module" | "lesson" | "section", itemId: string, form: FormData) { await run(experienceId, versionId, () => deleteItem(experienceId, versionId, kind, itemId, form.get("confirm_delete") === "yes"), `${kind[0].toUpperCase()}${kind.slice(1)} deleted.`); }
