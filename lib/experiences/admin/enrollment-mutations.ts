import "server-only";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { canAdminExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ACTIVE = ["invited", "enrolled", "in_progress"];

export async function enrollParticipantInVersion(experienceId: string, versionId: string, participantId: string) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canAdminExperienceById(authorization, experienceId)) throw new Error("You are not authorized to enroll participants in this Experience.");
  const db = createAdminSupabaseClient();
  const [experience, version, participant, existing] = await Promise.all([
    db.from("experiences").select("current_published_version_id").eq("id", experienceId).maybeSingle(),
    db.from("experience_versions").select("id,status,experience_id").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(),
    db.from("participants").select("id").eq("id", participantId).maybeSingle(),
    db.from("experience_enrollments").select("id,status,experience_version_id").eq("participant_id", participantId).eq("experience_id", experienceId).maybeSingle(),
  ]);
  if (experience.error || !experience.data || version.error || !version.data || version.data.status !== "published") throw new Error("Select a Published Version belonging to this Experience.");
  if (participant.error || !participant.data) throw new Error("Participant not found.");
  if (existing.error) throw new Error(`Unable to verify existing enrollment: ${existing.error.message}`);
  const duplicate = existing.data?.experience_version_id === versionId ? existing.data : null;
  if (duplicate && ACTIVE.includes(duplicate.status)) return { id: duplicate.id, reused: true };
  if (existing.data && !duplicate) throw new Error("This participant's canonical Course journey uses another Version and must be reconciled before enrollment.");
  const versionPolicy = experience.data.current_published_version_id === versionId ? "follow_current" : "locked";
  if (duplicate) {
    const reactivated = await db.from("experience_enrollments").update({ status: "enrolled", version_policy: versionPolicy, updated_at: new Date().toISOString() }).eq("id", duplicate.id);
    if (reactivated.error) throw new Error(`Unable to reactivate enrollment: ${reactivated.error.message}`);
    await audit(admin, "participant.enrollment_reactivated", "experience_enrollment", duplicate.id, { experienceId, versionId, participantId, versionPolicy });
    return { id: duplicate.id, reused: true };
  }
  const created = await db.from("experience_enrollments").insert({ participant_id: participantId, experience_id: experienceId, experience_version_id: versionId, version_policy: versionPolicy, status: "enrolled", source_type: "admin", source_id: admin.id }).select("id").single();
  if (created.error) throw new Error(`Unable to enroll participant: ${created.error.message}`);
  await audit(admin, "participant.enrolled", "experience_enrollment", created.data.id, { experienceId, versionId, participantId, versionPolicy });
  return { id: created.data.id, reused: false };
}

export async function withdrawParticipantEnrollment(experienceId: string, versionId: string, enrollmentId: string) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canAdminExperienceById(authorization, experienceId)) throw new Error("You are not authorized to remove learners from this Experience.");
  const db = createAdminSupabaseClient();
  const enrollment = await db.from("experience_enrollments").select("id,participant_id,status").eq("id", enrollmentId).eq("experience_id", experienceId).eq("experience_version_id", versionId).maybeSingle();
  if (enrollment.error) throw new Error(`Unable to verify the enrollment: ${enrollment.error.message}`);
  if (!enrollment.data) throw new Error("Enrollment not found for this Course Version.");
  if (enrollment.data.status === "withdrawn") return;
  const withdrawnAt = new Date().toISOString();
  const withdrawn = await db.from("experience_enrollments").update({ status: "withdrawn", updated_at: withdrawnAt }).eq("id", enrollment.data.id).eq("experience_id", experienceId).eq("experience_version_id", versionId).select("id").maybeSingle();
  if (withdrawn.error || !withdrawn.data) throw new Error(`Unable to remove the learner: ${withdrawn.error?.message ?? "Enrollment was not updated."}`);
  await audit(admin, "participant.enrollment_withdrawn", "experience_enrollment", enrollment.data.id, { experienceId, versionId, participantId: enrollment.data.participant_id, previousStatus: enrollment.data.status, withdrawnAt });
}
