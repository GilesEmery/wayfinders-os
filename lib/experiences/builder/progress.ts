import "server-only";

import type { Json, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SectionProgress } from "./types";

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function getOwnSectionProgress(enrollmentId: string, sectionId: string): Promise<SectionProgress | null> {
  const user = await getPlatformUser();
  if (!user) return null;
  const db = createAdminSupabaseClient();
  const participantResult = await db.from("participants").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (participantResult.error) throw new Error(`Unable to identify the participant: ${participantResult.error.message}`);
  if (!participantResult.data) return null;
  const enrollmentResult = await db.from("experience_enrollments").select("id,experience_version_id").eq("id", enrollmentId).eq("participant_id", participantResult.data.id).maybeSingle();
  if (enrollmentResult.error) throw new Error(`Unable to verify the enrollment: ${enrollmentResult.error.message}`);
  if (!enrollmentResult.data?.experience_version_id) return null;
  const progressResult = await db.from("section_progress").select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("participant_id", participantResult.data.id)
    .eq("experience_version_id", enrollmentResult.data.experience_version_id)
    .eq("section_id", sectionId)
    .maybeSingle();
  if (progressResult.error) throw new Error(`Unable to load Section progress: ${progressResult.error.message}`);
  if (!progressResult.data) return null;
  const status = ["in_progress", "completed", "skipped"].includes(progressResult.data.status)
    ? progressResult.data.status as SectionProgress["status"]
    : "not_started";
  return { ...progressResult.data, status };
}

export function prepareSectionProgressStart(input: {
  enrollmentId: string;
  participantId: string;
  experienceVersionId: string;
  sectionId: string;
  now?: string;
}): TablesInsert<"section_progress"> {
  const now = input.now ?? new Date().toISOString();
  return { enrollment_id: input.enrollmentId, participant_id: input.participantId, experience_version_id: input.experienceVersionId, section_id: input.sectionId, status: "in_progress", resume_state: {}, started_at: now, updated_at: now };
}

export function prepareSectionResumeUpdate(resumeState: Json, now = new Date().toISOString()): TablesUpdate<"section_progress"> {
  if (!isJsonObject(resumeState)) throw new Error("Section resume state must be a JSON object.");
  return { status: "in_progress", resume_state: resumeState, updated_at: now };
}

export function prepareSectionCompletion(now = new Date().toISOString()): TablesUpdate<"section_progress"> {
  return { status: "completed", completed_at: now, updated_at: now };
}

// These helpers intentionally prepare validated mutations only. Server actions must
// authorize the participant/enrollment pair before applying them with the admin client.
