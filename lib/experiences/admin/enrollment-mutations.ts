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
  const [version, participant, existing] = await Promise.all([
    db.from("experience_versions").select("id,status,experience_id").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(),
    db.from("participants").select("id").eq("id", participantId).maybeSingle(),
    db.from("experience_enrollments").select("id,status,experience_version_id").eq("participant_id", participantId).eq("experience_id", experienceId).is("cohort_id", null).in("status", ACTIVE),
  ]);
  if (version.error || !version.data || version.data.status !== "published") throw new Error("Select a Published Version belonging to this Experience.");
  if (participant.error || !participant.data) throw new Error("Participant not found.");
  if (existing.error) throw new Error(`Unable to verify existing enrollment: ${existing.error.message}`);
  const duplicate = existing.data?.find((item) => item.experience_version_id === versionId);
  if (duplicate) return { id: duplicate.id, reused: true };
  if (existing.data?.length) throw new Error("This participant already has an active individual enrollment for another Version of this Experience.");
  const created = await db.from("experience_enrollments").insert({ participant_id: participantId, experience_id: experienceId, experience_version_id: versionId, status: "enrolled", source_type: "admin", source_id: admin.id }).select("id").single();
  if (created.error) throw new Error(`Unable to enroll participant: ${created.error.message}`);
  await audit(admin, "participant.enrolled", "experience_enrollment", created.data.id, { experienceId, versionId, participantId });
  return { id: created.data.id, reused: false };
}
