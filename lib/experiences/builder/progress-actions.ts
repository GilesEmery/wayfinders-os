"use server";

import { revalidatePath } from "next/cache";
import { completeParticipantSection, recordParticipantSectionVisit } from "./progress-mutations";
import { participantSectionHref } from "./participant-runtime";

export async function recordSectionVisitAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  const result = await recordParticipantSectionVisit(slug, moduleKey, lessonKey, sectionKey);
  if (result.ok) revalidatePath(participantSectionHref(slug, moduleKey, lessonKey, sectionKey));
  return result;
}

export async function markSectionCompleteAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  const result = await completeParticipantSection(slug, moduleKey, lessonKey, sectionKey);
  if (result.ok) revalidatePath(participantSectionHref(slug, moduleKey, lessonKey, sectionKey));
}
