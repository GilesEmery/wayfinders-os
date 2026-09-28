import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { embeddedAssessmentReturnPath, validatedEmbeddedReturnPath } from "./prebuilt-assessment";

export async function resolveEmbeddedAssessmentReturnContext({ attemptId, candidateReturnTo, participantId, assessmentEnrollmentId, assessmentExperienceId }: { attemptId?: string; candidateReturnTo?: string; participantId: string; assessmentEnrollmentId: string; assessmentExperienceId: string }) {
  if (!attemptId) return null;
  const db = createAdminSupabaseClient();
  const attempt = await db.from("embedded_assessment_attempts").select("parent_enrollment_id,parent_content_block_id").eq("id", attemptId).eq("participant_id", participantId).eq("assessment_enrollment_id", assessmentEnrollmentId).eq("assessment_experience_id", assessmentExperienceId).maybeSingle();
  if (attempt.error || !attempt.data) return null;
  const [block, parentEnrollment] = await Promise.all([
    db.from("content_blocks").select("section_id").eq("id", attempt.data.parent_content_block_id).eq("block_type", "prebuilt_assessment").maybeSingle(),
    db.from("experience_enrollments").select("experience_id").eq("id", attempt.data.parent_enrollment_id).eq("participant_id", participantId).maybeSingle(),
  ]);
  if (block.error || parentEnrollment.error || !block.data?.section_id || !parentEnrollment.data) return null;
  const section = await db.from("experience_sections").select("section_key,module_id,lesson_id").eq("id", block.data.section_id).maybeSingle();
  if (section.error || !section.data) return null;
  const [moduleResult, lessonResult, experienceResult] = await Promise.all([
    db.from("experience_modules").select("module_key").eq("id", section.data.module_id).maybeSingle(),
    db.from("experience_lessons").select("lesson_key").eq("id", section.data.lesson_id).maybeSingle(),
    db.from("experiences").select("slug").eq("id", parentEnrollment.data.experience_id).maybeSingle(),
  ]);
  if (moduleResult.error || lessonResult.error || experienceResult.error || !moduleResult.data || !lessonResult.data || !experienceResult.data) return null;
  const expected = embeddedAssessmentReturnPath({ slug: experienceResult.data.slug, moduleKey: moduleResult.data.module_key, lessonKey: lessonResult.data.lesson_key, sectionKey: section.data.section_key });
  return validatedEmbeddedReturnPath(candidateReturnTo, expected);
}
