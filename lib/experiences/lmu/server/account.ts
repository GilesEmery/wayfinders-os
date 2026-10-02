import "server-only";
import { needsExperiencePassword } from "@/lib/experiences/access/server";
import type { User } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensurePlatformProfile } from "@/lib/platform/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function bindEmbeddedAttempt(admin: ReturnType<typeof createAdminSupabaseClient>, participantId: string, assessmentId: string, embeddedAttemptId?: string) {
  if (!embeddedAttemptId) return;
  const experience = await admin.from("experiences").select("id").eq("slug", "life-mapping-u").eq("experience_type", "assessment").maybeSingle();
  if (experience.error || !experience.data) throw new Error("Life Mapping U is not registered as an Assessment Experience.");
  const attempt = await admin.from("embedded_assessment_attempts").select("id,status,assessment_enrollment_id,provider_attempt_id").eq("id", embeddedAttemptId).eq("participant_id", participantId).eq("assessment_experience_id", experience.data.id).maybeSingle();
  if (attempt.error || !attempt.data) throw new Error("This embedded Assessment launch is unavailable.");
  if (attempt.data.provider_attempt_id && attempt.data.provider_attempt_id !== assessmentId) throw new Error("This embedded Assessment launch is already connected to another attempt.");
  if (attempt.data.provider_attempt_id === assessmentId) return;
  const link = await admin.from("embedded_assessment_attempts").update({ provider_attempt_id: assessmentId, updated_at: new Date().toISOString() }).eq("id", attempt.data.id).eq("participant_id", participantId).is("provider_attempt_id", null);
  if (link.error) throw new Error("Unable to connect Life Mapping U to the originating Course.");
}

export async function ensureParticipantContext(user: User, requestedFullName?: string, embeddedAttemptId?: string) {
  const admin = createAdminSupabaseClient();
  const experience = await admin.from("experiences").select("id").eq("slug", "life-mapping-u").maybeSingle();
  if (experience.error || !experience.data) return { error: "Life Mapping U is unavailable." } as const;
  if (await needsExperiencePassword(experience.data.id)) return { error: "Enter the Experience access password to continue.", code: "experience_password_required" } as const;
  const profile = await ensurePlatformProfile(user, requestedFullName);
  if ("error" in profile) return profile;
  const participant = profile.participant;

  const active = await admin
    .from("lmu_assessments")
    .select("id,participant_id,experience_type,status,assessment_version,current_module,started_at,completed_at,updated_at")
    .eq("participant_id", participant.id)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active.error) return { error: "Unable to load your Life Mapping U assessment." } as const;
  if (active.data) {
    await bindEmbeddedAttempt(admin, participant.id, active.data.id, embeddedAttemptId);
    return { participant, assessment: active.data, createdAssessment: false } as const;
  }

  const historical = await admin.from("lmu_assessments").select("id,status,completed_at").eq("participant_id", participant.id).order("updated_at", { ascending: false }).limit(1);
  if (historical.error) return { error: "Unable to inspect your Life Mapping U history." } as const;
  if (historical.data.length) {
    if (embeddedAttemptId && historical.data[0].status === "completed") {
      await bindEmbeddedAttempt(admin, participant.id, historical.data[0].id, embeddedAttemptId);
      const completedAt = historical.data[0].completed_at ?? new Date().toISOString();
      const attempt = await admin.from("embedded_assessment_attempts").select("assessment_enrollment_id").eq("id", embeddedAttemptId).eq("participant_id", participant.id).maybeSingle();
      if (attempt.data) {
        await admin.from("embedded_assessment_attempts").update({ status: "completed", completed_at: completedAt, updated_at: completedAt }).eq("id", embeddedAttemptId);
        await admin.from("experience_enrollments").update({ status: "completed", completed_at: completedAt, updated_at: completedAt }).eq("id", attempt.data.assessment_enrollment_id).eq("participant_id", participant.id);
      }
    }
    return { participant, assessment: null, createdAssessment: false } as const;
  }

  const createdAssessment = await admin
    .from("lmu_assessments")
    .insert({ participant_id: participant.id, experience_type: "original" })
    .select("id,participant_id,experience_type,status,assessment_version,current_module,started_at,completed_at,updated_at")
    .single();
  if (createdAssessment.error) {
    const resumed = await admin
      .from("lmu_assessments")
      .select("id,participant_id,experience_type,status,assessment_version,current_module,started_at,completed_at,updated_at")
      .eq("participant_id", participant.id)
      .eq("status", "in_progress")
      .maybeSingle();
    if (resumed.data) {
      await bindEmbeddedAttempt(admin, participant.id, resumed.data.id, embeddedAttemptId);
      return { participant, assessment: resumed.data, createdAssessment: false } as const;
    }
    return { error: "Unable to start your Life Mapping U assessment." } as const;
  }
  await bindEmbeddedAttempt(admin, participant.id, createdAssessment.data.id, embeddedAttemptId);
  return { participant, assessment: createdAssessment.data, createdAssessment: true } as const;
}

export async function resolveAuthenticatedParticipant() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminSupabaseClient();
  const experience = await admin.from("experiences").select("id").eq("slug", "life-mapping-u").maybeSingle();
  if (experience.error || !experience.data || await needsExperiencePassword(experience.data.id)) return null;
  const participant = await admin.from("participants").select("id,first_name,email,updated_at").eq("auth_user_id", user.id).maybeSingle();
  if (participant.error || !participant.data) return null;
  const assessment = await admin.from("lmu_assessments").select("id,participant_id,status,current_module,started_at,completed_at,updated_at").eq("participant_id", participant.data.id).in("status", ["in_progress", "completed"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (assessment.error || !assessment.data) return null;
  return { admin, user, participant: participant.data, assessment: assessment.data };
}
