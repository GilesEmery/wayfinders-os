import "server-only";

import { platformExperiences } from "@/data/platform/experiences";
import { getCustomExperience } from "@/lib/experiences/builder/runtime-registry";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { PlatformExperienceDefinition, PlatformExperienceType } from "./types";

function publicType(type: string): PlatformExperienceType {
  if (type === "course" || type === "training" || type === "assessment" || type === "resource") return type;
  if (type === "cohort_pathway") return "cohort";
  return "guided-experience";
}

export async function getCanonicalPublicExperiences(): Promise<PlatformExperienceDefinition[]> {
  const db = createAdminSupabaseClient();
  const [experienceResult, versionResult] = await Promise.all([
    db.from("experiences").select("id,slug,name,description,experience_type,delivery_mode,status,current_published_version_id").eq("status", "active").eq("visibility", "public").order("name"),
    db.from("experience_versions").select("id,version_label"),
  ]);
  if (experienceResult.error || versionResult.error) return platformExperiences;
  const versions = new Map((versionResult.data ?? []).map((version) => [version.id, version.version_label]));
  return (experienceResult.data ?? []).map((experience) => {
    const custom = getCustomExperience(experience.slug);
    return {
      id: experience.id,
      slug: experience.slug,
      title: experience.name,
      shortTitle: experience.name,
      description: experience.description ?? "A Purpose OS Experience.",
      type: publicType(experience.experience_type),
      status: "active",
      href: experience.delivery_mode === "custom_code" && custom ? custom.route(experience.slug) : `/experiences/${experience.slug}`,
      brandKey: experience.slug === "life-mapping-u" ? "lmu" : "purpose-os",
      version: experience.current_published_version_id ? versions.get(experience.current_published_version_id) ?? "Current" : "Current",
    };
  });
}
