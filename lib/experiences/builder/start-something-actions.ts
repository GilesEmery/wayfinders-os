"use server";

import { revalidatePath } from "next/cache";
import { saveStartSomething } from "./start-something-mutations";

export async function saveStartSomethingDraftAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown) {
  return saveStartSomething(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, false);
}

export async function finishStartSomethingAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown) {
  const result = await saveStartSomething(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, true);
  revalidatePath("/dashboard");
  revalidatePath("/my-journey");
  revalidatePath("/experiences", "layout");
  revalidatePath("/account");
  return result;
}
