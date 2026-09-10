import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { validateThemeConfiguration } from "@/lib/experiences/builder/theme-validation";

export async function getExperienceThemes() {
  const db = createAdminSupabaseClient();
  const [themes, organizations, experienceUsage, versionUsage] = await Promise.all([
    db.from("experience_themes").select("*").order("updated_at", { ascending: false }),
    db.from("organizations").select("id,name").order("name"),
    db.from("experiences").select("id,name,default_theme_id").not("default_theme_id", "is", null),
    db.from("experience_versions").select("id,title,version_label,experience_id,theme_id,status").not("theme_id", "is", null),
  ]);
  if (themes.error || organizations.error || experienceUsage.error || versionUsage.error) throw new Error("Unable to load themes.");
  return { themes: themes.data ?? [], organizations: organizations.data ?? [], experiences: experienceUsage.data ?? [], versions: versionUsage.data ?? [] };
}

export async function getThemeById(themeId: string) {
  const { data, error } = await createAdminSupabaseClient().from("experience_themes").select("*").eq("id", themeId).maybeSingle();
  if (error) throw new Error(`Unable to load theme: ${error.message}`);
  return data;
}

export async function getThemesForOrganization(organizationId: string | null) {
  const db = createAdminSupabaseClient();
  let query = db.from("experience_themes").select("*").neq("status", "archived");
  query = organizationId ? query.or(`organization_id.is.null,organization_id.eq.${organizationId}`) : query.is("organization_id", null);
  const { data, error } = await query.order("name");
  if (error) throw new Error(`Unable to load organization themes: ${error.message}`);
  return data ?? [];
}

export async function getAvailableThemesForExperience(experienceId: string, includeDraft = false) {
  const db = createAdminSupabaseClient();
  const experience = await db.from("experiences").select("id,owner_organization_id").eq("id", experienceId).maybeSingle();
  if (experience.error || !experience.data) throw new Error("Experience not found.");
  const themes = await getThemesForOrganization(experience.data.owner_organization_id);
  return themes.filter((theme) => theme.status === "active" || (includeDraft && theme.status === "draft"));
}

export async function getThemeUsage(themeId: string) {
  const db = createAdminSupabaseClient();
  const [experiences, versions] = await Promise.all([
    db.from("experiences").select("id,name,slug,status").eq("default_theme_id", themeId),
    db.from("experience_versions").select("id,title,version_label,status,experience_id").eq("theme_id", themeId),
  ]);
  if (experiences.error || versions.error) throw new Error("Unable to load theme usage.");
  return { experiences: experiences.data ?? [], versions: versions.data ?? [] };
}

export async function getThemeRevisionHistory(themeKey: string) {
  const { data, error } = await createAdminSupabaseClient().from("experience_themes").select("id,name,theme_key,revision,status,updated_at").eq("theme_key", themeKey).order("revision", { ascending: false });
  if (error) throw new Error(`Unable to load theme revisions: ${error.message}`);
  return data ?? [];
}

export async function getThemeAdminDetail(themeId: string) {
  const theme = await getThemeById(themeId);
  if (!theme) return null;
  const [usage, revisions, organizations, resources] = await Promise.all([
    getThemeUsage(themeId),
    getThemeRevisionHistory(theme.theme_key),
    createAdminSupabaseClient().from("organizations").select("id,name").order("name"),
    createAdminSupabaseClient().from("resources").select("id,title,resource_type,status").eq("status", "active").eq("resource_type", "image").order("title"),
  ]);
  if (organizations.error || resources.error) throw new Error("Unable to load theme reference data.");
  const parsed = validateThemeConfiguration(theme.configuration);
  return { theme, configuration: parsed.ok ? parsed.value : null, configurationErrors: parsed.ok ? [] : parsed.errors, usage, revisions, organizations: organizations.data ?? [], resources: resources.data ?? [] };
}
