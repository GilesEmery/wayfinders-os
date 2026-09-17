"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { configureSectionLayout, moveSectionColumn, updateSectionColumns } from "@/lib/experiences/admin/layout-mutations";
import { createBlock, deleteBlock, duplicateBlock, moveBlock, reorderBlock, setBlockAsset, updateBlock, updateBlockSettings } from "@/lib/experiences/admin/block-mutations";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

async function runBlock(experienceId: string, versionId: string, sectionId: string, operation: () => Promise<void | string>, saved: string, selectedBlockId?: string) {
  const experience = await createAdminSupabaseClient().from("experiences").select("delivery_mode").eq("id", experienceId).maybeSingle();
  const builder = !experience.error && experience.data?.delivery_mode === "builder";
  const destination = (message?: { error?: string; saved?: string }, blockId?: string) => {
    if (!builder) return path(experienceId, versionId, sectionId, message);
    const query = new URLSearchParams({ section: sectionId });
    if (blockId) query.set("block", blockId);
    if (message?.error) query.set("error", message.error);
    if (message?.saved) query.set("saved", message.saved);
    return `/admin/trainings/${experienceId}/versions/${versionId}?${query}`;
  };
  let operationBlockId: void | string;
  try { operationBlockId = await operation(); } catch (error) { redirect(destination({ error: error instanceof Error ? error.message : "Unable to update Content." }, selectedBlockId)); }
  revalidatePath(path(experienceId, versionId, sectionId));
  if (builder) revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);
  redirect(destination({ saved }, operationBlockId || selectedBlockId));
}

export async function configureLayoutAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, sectionId, () => configureSectionLayout(experienceId, versionId, sectionId, form), "Section layout saved."); }
export async function updateColumnsAction(experienceId: string, versionId: string, sectionId: string, form: FormData) { await run(experienceId, versionId, sectionId, () => updateSectionColumns(experienceId, versionId, sectionId, form), "Column settings saved."); }
export async function moveColumnAction(experienceId: string, versionId: string, sectionId: string, columnId: string, direction: "left" | "right") { await run(experienceId, versionId, sectionId, () => moveSectionColumn(experienceId, versionId, sectionId, columnId, direction), "Column order saved."); }
export async function createBlockAction(experienceId: string, versionId: string, sectionId: string, columnId: string, blockType: string) { await runBlock(experienceId, versionId, sectionId, () => createBlock(experienceId, versionId, sectionId, columnId, blockType), "Content added."); }
export async function updateBlockAction(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) { await runBlock(experienceId, versionId, sectionId, () => updateBlock(experienceId, versionId, sectionId, blockId, form), "Content saved.", blockId); }
export async function saveInlineBlockAction(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateBlock(experienceId, versionId, sectionId, blockId, form);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save Content." };
  }
}
export async function updateBlockSettingsAction(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) { await runBlock(experienceId, versionId, sectionId, () => updateBlockSettings(experienceId, versionId, sectionId, blockId, form), "Block settings saved.", blockId); }
export async function setBlockAssetAction(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) { await runBlock(experienceId, versionId, sectionId, () => setBlockAsset(experienceId, versionId, sectionId, blockId, form), "Asset selection saved.", blockId); }
export async function deleteBlockAction(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) { await runBlock(experienceId, versionId, sectionId, () => deleteBlock(experienceId, versionId, sectionId, blockId, form.get("confirm") === "on"), "Content deleted."); }
export async function duplicateBlockAction(experienceId: string, versionId: string, sectionId: string, blockId: string) { await runBlock(experienceId, versionId, sectionId, () => duplicateBlock(experienceId, versionId, sectionId, blockId), "Content duplicated."); }
export async function reorderBlockAction(experienceId: string, versionId: string, sectionId: string, blockId: string, direction: "up" | "down") { await runBlock(experienceId, versionId, sectionId, () => reorderBlock(experienceId, versionId, sectionId, blockId, direction), "Content order saved."); }
export async function moveBlockAction(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) { await runBlock(experienceId, versionId, sectionId, () => moveBlock(experienceId, versionId, sectionId, blockId, String(form.get("target_column_id") ?? "")), "Content moved."); }
