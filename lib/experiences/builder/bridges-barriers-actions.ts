"use server";
import { revalidatePath } from "next/cache";
import { saveBridgesBarriers } from "./bridges-barriers-mutations";
export async function saveBridgesBarriersAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown) {
    const result = await saveBridgesBarriers(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input);
    revalidatePath(`/experiences/${slug}/course/${moduleKey}/${lessonKey}/${sectionKey}`);
    return result;
}
export async function finishBridgesBarriersAction(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, blockKey: string, cohortId: string | null | undefined, input: unknown, retakeCompletedAt?: string) {
    const result = await saveBridgesBarriers(slug, moduleKey, lessonKey, sectionKey, blockKey, cohortId, input, true, retakeCompletedAt);
    revalidatePath("/dashboard");
    revalidatePath("/my-journey");
    revalidatePath("/experiences", "layout");
    revalidatePath("/account");
    return result;
}
