import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensurePlatformProfile } from "@/lib/platform/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function ensureParticipantContext(user: User, requestedFullName?: string) {
  const admin = createAdminSupabaseClient();
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
  if (active.data) return { participant, assessment: active.data, createdAssessment: false } as const;

  const historical = await admin.from("lmu_assessments").select("id").eq("participant_id", participant.id).limit(1);
  if (historical.error) return { error: "Unable to inspect your Life Mapping U history." } as const;
  if (historical.data.length) return { participant, assessment: null, createdAssessment: false } as const;

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
    if (resumed.data) return { participant, assessment: resumed.data, createdAssessment: false } as const;
    return { error: "Unable to start your Life Mapping U assessment." } as const;
  }
  return { participant, assessment: createdAssessment.data, createdAssessment: true } as const;
}

export async function resolveAuthenticatedParticipant() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const context = await ensureParticipantContext(user);
  if ("error" in context || !("assessment" in context) || !context.assessment) return null;
  return { admin: createAdminSupabaseClient(), user, participant: context.participant, assessment: context.assessment };
}
