import "server-only";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { getAuthorizationContext, canAdminExperienceById, canBuildExperienceById, canBuildExperience } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TYPES = new Set(["assessment", "course", "training", "workshop", "pathway", "cohort_pathway", "retreat", "activity", "resource"]);
const MODES = new Set(["builder", "custom_code", "hybrid"]);
const VISIBILITIES = new Set(["private", "unlisted", "public"]);
const STATUSES = new Set(["draft", "active", "inactive", "archived"]);
const RELEASES = new Set(["correction", "structural", "major"]);

function text(form: FormData, key: string, max: number, required = false) {
  const value = String(form.get(key) ?? "").trim();
  if ((required && !value) || value.length > max) throw new Error(`Enter a valid ${key.replaceAll("_", " ")}.`);
  return value;
}

async function validateReferences(ownerId: string | null, themeId: string | null, retainedThemeId?: string | null) {
  const db = createAdminSupabaseClient();
  const [owner, theme] = await Promise.all([
    ownerId ? db.from("organizations").select("id").eq("id", ownerId).neq("status", "archived").maybeSingle() : Promise.resolve({ data: null, error: null }),
    themeId ? db.from("experience_themes").select("id,organization_id,status").eq("id", themeId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (owner.error || (ownerId && !owner.data)) throw new Error("The selected owner organization is unavailable.");
  if (theme.error || (themeId && (!theme.data || (theme.data.status !== "active" && themeId !== retainedThemeId)))) throw new Error("The selected theme is unavailable for new assignment.");
  if (theme.data?.organization_id && theme.data.organization_id !== ownerId) throw new Error("The selected theme belongs to another organization.");
}

export async function createExperience(form: FormData) {
  const admin = await requireAdmin();
  const context = await getAuthorizationContext(admin.id, admin.email);
  const name = text(form, "name", 160, true);
  const slug = text(form, "slug", 120, true).toLowerCase();
  const description = text(form, "description", 3000) || null;
  const experienceType = text(form, "experience_type", 40, true);
  const deliveryMode = text(form, "delivery_mode", 20, true);
  const visibility = text(form, "visibility", 20, true);
  const ownerId = text(form, "owner_organization_id", 36) || null;
  const themeId = text(form, "default_theme_id", 36) || null;
  if (!SLUG.test(slug)) throw new Error("Slug must use lowercase letters, numbers, and single hyphens.");
  if (!TYPES.has(experienceType) || !MODES.has(deliveryMode) || !VISIBILITIES.has(visibility)) throw new Error("One or more Experience settings are invalid.");
  if (!canBuildExperience(context, "new", ownerId)) throw new Error("You are not authorized to create an Experience for this owner.");
  await validateReferences(ownerId, themeId);
  const db = createAdminSupabaseClient();
  const duplicate = await db.from("experiences").select("id").eq("slug", slug).maybeSingle();
  if (duplicate.error) throw new Error(`Unable to verify the slug: ${duplicate.error.message}`);
  if (duplicate.data) throw new Error("That Experience slug is already in use.");
  const payload: TablesInsert<"experiences"> = { name, slug, description, experience_type: experienceType, delivery_mode: deliveryMode, visibility, owner_organization_id: ownerId, default_theme_id: themeId, status: "draft", created_by: admin.id };
  const created = await db.from("experiences").insert(payload).select("id").single();
  if (created.error) throw new Error(`Unable to create the Experience: ${created.error.message}`);
  if (deliveryMode !== "custom_code") {
    const version = await db.from("experience_versions").insert({ experience_id: created.data.id, version_label: "0.1", title: name, description, status: "draft", created_by: admin.id, theme_id: themeId }).select("id").single();
    if (version.error) {
      await db.from("experiences").delete().eq("id", created.data.id).eq("status", "draft");
      throw new Error(`Unable to create the initial draft version: ${version.error.message}`);
    }
  }
  await audit(admin, "created_experience", "experience", created.data.id, { deliveryMode, ownerId });
  return created.data.id;
}

export async function updateExperience(experienceId: string, form: FormData) {
  const admin = await requireAdmin();
  const context = await getAuthorizationContext(admin.id, admin.email);
  if (!await canAdminExperienceById(context, experienceId)) throw new Error("You are not authorized to administer this Experience.");
  const visibility = text(form, "visibility", 20, true);
  const status = text(form, "status", 20, true);
  const ownerId = text(form, "owner_organization_id", 36) || null;
  const themeId = text(form, "default_theme_id", 36) || null;
  if (!VISIBILITIES.has(visibility) || !STATUSES.has(status)) throw new Error("Invalid lifecycle setting.");
  const current = await createAdminSupabaseClient().from("experiences").select("delivery_mode,current_published_version_id,default_theme_id").eq("id", experienceId).maybeSingle();
  if (current.error || !current.data) throw new Error("Experience not found.");
  await validateReferences(ownerId, themeId, current.data.default_theme_id);
  if (status === "active" && current.data.delivery_mode !== "custom_code" && !current.data.current_published_version_id) throw new Error("A builder or hybrid Experience cannot become active until it has a current published version.");
  const updates: TablesUpdate<"experiences"> = { name: text(form, "name", 160, true), description: text(form, "description", 3000) || null, visibility, status, owner_organization_id: ownerId, default_theme_id: themeId };
  const { error } = await createAdminSupabaseClient().from("experiences").update(updates).eq("id", experienceId);
  if (error) throw new Error(`Unable to update the Experience: ${error.message}`);
  await audit(admin, "updated_experience", "experience", experienceId, { fields: Object.keys(updates) });
}

export async function createDraftVersion(experienceId: string, form: FormData) {
  const admin = await requireAdmin();
  const context = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(context, experienceId)) throw new Error("You are not authorized to author this Experience.");
  const basedOnId = text(form, "based_on_version_id", 36) || null;
  const releaseType = text(form, "release_type", 20) || null;
  if (releaseType && !RELEASES.has(releaseType)) throw new Error("Invalid release type.");
  const db = createAdminSupabaseClient();
  const experience = await db.from("experiences").select("name,description,default_theme_id").eq("id", experienceId).maybeSingle();
  if (!experience.data) throw new Error("Experience not found.");
  if (basedOnId) {
    const source = await db.from("experience_versions").select("id").eq("id", basedOnId).eq("experience_id", experienceId).maybeSingle();
    if (!source.data) throw new Error("The source version does not belong to this Experience.");
  }
  const versionLabel = text(form, "version_label", 80, true);
  const created = await db.from("experience_versions").insert({ experience_id: experienceId, version_label: versionLabel, title: text(form, "title", 200) || experience.data.name, description: experience.data.description, status: "draft", based_on_version_id: basedOnId, release_type: releaseType, theme_id: experience.data.default_theme_id, created_by: admin.id }).select("id").single();
  if (created.error) throw new Error(`Unable to create draft version: ${created.error.message}`);
  await audit(admin, "created_experience_version", "experience_version", created.data.id, { experienceId, basedOnId, metadataOnly: true });
  return created.data.id;
}
