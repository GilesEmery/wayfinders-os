import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getAdminExperienceIndex() {
  const db = createAdminSupabaseClient();
  const [experiences, versions, organizations] = await Promise.all([
    db.from("experiences").select("*").order("updated_at", { ascending: false }),
    db.from("experience_versions").select("id,experience_id,version_label,status"),
    db.from("organizations").select("id,name").order("name"),
  ]);
  if (experiences.error || versions.error || organizations.error) throw new Error("Unable to load the Experience registry.");
  const versionMap = new Map((versions.data ?? []).map((version) => [version.id, version]));
  const organizationMap = new Map((organizations.data ?? []).map((organization) => [organization.id, organization.name]));
  return { experiences: (experiences.data ?? []).map((experience) => ({ ...experience, currentVersion: experience.current_published_version_id ? versionMap.get(experience.current_published_version_id) ?? null : null, ownerName: experience.owner_organization_id ? organizationMap.get(experience.owner_organization_id) ?? null : null })), organizations: organizations.data ?? [] };
}

export async function getAdminExperienceDetail(experienceId: string) {
  const db = createAdminSupabaseClient();
  const experienceResult = await db.from("experiences").select("*").eq("id", experienceId).maybeSingle();
  if (experienceResult.error) throw new Error(`Unable to load Experience: ${experienceResult.error.message}`);
  if (!experienceResult.data) return null;
  const [versions, organizations, themes, offerings, cohorts] = await Promise.all([
    db.from("experience_versions").select("*").eq("experience_id", experienceId).order("created_at", { ascending: false }),
    db.from("organizations").select("id,name").order("name"),
    db.from("experience_themes").select("id,name,theme_key,revision,status,organization_id,configuration").order("name"),
    db.from("experience_offerings").select("id").eq("experience_id", experienceId),
    db.from("cohorts").select("id").eq("experience_id", experienceId),
  ]);
  if (versions.error || organizations.error || themes.error || offerings.error || cohorts.error) throw new Error("Unable to load Experience administration details.");
  return { experience: experienceResult.data, versions: versions.data ?? [], organizations: organizations.data ?? [], themes: themes.data ?? [], offeringCount: offerings.data?.length ?? 0, cohortCount: cohorts.data?.length ?? 0 };
}
