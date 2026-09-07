import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type OfferingResolutionSource = "explicit_assignment" | "cohort" | "hub" | "global";

export async function resolveExperienceOffering({ participantId, experienceId, hubId }: { participantId: string; experienceId: string; hubId?: string | null }) {
  const db = createAdminSupabaseClient(); const now = new Date().toISOString();
  const { data: direct } = await db.from("participant_offering_assignments").select("offering_id,source_type,experience_offerings!inner(*)").eq("participant_id", participantId).eq("status", "active").eq("experience_offerings.experience_id", experienceId).lte("starts_at", now).or(`expires_at.is.null,expires_at.gt.${now}`).limit(1).maybeSingle();
  if (direct) return { offering: direct.experience_offerings, source: "explicit_assignment" as const, accessSource: direct.source_type };

  const { data: cohortMemberships } = await db.from("cohort_memberships").select("cohort_id").eq("participant_id", participantId).eq("status", "active");
  const cohortIds = (cohortMemberships ?? []).map((item) => item.cohort_id);
  if (cohortIds.length) {
    const { data: cohortOffering } = await db.from("experience_offerings").select("*").eq("experience_id", experienceId).eq("status", "active").in("cohort_id", cohortIds).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).order("is_default", { ascending: false }).limit(1).maybeSingle();
    if (cohortOffering) return { offering: cohortOffering, source: "cohort" as const, accessSource: "Cohort membership" };
  }
  if (hubId) {
    const { data: hubOffering } = await db.from("experience_offerings").select("*").eq("experience_id", experienceId).eq("hub_id", hubId).eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).order("is_default", { ascending: false }).limit(1).maybeSingle();
    if (hubOffering) return { offering: hubOffering, source: "hub" as const, accessSource: "Hub membership" };
  }
  const { data: globalOffering } = await db.from("experience_offerings").select("*").eq("experience_id", experienceId).is("hub_id", null).is("cohort_id", null).eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).order("is_default", { ascending: false }).limit(1).maybeSingle();
  return globalOffering ? { offering: globalOffering, source: "global" as const, accessSource: globalOffering.access_mode === "open" ? "Free / global" : "Global offering" } : null;
}
