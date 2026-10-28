"use server";

import { revalidatePath } from "next/cache";
import { saveEmotionalHealthAssessment } from "./emotional-health-mutations";

export async function saveEmotionalHealthAssessmentAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, finalize = false, retakeCompletedAt?: string) {
  const result = await saveEmotionalHealthAssessment(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, finalize, retakeCompletedAt);
  if (result.complete) { revalidatePath("/dashboard"); revalidatePath("/my-journey"); revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`); }
  return result;
}
