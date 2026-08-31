import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { isLMUSectionKey, LMU_SECTION_KEYS } from "@/lib/experiences/lmu/server/constants";
import { resolveParticipantSession } from "@/lib/experiences/lmu/server/session";

type Context = { params: Promise<{ sectionKey: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { sectionKey } = await context.params;
    if (!isLMUSectionKey(sectionKey)) return apiError("Unknown LMU section.", 404);
    const resolved = await resolveParticipantSession(request);
    if (!resolved) return apiError("No valid participant session.", 401);
    const body = await readJsonObject(request);
    const responseData = body.responseData;
    const resultData = body.resultData;
    if (responseData !== undefined && (!responseData || typeof responseData !== "object" || Array.isArray(responseData))) return apiError("responseData must be an object.", 400);
    if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return apiError("resultData must be an object.", 400);

    const now = new Date().toISOString();
    const { admin, session } = resolved;
    const [resultWrite, progressWrite, assessmentWrite] = await Promise.all([
      admin.from("lmu_results").upsert({ assessment_id: session.assessment_id, section_key: sectionKey, result_data: resultData as Json, finalized_at: now }, { onConflict: "assessment_id,section_key" }),
      admin.from("lmu_section_progress").upsert({ assessment_id: session.assessment_id, section_key: sectionKey, status: "completed", completed_at: now }, { onConflict: "assessment_id,section_key" }),
      admin.from("lmu_assessments").update({ current_module: sectionKey }).eq("id", session.assessment_id),
    ]);
    const responseWrite = responseData
      ? await admin.from("lmu_responses").upsert({ assessment_id: session.assessment_id, section_key: sectionKey, response_data: responseData as Json }, { onConflict: "assessment_id,section_key" })
      : { error: null };
    if (resultWrite.error || progressWrite.error || assessmentWrite.error || responseWrite.error) return apiError("Unable to finalize this section.", 500);

    let assessmentCompleted = false;
    if (sectionKey === "motivator_rankings") {
      const { data: completed, error } = await admin.from("lmu_section_progress").select("section_key").eq("assessment_id", session.assessment_id).eq("status", "completed");
      const completedKeys = new Set((completed ?? []).map((item) => item.section_key));
      assessmentCompleted = !error && LMU_SECTION_KEYS.every((key) => completedKeys.has(key));
      if (assessmentCompleted) {
        const { error: completionError } = await admin.from("lmu_assessments").update({ status: "completed", completed_at: now }).eq("id", session.assessment_id);
        if (completionError) return apiError("Section saved, but assessment completion failed.", 500);
      }
    }
    return NextResponse.json({ ok: true, sectionKey, finalizedAt: now, assessmentCompleted });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to finalize this section.", 500);
  }
}
