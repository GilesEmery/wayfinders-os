"use server";

import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { embeddedAssessmentLaunchPath, embeddedAssessmentReturnPath, parsePrebuiltAssessmentConfiguration } from "./prebuilt-assessment";
import { needsExperiencePassword } from "@/lib/experiences/access/server";
import { passwordGatePath } from "@/lib/experiences/access/security";
import { resolveParticipantCourse } from "./participant-runtime";

export async function startPrebuiltAssessmentAction(blockId: string, route: { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null }) {
  redirect(await preparePrebuiltAssessmentAction(blockId, route));
}

export async function preparePrebuiltAssessmentAction(blockId: string, route: { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null }) {
  const course = await resolveParticipantCourse(route.slug, route.cohortId ?? null);
  if (course.status !== "ready" || !course.enrollmentId) throw new Error("An active Course enrollment is required to start this Assessment.");
  const db = createAdminSupabaseClient();
  const section = course.structure.modules.find((item) => item.module_key === route.moduleKey)?.lessons.find((item) => item.lesson_key === route.lessonKey)?.sections.find((item) => item.section_key === route.sectionKey);
  const block = section?.layout?.columns.flatMap((column) => column.blocks).find((item) => item.id === blockId && item.block_type === "prebuilt_assessment" && item.visibility === "visible" && item.status === "active");
  const configuration = parsePrebuiltAssessmentConfiguration(block?.configuration);
  if (!configuration.ok) throw new Error("This Assessment block is unavailable.");
  const target = await db.from("experiences").select("id,slug").eq("id", configuration.value.assessmentExperienceId).eq("experience_type", "assessment").eq("status", "active").maybeSingle();
  if (target.error || !target.data) throw new Error("This Assessment is unavailable.");
  if (await needsExperiencePassword(target.data.id)) return passwordGatePath(target.data.slug, embeddedAssessmentReturnPath(route), blockId);
  const result = await db.rpc("begin_embedded_assessment", {
    p_parent_enrollment_id: course.enrollmentId,
    p_parent_content_block_id: blockId,
    p_participant_id: course.participantId,
  });
  if (result.error || !result.data?.[0]) throw new Error(result.error?.message ?? "Unable to start this Assessment.");
  const attempt = result.data[0];
  return embeddedAssessmentLaunchPath(attempt.launch_path, attempt.attempt_id, embeddedAssessmentReturnPath(route));
}
