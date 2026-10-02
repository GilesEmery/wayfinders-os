"use server";
import { revalidatePath } from "next/cache";
import { resolveAuthenticatedParticipant } from "./server/account";
import { resolveEmbeddedAssessmentReturnContext } from "@/lib/experiences/builder/embedded-assessment-context";

export async function confirmedLmuReturnAction(attemptId?: string, candidateReturnTo?: string) {
  const context = await resolveAuthenticatedParticipant();
  if (!context || context.assessment.status !== "completed" || !context.assessment.completed_at) throw new Error("Completion could not be confirmed. Please retry.");
  let destination = "/dashboard";
  if (attemptId) {
    const attempt = await context.admin.from("embedded_assessment_attempts").select("assessment_enrollment_id,assessment_experience_id,status").eq("id", attemptId).eq("participant_id", context.participant.id).eq("provider_attempt_id", context.assessment.id).maybeSingle();
    if (attempt.error || !attempt.data || attempt.data.status !== "completed") throw new Error("Course completion could not be confirmed. Please retry.");
    const enrollment = await context.admin.from("experience_enrollments").select("status,completed_at").eq("id", attempt.data.assessment_enrollment_id).eq("participant_id", context.participant.id).maybeSingle();
    if (enrollment.error || enrollment.data?.status !== "completed" || !enrollment.data.completed_at) throw new Error("Assessment enrollment completion could not be confirmed. Please retry.");
    destination = await resolveEmbeddedAssessmentReturnContext({ attemptId, candidateReturnTo, participantId: context.participant.id, assessmentEnrollmentId: attempt.data.assessment_enrollment_id, assessmentExperienceId: attempt.data.assessment_experience_id }) ?? "/dashboard";
  }
  revalidatePath("/dashboard"); revalidatePath("/my-journey"); revalidatePath("/account"); revalidatePath("/experiences", "layout");
  return { destination, completedAt: context.assessment.completed_at };
}
