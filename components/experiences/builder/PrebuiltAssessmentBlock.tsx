import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";
import type { PrebuiltAssessmentConfiguration } from "@/lib/experiences/builder/prebuilt-assessment";
import { AssessmentLaunchCard, assessmentLaunchLabel } from "./AssessmentLaunchCard";
import { EmbeddedAssessmentLauncher } from "./EmbeddedAssessmentLauncher";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null };

export async function PrebuiltAssessmentBlock({ blockId, configuration, route, preview }: { blockId: string; configuration: PrebuiltAssessmentConfiguration; route: Route; preview: boolean }) {
  const db = createAdminSupabaseClient();
  const assessment = await db.from("experiences").select("name,description").eq("id", configuration.assessmentExperienceId).eq("experience_type", "assessment").maybeSingle();
  const title = configuration.title || assessment.data?.name || "Prebuilt Assessment";
  const description = configuration.description || assessment.data?.description || "Complete this Assessment to continue your learning journey.";
  let status: "not_started" | "in_progress" | "completed" = "not_started";
  if (!preview) {
    const course = await resolveParticipantCourse(route.slug, route.cohortId ?? null);
    if (course.status === "ready" && course.enrollmentId) {
      const [attempt, canonicalEnrollment] = await Promise.all([
        db.from("embedded_assessment_attempts").select("status").eq("parent_enrollment_id", course.enrollmentId).eq("parent_content_block_id", blockId).maybeSingle(),
        db.from("experience_enrollments").select("status").eq("participant_id", course.participantId).eq("experience_id", configuration.assessmentExperienceId).maybeSingle(),
      ]);
      if (attempt.data?.status === "completed" || canonicalEnrollment.data?.status === "completed") status = "completed";
      else if (attempt.data || canonicalEnrollment.data?.status === "in_progress") status = "in_progress";
    }
  }
  const action = preview ? <button type="button" disabled>Preview Assessment</button> : <EmbeddedAssessmentLauncher blockId={blockId} route={route} label={assessmentLaunchLabel(status)}/>;
  return <AssessmentLaunchCard title={title} description={description} status={status} action={action}/>;
}
