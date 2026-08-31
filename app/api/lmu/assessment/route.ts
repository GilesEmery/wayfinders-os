import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/experiences/lmu/server/http";
import { resolveParticipantSession } from "@/lib/experiences/lmu/server/session";

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveParticipantSession(request);
    if (!resolved) return apiError("No valid participant session.", 401);
    const { admin, session } = resolved;
    const [participantQuery, assessmentQuery, progressQuery, responsesQuery, resultsQuery] = await Promise.all([
      admin.from("participants").select("id, first_name, email, created_at, updated_at").eq("id", session.participant_id).single(),
      admin.from("lmu_assessments").select("id, experience_type, status, assessment_version, current_module, started_at, completed_at, updated_at").eq("id", session.assessment_id).single(),
      admin.from("lmu_section_progress").select("section_key, status, current_step, started_at, completed_at, updated_at").eq("assessment_id", session.assessment_id),
      admin.from("lmu_responses").select("section_key, response_data, schema_version, updated_at").eq("assessment_id", session.assessment_id),
      admin.from("lmu_results").select("section_key, result_data, schema_version, finalized_at, updated_at").eq("assessment_id", session.assessment_id),
    ]);
    if (participantQuery.error || assessmentQuery.error || progressQuery.error || responsesQuery.error || resultsQuery.error) {
      return apiError("Unable to load the assessment.", 500);
    }
    return NextResponse.json({
      participant: participantQuery.data,
      assessment: assessmentQuery.data,
      sectionProgress: progressQuery.data,
      sectionResponses: responsesQuery.data,
      finalizedResults: resultsQuery.data,
    });
  } catch {
    return apiError("Unable to load the assessment.", 500);
  }
}
