import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LMU_SECTION_KEYS } from "./constants";

export async function finalizeAssessmentIfComplete(
  admin: SupabaseClient<Database>,
  assessmentId: string,
  completedAt: string,
) {
  const { data, error } = await admin
    .from("lmu_section_progress")
    .select("section_key")
    .eq("assessment_id", assessmentId)
    .eq("status", "completed");
  if (error) return { completed: false, error };
  const completedKeys = new Set((data ?? []).map((item) => item.section_key));
  const completed = LMU_SECTION_KEYS.every((key) => completedKeys.has(key));
  if (!completed) return { completed: false, error: null };
  const { error: updateError } = await admin
    .from("lmu_assessments")
    .update({ status: "completed", completed_at: completedAt })
    .eq("id", assessmentId)
    .neq("status", "completed");
  if (!updateError) {
    const attempts = await admin.from("embedded_assessment_attempts").select("id,assessment_enrollment_id").eq("provider_attempt_id", assessmentId).neq("status", "completed");
    if (attempts.error) return { completed: false, error: attempts.error };
    if (attempts.data?.length) {
      const completion = await admin.from("embedded_assessment_attempts").update({ status: "completed", completed_at: completedAt, updated_at: completedAt }).eq("provider_attempt_id", assessmentId);
      if (completion.error) return { completed: false, error: completion.error };
      const enrollments = [...new Set(attempts.data.map((attempt) => attempt.assessment_enrollment_id))];
      const enrollmentCompletion = await admin.from("experience_enrollments").update({ status: "completed", completed_at: completedAt, updated_at: completedAt }).in("id", enrollments);
      if (enrollmentCompletion.error) return { completed: false, error: enrollmentCompletion.error };
    }
  }
  return { completed: !updateError, error: updateError };
}
