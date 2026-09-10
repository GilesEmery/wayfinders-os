import "server-only";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { FALLBACK_EXPERIENCE_THEME } from "@/lib/experiences/builder/theme-resolver";
import { validateThemeConfiguration } from "@/lib/experiences/builder/theme-validation";
import type { ThemeConfiguration } from "@/lib/experiences/builder/types";
import { getAuthorizationContext, canBuildExperienceById } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

const THEME_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THEME_STATUSES = new Set(["draft", "active", "archived"]);

function text(form: FormData, key: string, max: number, required = false) {
  const value = String(form.get(key) ?? "").trim();
  if ((required && !value) || value.length > max) throw new Error(`Enter a valid ${key.replaceAll("_", " ")}.`);
  return value;
}

function optional(form: FormData, key: string) { return text(form, key, 80) || undefined; }

function configurationFromForm(form: FormData): ThemeConfiguration {
  const colors = {
    primaryAccent: text(form, "primaryAccent", 7, true), secondaryAccent: text(form, "secondaryAccent", 7, true),
    background: text(form, "background", 7, true), surface: text(form, "surface", 7, true), elevatedSurface: text(form, "elevatedSurface", 7, true),
    text: text(form, "text", 7, true), mutedText: text(form, "mutedText", 7, true), borderColor: text(form, "borderColor", 7, true),
  };
  const decorative = optional(form, "decorativeResourceId");
  const config: ThemeConfiguration = {
    logoResourceId: optional(form, "logoResourceId"), coverImageResourceId: optional(form, "coverImageResourceId"), decorativeResourceIds: decorative ? [decorative] : undefined,
    colors, typographyKey: optional(form, "typographyKey") as ThemeConfiguration["typographyKey"], headingTreatment: optional(form, "headingTreatment") as ThemeConfiguration["headingTreatment"],
    buttonVariant: optional(form, "buttonVariant") as ThemeConfiguration["buttonVariant"], cardTreatment: optional(form, "cardTreatment") as ThemeConfiguration["cardTreatment"],
    navigationTreatment: optional(form, "navigationTreatment") as ThemeConfiguration["navigationTreatment"], spacingPreset: optional(form, "spacingPreset") as ThemeConfiguration["spacingPreset"], cornerPreset: optional(form, "cornerPreset") as ThemeConfiguration["cornerPreset"],
  };
  const parsed = validateThemeConfiguration(config);
  if (!parsed.ok) throw new Error(parsed.errors.join(" "));
  return parsed.value;
}

async function validateScopeAndResources(organizationId: string | null, config: ThemeConfiguration) {
  const db = createAdminSupabaseClient();
  if (organizationId) {
    const organization = await db.from("organizations").select("id").eq("id", organizationId).neq("status", "archived").maybeSingle();
    if (!organization.data) throw new Error("The selected organization is unavailable.");
  }
  const ids = [config.logoResourceId, config.coverImageResourceId, ...(config.decorativeResourceIds ?? [])].filter((id): id is string => Boolean(id));
  if (ids.length) {
    const resources = await db.from("resources").select("id").in("id", ids).eq("status", "active").eq("resource_type", "image");
    if (resources.error || new Set(resources.data?.map((row) => row.id)).size !== new Set(ids).size) throw new Error("One or more selected resources are unavailable.");
  }
}

export async function createTheme(form: FormData) {
  const admin = await requireAdmin();
  const key = text(form, "theme_key", 120, true).toLowerCase();
  const name = text(form, "name", 160, true);
  const organizationId = text(form, "organization_id", 36) || null;
  const sourceId = text(form, "source_theme_id", 36) || null;
  if (!THEME_KEY.test(key)) throw new Error("Theme key must use lowercase letters, numbers, and single hyphens.");
  const db = createAdminSupabaseClient();
  let configuration: ThemeConfiguration = FALLBACK_EXPERIENCE_THEME;
  if (sourceId) {
    const source = await db.from("experience_themes").select("configuration").eq("id", sourceId).maybeSingle();
    const parsed = validateThemeConfiguration(source.data?.configuration);
    if (!parsed.ok) throw new Error("The source theme configuration is unavailable or invalid.");
    configuration = parsed.value;
  }
  await validateScopeAndResources(organizationId, configuration);
  const existing = await db.from("experience_themes").select("revision").eq("theme_key", key).order("revision", { ascending: false }).limit(1).maybeSingle();
  if (existing.data) throw new Error("That theme key already exists. Create a new revision from its detail page.");
  const created = await db.from("experience_themes").insert({ theme_key: key, revision: 1, name, organization_id: organizationId, status: "draft", configuration: configuration as Json, created_by: admin.id }).select("id").single();
  if (created.error) throw new Error(`Unable to create theme: ${created.error.message}`);
  await audit(admin, "created_experience_theme", "experience_theme", created.data.id, { key, revision: 1 });
  return created.data.id;
}

export async function updateDraftTheme(themeId: string, form: FormData) {
  const admin = await requireAdmin();
  const db = createAdminSupabaseClient();
  const theme = await db.from("experience_themes").select("id,status,organization_id").eq("id", themeId).maybeSingle();
  if (!theme.data) throw new Error("Theme not found.");
  if (theme.data.status !== "draft") throw new Error("Only draft theme revisions can be edited.");
  const configuration = configurationFromForm(form);
  await validateScopeAndResources(theme.data.organization_id, configuration);
  const updated = await db.from("experience_themes").update({ name: text(form, "name", 160, true), configuration: configuration as Json }).eq("id", themeId).eq("status", "draft");
  if (updated.error) throw new Error(`Unable to update theme: ${updated.error.message}`);
  await audit(admin, "updated_experience_theme", "experience_theme", themeId);
}

export async function createThemeRevision(themeId: string) {
  const admin = await requireAdmin();
  const db = createAdminSupabaseClient();
  const source = await db.from("experience_themes").select("*").eq("id", themeId).maybeSingle();
  if (!source.data) throw new Error("Theme not found.");
  const parsed = validateThemeConfiguration(source.data.configuration);
  if (!parsed.ok) throw new Error("The source theme configuration is invalid.");
  await validateScopeAndResources(source.data.organization_id, parsed.value);
  const latest = await db.from("experience_themes").select("revision").eq("theme_key", source.data.theme_key).order("revision", { ascending: false }).limit(1).single();
  if (latest.error) throw new Error("Unable to determine the next revision.");
  const created = await db.from("experience_themes").insert({ theme_key: source.data.theme_key, revision: latest.data.revision + 1, name: source.data.name, organization_id: source.data.organization_id, status: "draft", configuration: parsed.value as Json, created_by: admin.id }).select("id").single();
  if (created.error) throw new Error(`Unable to create theme revision: ${created.error.message}`);
  await audit(admin, "created_experience_theme_revision", "experience_theme", created.data.id, { sourceThemeId: themeId });
  return created.data.id;
}

export async function setThemeStatus(themeId: string, status: string) {
  const admin = await requireAdmin();
  if (!THEME_STATUSES.has(status) || status === "draft") throw new Error("Invalid theme lifecycle transition.");
  const db = createAdminSupabaseClient();
  const theme = await db.from("experience_themes").select("status,configuration,organization_id").eq("id", themeId).maybeSingle();
  if (!theme.data) throw new Error("Theme not found.");
  if (theme.data.status === "archived") throw new Error("Archived themes cannot change lifecycle state.");
  const parsed = validateThemeConfiguration(theme.data.configuration);
  if (!parsed.ok) throw new Error("Invalid themes cannot be activated or archived.");
  if (status === "active") await validateScopeAndResources(theme.data.organization_id, parsed.value);
  const result = await db.from("experience_themes").update({ status }).eq("id", themeId).in("status", ["draft", "active"]);
  if (result.error) throw new Error(`Unable to update theme status: ${result.error.message}`);
  await audit(admin, `${status}_experience_theme`, "experience_theme", themeId);
}

export async function assignVersionTheme(experienceId: string, versionId: string, themeId: string | null) {
  const admin = await requireAdmin();
  const context = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(context, experienceId)) throw new Error("You are not authorized to build this Experience.");
  const db = createAdminSupabaseClient();
  const [experience, version] = await Promise.all([
    db.from("experiences").select("owner_organization_id").eq("id", experienceId).maybeSingle(),
    db.from("experience_versions").select("id,status").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(),
  ]);
  if (!experience.data || !version.data) throw new Error("Experience version not found.");
  if (version.data.status !== "draft") throw new Error("Published and archived version themes are immutable.");
  if (themeId) {
    const theme = await db.from("experience_themes").select("id,status,organization_id").eq("id", themeId).in("status", ["draft", "active"]).maybeSingle();
    if (!theme.data || (theme.data.organization_id && theme.data.organization_id !== experience.data.owner_organization_id)) throw new Error("The selected theme is not available to this Experience.");
  }
  const result = await db.from("experience_versions").update({ theme_id: themeId }).eq("id", versionId).eq("experience_id", experienceId).eq("status", "draft");
  if (result.error) throw new Error(`Unable to assign version theme: ${result.error.message}`);
  await audit(admin, "assigned_experience_version_theme", "experience_version", versionId, { experienceId, themeId });
}
