"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeParticipantSection, completeParticipantSectionForForwardNavigation, recordParticipantSectionVisit } from "./progress-mutations";
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

export async function navigateForwardAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, targetModuleKey: string, targetLessonKey: string, targetSectionKey: string) {
  const currentHref = participantSectionHref(slug, moduleKey, lessonKey, sectionKey);
  const targetHref = participantSectionHref(slug, targetModuleKey, targetLessonKey, targetSectionKey);
  const result = await completeParticipantSectionForForwardNavigation(slug, moduleKey, lessonKey, sectionKey, { moduleKey: targetModuleKey, lessonKey: targetLessonKey, sectionKey: targetSectionKey });
  revalidatePath(currentHref);
  if (result.ok) {
    revalidatePath(targetHref);
    redirect(targetHref);
  }
  redirect(`${currentHref}?progressError=${encodeURIComponent(result.reason)}`);
}

export async function finishCourseAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  const currentHref = participantSectionHref(slug, moduleKey, lessonKey, sectionKey);
  const result = await completeParticipantSectionForForwardNavigation(slug, moduleKey, lessonKey, sectionKey);
  revalidatePath(currentHref);
  redirect(result.ok ? currentHref : `${currentHref}?progressError=${encodeURIComponent(result.reason)}`);
}
