"use server";

import { revalidatePath } from "next/cache";
import { saveActivatePurposeAssessment } from "./activate-purpose-assessment-mutations";
import type { ActivatePurposeAnswer } from "./activate-purpose-assessment";

export async function saveActivatePurposeAssessmentAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, answers: Record<string, ActivatePurposeAnswer>) {
  const result = await saveActivatePurposeAssessment(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, answers);
  if (result.complete) revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
  return result;
}
