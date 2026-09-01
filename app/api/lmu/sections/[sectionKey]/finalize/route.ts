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
    const [resultWrite, progressWrite, assessmentWrite] = await Promise.all([
      admin.from("lmu_results").upsert({ assessment_id: assessment.id, section_key: sectionKey, result_data: resultData as Json, finalized_at: now }, { onConflict: "assessment_id,section_key" }),
      admin.from("lmu_section_progress").upsert({ assessment_id: assessment.id, section_key: sectionKey, status: "completed", completed_at: now }, { onConflict: "assessment_id,section_key" }),
      admin.from("lmu_assessments").update({ current_module: sectionKey }).eq("id", assessment.id).eq("participant_id", participant.id),
    ]);
    const responseWrite = responseData
      ? await admin.from("lmu_responses").upsert({ assessment_id: assessment.id, section_key: sectionKey, response_data: responseData as Json }, { onConflict: "assessment_id,section_key" })
      : { error: null };
    if (resultWrite.error || progressWrite.error || assessmentWrite.error || responseWrite.error) return apiError("Unable to finalize this section.", 500);

    const completion = await finalizeAssessmentIfComplete(admin, assessment.id, now);
    if (completion.error) return apiError("Section saved, but assessment completion failed.", 500);
    const assessmentCompleted = completion.completed;
    return NextResponse.json({ ok: true, sectionKey, finalizedAt: now, assessmentCompleted });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to finalize this section.", 500);
  }
}
