"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { acknowledgeCompanionRemoval, reconcileCompanionModule } from "@/lib/experiences/admin/companion-reconciliation";

function workspace(experienceId: string, versionId: string, notice: { error?: string; saved?: string }) {
  const query = new URLSearchParams(notice as Record<string, string>);
  return `/admin/trainings/${experienceId}/versions/${versionId}?${query}#companion-reconciliation`;
}

export async function reconcileCompanionModuleAction(experienceId: string, versionId: string, draftModuleId: string, sourceModuleId: string) {
  try { await reconcileCompanionModule(experienceId, versionId, draftModuleId, sourceModuleId); }
  catch (error) { unstable_rethrow(error); redirect(workspace(experienceId, versionId, { error: error instanceof Error ? error.message : "Companion identity could not be confirmed." })); }
  revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);
  redirect(workspace(experienceId, versionId, { saved: "Companion module continuity confirmed." }));
}

export async function acknowledgeCompanionRemovalAction(experienceId: string, versionId: string, sourceModuleId: string) {
  try { await acknowledgeCompanionRemoval(experienceId, versionId, sourceModuleId); }
  catch (error) { unstable_rethrow(error); redirect(workspace(experienceId, versionId, { error: error instanceof Error ? error.message : "Companion removal could not be confirmed." })); }
  revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);
  redirect(workspace(experienceId, versionId, { saved: "Intentional Companion removal acknowledged." }));
}
