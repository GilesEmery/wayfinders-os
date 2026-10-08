"use server";

import { revalidatePath } from "next/cache";
import { saveCircleOfInfluence } from "./circle-of-influence-mutations";

export async function saveCircleOfInfluenceDraftAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown) {
  return saveCircleOfInfluence(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, false);
}

export async function finishCircleOfInfluenceAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, retakeCompletedAt?: string) {
  const result = await saveCircleOfInfluence(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, true, retakeCompletedAt);
  revalidatePath("/dashboard");
  revalidatePath("/my-journey");
  revalidatePath("/experiences", "layout");
  revalidatePath("/account");
  return result;
}
