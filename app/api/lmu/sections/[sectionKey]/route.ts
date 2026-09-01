import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { isLMUSectionKey } from "@/lib/experiences/lmu/server/constants";
import { resolveAuthenticatedParticipant } from "@/lib/experiences/lmu/server/account";

type Context = { params: Promise<{ sectionKey: string }> };

function progressStatus(value: unknown) {
  return value === "completed" ? "completed" : value === "not_started" ? "not_started" : "in_progress";
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { sectionKey } = await context.params;
    if (!isLMUSectionKey(sectionKey)) return apiError("Unknown LMU section.", 404);
    const resolved = await resolveAuthenticatedParticipant();
    if (!resolved) return apiError("Sign in to save this assessment.", 401);
    const body = await readJsonObject(request);
    const responseData = body.responseData;
    const progress = body.progress;
    if (!responseData || typeof responseData !== "object" || Array.isArray(responseData)) return apiError("responseData must be an object.", 400);
    if (!progress || typeof progress !== "object" || Array.isArray(progress)) return apiError("progress must be an object.", 400);

    const progressObject = progress as Record<string, unknown>;
    const status = progressStatus(progressObject.status);
    const now = new Date().toISOString();
    const { admin, participant, assessment } = resolved;
    const [responseQuery, progressQuery, assessmentQuery] = await Promise.all([
      admin.from("lmu_responses").upsert({ assessment_id: assessment.id, section_key: sectionKey, response_data: responseData as Json }, { onConflict: "assessment_id,section_key" }),
      admin.from("lmu_section_progress").upsert({
        assessment_id: assessment.id,
        section_key: sectionKey,
        status,
        current_step: typeof progressObject.currentStep === "string" ? progressObject.currentStep.slice(0, 120) : null,
        started_at: typeof progressObject.startedAt === "string" ? progressObject.startedAt : now,
        completed_at: status === "completed" ? (typeof progressObject.completedAt === "string" ? progressObject.completedAt : now) : null,
      }, { onConflict: "assessment_id,section_key" }),
      admin.from("lmu_assessments").update({ current_module: sectionKey }).eq("id", assessment.id).eq("participant_id", participant.id),
    ]);
    if (responseQuery.error || progressQuery.error || assessmentQuery.error) return apiError("Unable to save this section.", 500);
    return NextResponse.json({ ok: true, sectionKey, updatedAt: now });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to save this section.", 500);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { sectionKey } = await context.params;
    if (!isLMUSectionKey(sectionKey)) return apiError("Unknown LMU section.", 404);
    const resolved = await resolveAuthenticatedParticipant();
    if (!resolved) return apiError("Sign in to reset this assessment.", 401);
    const { admin, assessment } = resolved;
    const [responseQuery, progressQuery, resultQuery] = await Promise.all([
      admin.from("lmu_responses").delete().eq("assessment_id", assessment.id).eq("section_key", sectionKey),
      admin.from("lmu_section_progress").delete().eq("assessment_id", assessment.id).eq("section_key", sectionKey),
      admin.from("lmu_results").delete().eq("assessment_id", assessment.id).eq("section_key", sectionKey),
    ]);
    if (responseQuery.error || progressQuery.error || resultQuery.error) return apiError("Unable to reset this section.", 500);
    return NextResponse.json({ ok: true, sectionKey });
  } catch {
    return apiError("Unable to reset this section.", 500);
  }
}
