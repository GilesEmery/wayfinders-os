"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeParticipantSection, completeParticipantSectionForForwardNavigation, recordParticipantSectionVisit } from "./progress-mutations";
import { appendParticipantQuery, participantSectionHref } from "./participant-runtime";

export async function recordSectionVisitAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, cohortId?: string | null) {
  const result = await recordParticipantSectionVisit(slug, moduleKey, lessonKey, sectionKey, cohortId);
  if (result.ok) revalidatePath(participantSectionHref(slug, moduleKey, lessonKey, sectionKey, cohortId));
  return result;
}

export async function markSectionCompleteAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, cohortId?: string | null) {
  const result = await completeParticipantSection(slug, moduleKey, lessonKey, sectionKey, cohortId);
  if (result.ok) revalidatePath(participantSectionHref(slug, moduleKey, lessonKey, sectionKey, cohortId));
}

export async function navigateForwardAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, targetModuleKey: string, targetLessonKey: string, targetSectionKey: string, cohortId?: string | null) {
  const currentHref = participantSectionHref(slug, moduleKey, lessonKey, sectionKey, cohortId);
  const targetHref = participantSectionHref(slug, targetModuleKey, targetLessonKey, targetSectionKey, cohortId);
  const result = await completeParticipantSectionForForwardNavigation(slug, moduleKey, lessonKey, sectionKey, { moduleKey: targetModuleKey, lessonKey: targetLessonKey, sectionKey: targetSectionKey }, cohortId);
  revalidatePath(currentHref);
  if (result.ok) {
    revalidatePath(targetHref);
    redirect(targetHref);
  }
  redirect(appendParticipantQuery(currentHref, "progressError", result.reason));
}

export async function finishCourseAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, cohortId?: string | null) {
  const currentHref = participantSectionHref(slug, moduleKey, lessonKey, sectionKey, cohortId);
  const result = await completeParticipantSectionForForwardNavigation(slug, moduleKey, lessonKey, sectionKey, undefined, cohortId);
  revalidatePath(currentHref);
  redirect(result.ok ? currentHref : appendParticipantQuery(currentHref, "progressError", result.reason));
}
