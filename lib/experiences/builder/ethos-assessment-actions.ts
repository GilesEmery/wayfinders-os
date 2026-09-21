"use server";

import { revalidatePath } from "next/cache";
import { saveEthosAssessment } from "./ethos-assessment-mutations";

export async function saveEthosAssessmentAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, answers: Record<string, number>) {
  const result = await saveEthosAssessment(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, answers);
  if (result.complete) revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
  return result;
}
