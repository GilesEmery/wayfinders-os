import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { LMU_SESSION_COOKIE } from "@/lib/experiences/lmu/server/constants";
import { hashSessionToken, newSessionToken, resolveParticipantSession, sessionCookieOptions, sessionExpiresAt } from "@/lib/experiences/lmu/server/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const emailNormalized = email.toLowerCase();
    if (!firstName || firstName.length > 80) return apiError("Enter a valid first name.", 400);
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) return apiError("Enter a valid email address.", 400);

    const admin = createAdminSupabaseClient();
    const { data: participant, error: participantError } = await admin
      .from("participants")
      .insert({ first_name: firstName, email, email_normalized: emailNormalized })
      .select("id, first_name, email, created_at, updated_at")
      .single();
    if (participantError) return apiError("Unable to start a participant session.", 500);

    const { data: assessment, error: assessmentError } = await admin
      .from("lmu_assessments")
      .insert({ participant_id: participant.id, experience_type: "original" })
      .select("id, experience_type, status, assessment_version, current_module, started_at, completed_at, updated_at")
      .single();
    if (assessmentError) {
      await admin.from("participants").delete().eq("id", participant.id);
      return apiError("Unable to start an assessment.", 500);
    }

    const token = newSessionToken();
    const expires = sessionExpiresAt();
    const { error: sessionError } = await admin.from("participant_sessions").insert({
      participant_id: participant.id,
      assessment_id: assessment.id,
      token_hash: hashSessionToken(token),
      expires_at: expires.toISOString(),
    });
    if (sessionError) {
      await admin.from("participants").delete().eq("id", participant.id);
      return apiError("Unable to create a secure session.", 500);
    }

    const response = NextResponse.json({ participant, assessment }, { status: 201 });
    response.cookies.set(LMU_SESSION_COOKIE, token, sessionCookieOptions(expires));
    return response;
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to start a participant session.", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveParticipantSession(request);
    if (!resolved) return apiError("No valid participant session.", 401);
    const { admin, session } = resolved;
    const [{ data: participant }, { data: assessment }] = await Promise.all([
      admin.from("participants").select("id, first_name, email, created_at, updated_at").eq("id", session.participant_id).single(),
      admin.from("lmu_assessments").select("id, experience_type, status, assessment_version, current_module, started_at, completed_at, updated_at").eq("id", session.assessment_id).single(),
    ]);
    if (!participant || !assessment) return apiError("Participant session is unavailable.", 401);
    return NextResponse.json({ participant, assessment });
  } catch {
    return apiError("Unable to load the participant session.", 500);
  }
}
