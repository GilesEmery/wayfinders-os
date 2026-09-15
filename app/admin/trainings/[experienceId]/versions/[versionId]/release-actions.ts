"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { clonePublishedVersion, publishVersion } from "@/lib/experiences/admin/version-release";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function workspace(experienceId: string, versionId: string, notice?: { error?: string; saved?: string }) {
  const path = `/admin/trainings/${experienceId}/versions/${versionId}`;
  if (!notice) return path;
  const query = new URLSearchParams(notice as Record<string, string>);
  return `${path}?${query}`;
}

export async function publishVersionAction(experienceId: string, versionId: string, form: FormData) {
  if (form.get("confirm_publish") !== "yes") redirect(workspace(experienceId, versionId, { error: "Confirm publication before continuing." }));
  try { await publishVersion(experienceId, versionId); }
  catch (error) { unstable_rethrow(error); redirect(workspace(experienceId, versionId, { error: error instanceof Error ? error.message : "Publication could not be completed." })); }
  revalidatePath(`/admin/trainings/${experienceId}`);
  revalidatePath(workspace(experienceId, versionId));
  revalidatePath("/experiences");
  revalidatePath("/experiences/[slug]", "page");
  const experience = await createAdminSupabaseClient().from("experiences").select("delivery_mode").eq("id", experienceId).maybeSingle();
  if (experience.data?.delivery_mode === "builder") redirect(`/admin/trainings/${experienceId}`);
  redirect(workspace(experienceId, versionId, { saved: "Version Published and set as the current participant Version." }));
}

export async function cloneVersionAction(experienceId: string, sourceVersionId: string, form: FormData) {
  let newVersionId: string;
  try { newVersionId = await clonePublishedVersion(experienceId, sourceVersionId, String(form.get("version_label") ?? "")); }
  catch (error) { unstable_rethrow(error); redirect(workspace(experienceId, sourceVersionId, { error: error instanceof Error ? error.message : "A new Draft could not be created." })); }
  revalidatePath(`/admin/trainings/${experienceId}`);
  revalidatePath(workspace(experienceId, sourceVersionId));
  revalidatePath(workspace(experienceId, newVersionId));
  redirect(workspace(experienceId, newVersionId, { saved: "New Draft created from the Published Version." }));
}
