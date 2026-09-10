"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { configureSectionLayout, moveSectionColumn, updateSectionColumns } from "@/lib/experiences/admin/layout-mutations";

function path(experienceId: string, versionId: string, sectionId: string, message?: { error?: string; saved?: string }) {
  const route = `/admin/trainings/${experienceId}/versions/${versionId}/sections/${sectionId}/layout`;
  if (!message) return route;
  const query = new URLSearchParams();
  if (message.error) query.set("error", message.error);
  if (message.saved) query.set("saved", message.saved);
  return `${route}?${query}`;
}

async function run(experienceId: string, versionId: string, sectionId: string, operation: () => Promise<void>, saved: string) {
  try { await operation(); } catch (error) { redirect(path(experienceId, versionId, sectionId, { error: error instanceof Error ? error.message : "Unable to update the layout." })); }
  revalidatePath(path(experienceId, versionId, sectionId));
  redirect(path(experienceId, versionId, sectionId, { saved }));
}

export async function configureLayoutAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, sectionId, () => configureSectionLayout(experienceId, versionId, sectionId, form), "Section layout saved."); }
export async function updateColumnsAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, sectionId, () => updateSectionColumns(experienceId, versionId, sectionId, form), "Column settings saved."); }
export async function moveColumnAction(experienceId: string, versionId: string, sectionId: string, columnId: string, direction: "left" | "right") { await run(experienceId, versionId, sectionId, () => moveSectionColumn(experienceId, versionId, sectionId, columnId, direction), "Column order saved."); }
