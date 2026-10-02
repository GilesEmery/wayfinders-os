import { revalidatePath } from "next/cache";
import { motivatorDefinitions } from "@/modules/lmu/current-motivator-rankings/curriculum";
import { LMU_SECTION_KEYS } from "@/lib/experiences/lmu/server/constants";
import { motivatorIds } from "@/modules/lmu/current-motivator-rankings/types";
import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { isLMUSectionKey } from "@/lib/experiences/lmu/server/constants";
import { finalizeAssessmentIfComplete } from "@/lib/experiences/lmu/server/completion";
import { resolveAuthenticatedParticipant } from "@/lib/experiences/lmu/server/account";

type Context = { params: Promise<{ sectionKey: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { sectionKey } = await context.params;
    if (!isLMUSectionKey(sectionKey)) return apiError("Unknown LMU section.", 404);
    const resolved = await resolveAuthenticatedParticipant();
    if (!resolved) return apiError("Sign in to finalize this assessment.", 401);
    const body = await readJsonObject(request);
    const responseData = body.responseData;
    const resultData = body.resultData;
    if (responseData !== undefined && (!responseData || typeof responseData !== "object" || Array.isArray(responseData))) return apiError("responseData must be an object.", 400);
    if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return apiError("resultData must be an object.", 400);

    const now = new Date().toISOString();
    const { admin, participant, assessment } = resolved;
    let finalResultData = resultData;
    if (sectionKey === "motivator_rankings") {
      const order = (responseData as Record<string, unknown> | undefined)?.orderedMotivatorIds;
      if (!Array.isArray(order) || order.length !== motivatorIds.length || new Set(order).size !== motivatorIds.length || !motivatorIds.every((id) => order.includes(id))) return apiError("Confirm all eight motivators before saving your response.", 400);
      const sources = await admin.from("lmu_section_progress").select("section_key").eq("assessment_id", assessment.id).eq("status", "completed");
      if (sources.error) return apiError("Unable to verify your modules. Please retry.", 500);
      const completeKeys = new Set((sources.data ?? []).map((item) => item.section_key));
      if (!LMU_SECTION_KEYS.filter((key) => key !== "motivator_rankings").every((key) => completeKeys.has(key))) return apiError("Complete the other modules before saving your final response.", 400);
      const reflection = (responseData as Record<string, unknown>).topPriorityReflection;
      if (reflection !== undefined && (typeof reflection !== "string" || reflection.length > 700)) return apiError("Your reflection must be at most 700 characters.", 400);
      const rankedItems = order.map((id, index) => ({ id, label: motivatorDefinitions.find((item) => item.id === id)!.label, rank: index + 1 }));
      finalResultData = { result: { moduleId: "current-motivator-rankings", completedAt: now, highlights: rankedItems.map((item) => item.label), rankedItems, structuredData: { orderedMotivatorIds: order, topPriorityReflection: reflection ?? "" } }, derivedResults: { orderedMotivatorIds: order, topPriorityReflection: reflection ?? "" } };

    }
    // Persist the draft before creating an immutable completed result.
    const responseWrite = responseData ? await admin.from("lmu_responses").upsert({ assessment_id: assessment.id, section_key: sectionKey, response_data: responseData as Json }, { onConflict: "assessment_id,section_key" }) : { error: null };
    if (responseWrite.error) return apiError("Unable to save your responses. Please retry.", 500);
    const resultWrite = await admin.from("lmu_results").upsert({ assessment_id: assessment.id, section_key: sectionKey, result_data: finalResultData as Json, finalized_at: now }, { onConflict: "assessment_id,section_key", ignoreDuplicates: true });
    if (resultWrite.error) return apiError("Unable to save your completed result. Please retry.", 500);
    const progressInsert = await admin.from("lmu_section_progress").upsert({ assessment_id: assessment.id, section_key: sectionKey, status: "completed", completed_at: now }, { onConflict: "assessment_id,section_key", ignoreDuplicates: true });
    if (progressInsert.error) return apiError("Unable to confirm section completion. Please retry.", 500);
    const progressWrite = await admin.from("lmu_section_progress").update({ status: "completed", completed_at: now }).eq("assessment_id", assessment.id).eq("section_key", sectionKey).neq("status", "completed");
    const assessmentWrite = await admin.from("lmu_assessments").update({ current_module: sectionKey }).eq("id", assessment.id).eq("participant_id", participant.id);
    if (progressWrite.error || assessmentWrite.error) return apiError("Unable to finalize this section. Please retry.", 500);

    const completion = await finalizeAssessmentIfComplete(admin, assessment.id, now);
    if (completion.error) return apiError("Section saved, but assessment completion failed.", 500);
    const assessmentCompleted = completion.completed;
    if (assessmentCompleted) { revalidatePath("/dashboard"); revalidatePath("/my-journey"); revalidatePath("/account"); }
    return NextResponse.json({ ok: true, sectionKey, finalizedAt: now, assessmentCompleted });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to finalize this section.", 500);
  }
}
