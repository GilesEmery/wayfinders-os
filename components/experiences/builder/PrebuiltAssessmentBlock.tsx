import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";
import { startPrebuiltAssessmentAction } from "@/lib/experiences/builder/prebuilt-assessment-actions";
import type { PrebuiltAssessmentConfiguration } from "@/lib/experiences/builder/prebuilt-assessment";

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
      const attempt = await db.from("embedded_assessment_attempts").select("status").eq("parent_enrollment_id", course.enrollmentId).eq("parent_content_block_id", blockId).maybeSingle();
      if (attempt.data?.status === "completed") status = "completed";
      else if (attempt.data) status = "in_progress";
    }
  }
  return <article className={`prebuilt-assessment-block is-${status}`}>
    <div><span>PurposeOS Assessment</span><h2>{title}</h2><p>{description}</p></div>
    <strong className="prebuilt-assessment-status">{status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : "Not started"}</strong>
    {preview ? <button type="button" disabled>Preview Assessment</button> : <form action={startPrebuiltAssessmentAction.bind(null, blockId, route)}><button type="submit">{status === "completed" ? "Review Assessment" : status === "in_progress" ? "Continue Assessment" : "Start Assessment"}</button></form>}
  </article>;
}
