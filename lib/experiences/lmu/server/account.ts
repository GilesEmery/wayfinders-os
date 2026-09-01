import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function ensureParticipantContext(user: User, requestedFullName?: string) {
  if (!user.email) return { error: "Your account does not have an email address." } as const;
  const admin = createAdminSupabaseClient();
  const fullName = requestedFullName?.trim() || (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "");
  const profileQuery = await admin
    .from("participants")
    .select("id,auth_user_id,first_name,full_name,email,email_normalized,created_at,updated_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileQuery.error) return { error: "Unable to load your Wayfinders profile." } as const;
  let participant = profileQuery.data;
  if (!participant) {
    if (!fullName) return {
      error: "Enter your full name to finish setting up your Wayfinders profile.",
      code: "full_name_required",
    } as const;
    const firstName = fullName.split(/\s+/)[0];
    const created = await admin
      .from("participants")
      .insert({ auth_user_id: user.id, first_name: firstName, full_name: fullName, email: user.email, email_normalized: user.email.toLowerCase() })
      .select("id,auth_user_id,first_name,full_name,email,email_normalized,created_at,updated_at")
      .single();
    if (created.error) {
      // The unique auth_user_id index makes concurrent onboarding idempotent.
      const existing = await admin
        .from("participants")
        .select("id,auth_user_id,first_name,full_name,email,email_normalized,created_at,updated_at")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (existing.error || !existing.data) return { error: "Unable to create your Wayfinders profile." } as const;
      participant = existing.data;
    } else {
      participant = created.data;
    }
  } else if (participant.email_normalized !== user.email.toLowerCase() || (!participant.full_name && fullName)) {
    const updated = await admin
      .from("participants")
      .update({
        email: user.email,
        email_normalized: user.email.toLowerCase(),
        ...(fullName && !participant.full_name ? { full_name: fullName, first_name: fullName.split(/\s+/)[0] } : {}),
      })
      .eq("id", participant.id)
      .eq("auth_user_id", user.id)
      .select("id,auth_user_id,first_name,full_name,email,email_normalized,created_at,updated_at")
      .single();
    if (updated.error) return { error: "Unable to update your Wayfinders profile." } as const;
    participant = updated.data;
  }

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
  if ("error" in context || !context.assessment) return null;
  return { admin: createAdminSupabaseClient(), user, participant: context.participant, assessment: context.assessment };
}
