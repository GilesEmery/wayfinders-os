"use server";

import { revalidatePath } from "next/cache";
import { saveFiveVoicesAssessment } from "./five-voices-mutations";

export async function saveFiveVoicesAssessmentAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, finalize = false, retakeCompletedAt?: string) {
  const result = await saveFiveVoicesAssessment(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, finalize, retakeCompletedAt);
  if (result.complete) { revalidatePath("/dashboard"); revalidatePath("/my-journey"); revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`); }
  return result;
}
