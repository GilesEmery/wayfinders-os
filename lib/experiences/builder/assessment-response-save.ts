import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/** Compare-and-swap keeps a late draft save from replacing a completed snapshot. */
export async function persistAssessmentResponse(scope: { participantId: string; enrollmentId: string; versionId: string; definitionId: string }, project: (prior: unknown, now: string, finalizedAt: string | null) => { finished: { completedAt: string } | null }) {
  const db = createAdminSupabaseClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await db.from("participant_responses").select("id,response_data,finalized_at,updated_at").eq("participant_id", scope.participantId).eq("enrollment_id", scope.enrollmentId).eq("experience_version_id", scope.versionId).eq("response_definition_id", scope.definitionId).maybeSingle();
    if (current.error) throw new Error("Unable to load your saved response. Please retry.");
    const now = new Date(Math.max(Date.now(), Date.parse(current.data?.updated_at ?? "") + 1 || 0)).toISOString();
    const projected = project(current.data?.response_data ?? {}, now, current.data?.finalized_at ?? null);
    const payload = { participant_id: scope.participantId, enrollment_id: scope.enrollmentId, experience_version_id: scope.versionId, response_definition_id: scope.definitionId, response_data: projected as unknown as Json, status: projected.finished ? "submitted" : "draft", finalized_at: projected.finished?.completedAt ?? null, updated_at: now };
    const result = current.data
      ? await db.from("participant_responses").update(payload).eq("id", current.data.id).eq("participant_id", scope.participantId).eq("enrollment_id", scope.enrollmentId).eq("updated_at", current.data.updated_at).select("id").maybeSingle()
      : await db.from("participant_responses").insert(payload).select("id").single();
    if (result.error?.code === "23505") continue;
    if (result.error) throw new Error("Unable to save your response. Your answers remain here; please retry.");
    if (result.data) return { updatedAt: now, completedAt: projected.finished?.completedAt ?? null };
  }
  throw new Error("Your response changed while saving. Please retry Save my response.");
}

export async function confirmAssessmentCompletion(participantId: string, enrollmentId: string, versionId: string) {
  const result = await createAdminSupabaseClient().from("experience_enrollments").select("status,completed_at").eq("id", enrollmentId).eq("participant_id", participantId).eq("experience_version_id", versionId).maybeSingle();
  if (result.error || result.data?.status !== "completed" || !result.data.completed_at) throw new Error("Your response was saved, but completion could not be confirmed. Please retry Save my response.");
  return result.data.completed_at;
}
