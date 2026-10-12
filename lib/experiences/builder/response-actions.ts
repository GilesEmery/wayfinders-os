"use server";

import { revalidatePath } from "next/cache";
import { finalizeParticipantResponse, saveParticipantResponseDraft, ResponseSaveError } from "./response-mutations";

export async function saveResponseDraftAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, form: FormData) {
  await saveParticipantResponseDraft(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, form);
  revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
}

export async function finalizeResponseAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, form: FormData) {
  await finalizeParticipantResponse(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, form);
  revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
}

// Serializable, non-sensitive receipt for the participant form. No success before persistence.
export async function persistResponseAction(mode: "draft" | "final", slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, form: FormData) {
  try {
    if (mode !== "draft" && mode !== "final") return { ok: false, message: "This save is unavailable." };
    await (mode === "final" ? finalizeResponseAction : saveResponseDraftAction)(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, form);
    return { ok: true, message: mode === "final" ? "Response submitted." : "Draft saved." };
  } catch (error) {
    return { ok: false, message: error instanceof ResponseSaveError ? error.message : "Save could not be confirmed. Keep your text and try again; reload if it has already been saved." };
  }
}
