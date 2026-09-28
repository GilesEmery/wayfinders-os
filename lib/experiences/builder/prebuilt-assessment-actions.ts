"use server";

import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { embeddedAssessmentLaunchPath, embeddedAssessmentReturnPath } from "./prebuilt-assessment";
import { resolveParticipantCourse } from "./participant-runtime";

export async function startPrebuiltAssessmentAction(blockId: string, route: { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null }) {
  const course = await resolveParticipantCourse(route.slug, route.cohortId ?? null);
  if (course.status !== "ready" || !course.enrollmentId) throw new Error("An active Course enrollment is required to start this Assessment.");
  const db = createAdminSupabaseClient();
  const result = await db.rpc("begin_embedded_assessment", {
    p_parent_enrollment_id: course.enrollmentId,
    p_parent_content_block_id: blockId,
    p_participant_id: course.participantId,
  });
  if (result.error || !result.data?.[0]) throw new Error(result.error?.message ?? "Unable to start this Assessment.");
  const attempt = result.data[0];
  redirect(embeddedAssessmentLaunchPath(attempt.launch_path, attempt.attempt_id, embeddedAssessmentReturnPath(route)));
}
