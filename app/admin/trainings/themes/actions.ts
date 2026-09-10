"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignVersionTheme, createTheme, createThemeRevision, setThemeStatus, updateDraftTheme } from "@/lib/experiences/admin/theme-mutations";

function message(error: unknown) { return encodeURIComponent(error instanceof Error ? error.message : "The request could not be completed."); }

export async function createThemeAction(form: FormData) {
  let id: string;
  try { id = await createTheme(form); } catch (error) { redirect(`/admin/trainings/themes/new?error=${message(error)}`); }
  revalidatePath("/admin/trainings/themes"); redirect(`/admin/trainings/themes/${id}?created=1`);
}

export async function updateThemeAction(themeId: string, form: FormData) {
  try { await updateDraftTheme(themeId, form); } catch (error) { redirect(`/admin/trainings/themes/${themeId}?error=${message(error)}`); }
  revalidatePath(`/admin/trainings/themes/${themeId}`); redirect(`/admin/trainings/themes/${themeId}?updated=1`);
}

export async function createThemeRevisionAction(themeId: string) {
  let id: string;
  try { id = await createThemeRevision(themeId); } catch (error) { redirect(`/admin/trainings/themes/${themeId}?error=${message(error)}`); }
  revalidatePath("/admin/trainings/themes"); redirect(`/admin/trainings/themes/${id}?createdRevision=1`);
}

export async function setThemeStatusAction(themeId: string, form: FormData) {
  try { await setThemeStatus(themeId, String(form.get("status") ?? "")); } catch (error) { redirect(`/admin/trainings/themes/${themeId}?error=${message(error)}`); }
  revalidatePath("/admin/trainings/themes"); revalidatePath(`/admin/trainings/themes/${themeId}`); redirect(`/admin/trainings/themes/${themeId}?statusUpdated=1`);
}

export async function assignVersionThemeAction(experienceId: string, versionId: string, form: FormData) {
  try { await assignVersionTheme(experienceId, versionId, String(form.get("theme_id") ?? "") || null); } catch (error) { redirect(`/admin/trainings/${experienceId}?error=${message(error)}#versions`); }
  revalidatePath(`/admin/trainings/${experienceId}`); redirect(`/admin/trainings/${experienceId}?themeUpdated=1#versions`);
}
