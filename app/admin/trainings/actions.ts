"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDraftVersion, createExperience, updateExperience, updateExperienceAccess } from "@/lib/experiences/admin/mutations";

function message(error: unknown) { return encodeURIComponent(error instanceof Error ? error.message : "The request could not be completed."); }

export async function createExperienceAction(form: FormData) {
  let id: string;
  try { id = await createExperience(form); }
  catch (error) { redirect(`/admin/trainings/new?error=${message(error)}`); }
  revalidatePath("/admin/trainings");
  redirect(`/admin/trainings/${id}?created=1`);
}

export async function updateExperienceAction(experienceId: string, form: FormData) {
  try { await updateExperience(experienceId, form); }
  catch (error) { redirect(`/admin/trainings/${experienceId}?error=${message(error)}`); }
  revalidatePath("/admin/trainings");
  revalidatePath(`/admin/trainings/${experienceId}`);
  redirect(`/admin/trainings/${experienceId}?updated=1`);
}

export async function updateExperienceAccessAction(experienceId: string, form: FormData) {
  try { await updateExperienceAccess(experienceId, form); }
  catch (error) { redirect(`/admin/trainings/${experienceId}?error=${message(error)}`); }
  revalidatePath("/admin/trainings");
  revalidatePath("/experiences");
  revalidatePath(`/admin/trainings/${experienceId}`);
  redirect(`/admin/trainings/${experienceId}?accessUpdated=1`);
}

export async function createDraftVersionAction(experienceId: string, form: FormData) {
  try { await createDraftVersion(experienceId, form); }
  catch (error) { redirect(`/admin/trainings/${experienceId}?error=${message(error)}#versions`); }
  revalidatePath(`/admin/trainings/${experienceId}`);
  redirect(`/admin/trainings/${experienceId}?versionCreated=1#versions`);
}
