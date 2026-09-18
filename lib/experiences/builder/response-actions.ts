"use server";

import { revalidatePath } from "next/cache";
import { finalizeParticipantResponse, saveParticipantResponseDraft } from "./response-mutations";

export async function saveResponseDraftAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, form: FormData) {
  await saveParticipantResponseDraft(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, form);
  revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
}

export async function finalizeResponseAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, form: FormData) {
  await finalizeParticipantResponse(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, form);
  revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
}
