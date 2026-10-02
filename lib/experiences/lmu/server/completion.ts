import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LMU_SECTION_KEYS } from "./constants";

export async function finalizeAssessmentIfComplete(admin: SupabaseClient<Database>, assessmentId: string, completedAt: string) {
  const progress = await admin.from("lmu_section_progress").select("section_key").eq("assessment_id", assessmentId).eq("status", "completed");
  if (progress.error) return { completed: false, error: progress.error };
  if (!LMU_SECTION_KEYS.every((key) => new Set((progress.data ?? []).map((item) => item.section_key)).has(key))) return { completed: false, error: null };
  const owner = await admin.from("lmu_assessments").select("participant_id").eq("id", assessmentId).single();
  if (owner.error) return { completed: false, error: owner.error };
  const update = await admin.from("lmu_assessments").update({ status: "completed", completed_at: completedAt }).eq("id", assessmentId).eq("participant_id", owner.data.participant_id).neq("status", "completed");
  if (update.error) return { completed: false, error: update.error };
  const confirmed = await admin.from("lmu_assessments").select("status,completed_at").eq("id", assessmentId).eq("participant_id", owner.data.participant_id).single();
  if (confirmed.error || confirmed.data.status !== "completed" || !confirmed.data.completed_at) return { completed: false, error: confirmed.error ?? new Error("Completion could not be confirmed.") };
  const date = confirmed.data.completed_at;
  // Include completed attempts on retry: a prior enrollment write may have failed.
  const attempts = await admin.from("embedded_assessment_attempts").select("id,assessment_enrollment_id").eq("provider_attempt_id", assessmentId).eq("participant_id", owner.data.participant_id);
  if (attempts.error) return { completed: false, error: attempts.error };
  const enrollmentIds = [...new Set((attempts.data ?? []).map((attempt) => attempt.assessment_enrollment_id))];
  if (enrollmentIds.length) {
    const enrollments = await admin.from("experience_enrollments").update({ status: "completed", completed_at: date, updated_at: date }).in("id", enrollmentIds).eq("participant_id", owner.data.participant_id).neq("status", "completed");
    if (enrollments.error) return { completed: false, error: enrollments.error };
    const rows = await admin.from("experience_enrollments").select("id,status,completed_at").in("id", enrollmentIds).eq("participant_id", owner.data.participant_id);
    if (rows.error || rows.data?.length !== enrollmentIds.length || rows.data.some((row) => row.status !== "completed" || !row.completed_at)) return { completed: false, error: rows.error ?? new Error("Enrollment completion could not be confirmed.") };
    const completion = await admin.from("embedded_assessment_attempts").update({ status: "completed", completed_at: date, updated_at: date }).eq("provider_attempt_id", assessmentId).eq("participant_id", owner.data.participant_id).neq("status", "completed");
    if (completion.error) return { completed: false, error: completion.error };
  }
  return { completed: true, error: null };
}
