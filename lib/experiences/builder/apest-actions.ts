"use server";

import { revalidatePath } from "next/cache";
import { saveApestAssessment } from "./apest-mutations";

export async function saveApestAssessmentAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, finalize = false, retakeCompletedAt?: string) {
  const result = await saveApestAssessment(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, finalize, retakeCompletedAt);
  if (result.complete) { revalidatePath("/dashboard"); revalidatePath("/my-journey"); revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`); }
  return result;
}
