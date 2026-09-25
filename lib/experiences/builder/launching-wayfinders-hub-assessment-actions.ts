"use server";

import { revalidatePath } from "next/cache";
import type { LaunchingHubAnswer } from "./launching-wayfinders-hub-assessment";
import { saveLaunchingWayfindersHubAssessment } from "./launching-wayfinders-hub-assessment-mutations";

export async function saveLaunchingWayfindersHubAssessmentAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, answers: Record<string, LaunchingHubAnswer>) {
  const result = await saveLaunchingWayfindersHubAssessment(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, answers);
  if (result.complete) revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
  return result;
}
