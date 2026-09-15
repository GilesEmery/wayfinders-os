"use server";

import { revalidatePath } from "next/cache";
import { finalizeParticipantResponse, saveParticipantResponseDraft } from "./response-mutations";

export async function saveResponseDraftAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, form: FormData) {
  await saveParticipantResponseDraft(slug, moduleKey, lessonKey, sectionKey, blockKey, form);
  revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
}

export async function finalizeResponseAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, form: FormData) {
  await finalizeParticipantResponse(slug, moduleKey, lessonKey, sectionKey, blockKey, form);
  revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
}
