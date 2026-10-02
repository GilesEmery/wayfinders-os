/** A retreat completion satisfies the same assessment in any course without a new attempt. */
export function sharedAssessmentCompleted(assessmentExperienceId: string, blockId: string, attempts: ReadonlyArray<{ parent_content_block_id: string; assessment_experience_id: string; status: string }>, enrollments: ReadonlyArray<{ experience_id: string; status: string; completed_at: string | null }>) {
  return attempts.some((attempt) => attempt.parent_content_block_id === blockId && attempt.assessment_experience_id === assessmentExperienceId && attempt.status === "completed")
    || enrollments.some((enrollment) => enrollment.experience_id === assessmentExperienceId && enrollment.status === "completed" && Boolean(enrollment.completed_at));
}
