"use server";
import { revalidatePath } from "next/cache";
import { saveMicrochurch } from "./microchurch-mutations";
export async function saveMicrochurchAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown) {
    const result = await saveMicrochurch(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input);
    revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
    return result;
}
export async function finishMicrochurchAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, retakeCompletedAt?: string) {
    const result = await saveMicrochurch(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, true, retakeCompletedAt);
    revalidatePath("/dashboard");
    revalidatePath("/my-journey");
    revalidatePath("/experiences", "layout");
    revalidatePath("/account");
    return result;
}
