"use server";

import { revalidatePath } from "next/cache";
import { savePersonalImpactStatement } from "./personal-impact-statement-mutations";

export async function savePersonalImpactStatementAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown) {
  const result = await savePersonalImpactStatement(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input);
  revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
  return result;
}

export async function finishPersonalImpactStatementAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, retakeCompletedAt?: string) {
  const result = await savePersonalImpactStatement(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, true, retakeCompletedAt);
  revalidatePath("/dashboard");
  revalidatePath("/my-journey");
  revalidatePath("/experiences", "layout");
  revalidatePath("/account");
  return result;
}
