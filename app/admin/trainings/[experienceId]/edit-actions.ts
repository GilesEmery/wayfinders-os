"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createDraftVersion } from "@/lib/experiences/admin/mutations";
import { clonePublishedVersion } from "@/lib/experiences/admin/version-release";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COURSE_COLOR_FIELDS, GROUP_LABELS, normalizeCourseConfiguration, type GroupLabel } from "@/lib/experiences/builder/course-configuration";
import { uploadCourseAsset } from "@/lib/experiences/builder/resource-assets";
import { validateThemeConfiguration } from "@/lib/experiences/builder/theme-validation";
import type { Json } from "@/lib/supabase/database.types";

const overview = (id: string, error?: string) => `/admin/trainings/${id}${error ? `?error=${encodeURIComponent(error)}` : ""}`;

export async function editCourseAction(experienceId: string) {
  let draftId: string;
  try {
    const admin = await requireAdmin();
    const authorization = await getAuthorizationContext(admin.id, admin.email);
    if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to edit this Course.");
    const db = createAdminSupabaseClient();
    const [experience, versions] = await Promise.all([
      db.from("experiences").select("id,delivery_mode,current_published_version_id").eq("id", experienceId).maybeSingle(),
      db.from("experience_versions").select("id,status,created_at").eq("experience_id", experienceId).order("created_at", { ascending: false }),
    ]);
    if (experience.error || versions.error || !experience.data) throw new Error("Unable to open this Course.");
    const course = experience.data;
    if (course.delivery_mode === "custom_code") throw new Error("Custom-code Experiences use their own authoring workflow.");
    const existing = versions.data?.find((version) => version.status === "draft");
    if (existing) draftId = existing.id;
    else if (course.current_published_version_id) {
      const source = versions.data?.find((version) => version.id === course.current_published_version_id && version.status === "published");
      if (!source) throw new Error("The current Published Version could not be verified.");
      // A timestamp label is internal; unique constraints remain the final concurrency guard.
      draftId = await clonePublishedVersion(experienceId, source.id, `Draft ${new Date().toISOString()}`);
    } else {
      const form = new FormData();
      form.set("version_label", `Draft ${new Date().toISOString()}`);
      draftId = await createDraftVersion(experienceId, form);
    }
  } catch (error) {
    unstable_rethrow(error);
    redirect(overview(experienceId, error instanceof Error ? error.message : "Edit Course could not be opened."));
  }
  revalidatePath(overview(experienceId));
  redirect(`/admin/trainings/${experienceId}/versions/${draftId}`);
}

export async function updateCourseLayoutAction(experienceId: string, versionId: string, form: FormData) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to change this Course.");
  const mode = String(form.get("course_layout") ?? "");
  if (mode !== "standard" && mode !== "enhanced") throw new Error("Choose Standard or Enhanced Course layout.");
  const db = createAdminSupabaseClient();
  const result = await db.from("experience_versions").update({ shell_mode: mode }).eq("id", versionId).eq("experience_id", experienceId).eq("status", "draft").select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("Course layout could not be saved. Only Draft courses may be edited.");
  await audit(admin, "course.layout.updated", "experience_version", versionId, { experienceId, shellMode: mode });
  revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);
  redirect(`/admin/trainings/${experienceId}/versions/${versionId}?saved=${encodeURIComponent("Course layout saved for this Draft.")}`);
}

export async function renameCourseAction(experienceId: string, versionId: string, selectedSectionId: string | undefined, form: FormData) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to rename this Course.");
  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 200) throw new Error("Enter a Course title of 200 characters or fewer.");
  const db = createAdminSupabaseClient();
  const result = await db.from("experience_versions").update({ title }).eq("id", versionId).eq("experience_id", experienceId).eq("status", "draft").select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("Only a Draft Course can be renamed.");
  await audit(admin, "course.renamed", "experience_version", versionId, { experienceId, title });
  revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);
  const query = new URLSearchParams({ saved: "Course title saved." });
  if (selectedSectionId) query.set("section", selectedSectionId);
  redirect(`/admin/trainings/${experienceId}/versions/${versionId}?${query}`);
}

export async function updateCourseConfigurationAction(experienceId: string, versionId: string, form: FormData) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to change this Course.");
  const db = createAdminSupabaseClient();
  const current = await db.from("experience_versions").select("id,status,course_configuration").eq("id", versionId).eq("experience_id", experienceId).maybeSingle();
  if (current.error || !current.data || current.data.status !== "draft") throw new Error("Only a Draft Course can be configured.");
  const existing = normalizeCourseConfiguration(current.data.course_configuration);
  const label = String(form.get("group_label") ?? "");
  const header = String(form.get("header_treatment") ?? "");
  const width = String(form.get("reading_width") ?? "");
  const accent = String(form.get("accent_color") ?? "").trim();
  if (!GROUP_LABELS.includes(label as GroupLabel) || !["minimal", "image", "color"].includes(header) || !["focused", "standard", "wide"].includes(width)) throw new Error("Choose supported Course settings.");
  if (accent && !/^#[0-9a-f]{6}$/i.test(accent)) throw new Error("Accent must be a six-digit hex color.");
  const colors = Object.fromEntries(COURSE_COLOR_FIELDS.map(([key]) => { const submitted = form.get(key); if (submitted === null) return [key, existing.appearance.colors[key]]; const value = String(submitted).trim(); if (value && !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${key} must be a six-digit hex color.`); return [key, value || null]; }));
  const configuration = { ...existing, terminology: { group_label: label as GroupLabel }, appearance: { ...existing.appearance, header_treatment: header, reading_width: width, accent_color: accent || null, colors } };
  const result = await db.from("experience_versions").update({ course_configuration: configuration }).eq("id", versionId).eq("experience_id", experienceId).eq("status", "draft").select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("Course appearance could not be saved.");
  await audit(admin, "course.configuration.updated", "experience_version", versionId, { experienceId });
  revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);
  redirect(`/admin/trainings/${experienceId}/versions/${versionId}?saved=${encodeURIComponent("Course appearance saved for this Draft.")}`);
}

export async function setCourseCoverAction(experienceId: string, versionId: string, form: FormData) {
  return setCourseImage(experienceId, versionId, form, "cover");
}

export async function setCourseLogoAction(experienceId: string, versionId: string, form: FormData) {
  return setCourseImage(experienceId, versionId, form, "logo");
}

export async function setCourseHeaderLogoAction(experienceId: string, versionId: string, form: FormData) {
  return setCourseImage(experienceId, versionId, form, "header_logo");
}

async function setCourseImage(experienceId: string, versionId: string, form: FormData, kind: "cover" | "logo" | "header_logo") {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to change this Course.");
  const db = createAdminSupabaseClient();
  const current = await db.from("experience_versions").select("id,status,course_configuration").eq("id", versionId).eq("experience_id", experienceId).maybeSingle();
  if (current.error || !current.data || current.data.status !== "draft") throw new Error(`Only a Draft Course ${kind} can be changed.`);
  const operation = String(form.get("asset_operation") ?? "select");
  let resourceId: string | null = String(form.get("resource_id") ?? "") || null;
  if (kind === "header_logo" && operation === "use_course_logo") resourceId = null;
  if (operation === "upload") {
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) throw new Error("Choose a supported image.");
    resourceId = (await uploadCourseAsset(db, file, experienceId, admin.id, String(form.get("asset_title") ?? ""))).id;
  } else if (operation === "remove") resourceId = null;
  if (resourceId) {
    const resource = await db.from("resources").select("id").eq("id", resourceId).eq("resource_type", "image").eq("status", "active").not("storage_path", "is", null).maybeSingle();
    if (resource.error || !resource.data) throw new Error("Choose an available uploaded image.");
  }
  const configuration = normalizeCourseConfiguration(current.data.course_configuration);
  const imageUpdate = kind === "cover" ? { cover_resource_id: resourceId } : kind === "logo" ? { logo_resource_id: resourceId } : { header_logo_mode: operation === "use_course_logo" ? "course_logo" as const : operation === "remove" ? "purposeos" as const : "custom" as const, header_logo_resource_id: resourceId };
  const updated = { ...configuration, appearance: { ...configuration.appearance, ...imageUpdate } };
  const result = await db.from("experience_versions").update({ course_configuration: updated }).eq("id", versionId).eq("experience_id", experienceId).eq("status", "draft").select("id").maybeSingle();
  if (result.error || !result.data) throw new Error(`Course ${kind} could not be saved.`);
  await audit(admin, `course.${kind}.updated`, "experience_version", versionId, { experienceId, resourceId });
  revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);
  redirect(`/admin/trainings/${experienceId}/versions/${versionId}?saved=${encodeURIComponent(`Course ${kind} saved for this Draft.`)}`);
}

export async function saveCourseThemeAction(experienceId: string, versionId: string, form: FormData) {
  const admin = await requireAdmin(); const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to save Themes.");
  const name = String(form.get("theme_name") ?? "").trim(); if (!name || name.length > 120) throw new Error("Enter a Theme name of 120 characters or fewer.");
  const db = createAdminSupabaseClient();
  const [version, experience] = await Promise.all([db.from("experience_versions").select("status,course_configuration,theme_id").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(), db.from("experiences").select("owner_organization_id").eq("id", experienceId).maybeSingle()]);
  if (version.error || experience.error || version.data?.status !== "draft") throw new Error("Only a Draft Course can be saved as a Theme.");
  const course = normalizeCourseConfiguration(version.data.course_configuration);
  const pinned = version.data.theme_id ? await db.from("experience_themes").select("configuration").eq("id", version.data.theme_id).maybeSingle() : { data: null, error: null };
  const parsed = validateThemeConfiguration(pinned.data?.configuration);
  const colors = Object.fromEntries(Object.entries(course.appearance.colors).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const configuration = JSON.parse(JSON.stringify({ ...(parsed.ok ? parsed.value : {}), colors })) as Json;
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course-theme";
  const latest = await db.from("experience_themes").select("revision").eq("theme_key", key).order("revision", { ascending: false }).limit(1);
  const created = await db.from("experience_themes").insert({ theme_key: key, revision: (latest.data?.[0]?.revision ?? 0) + 1, name, organization_id: experience.data?.owner_organization_id ?? null, status: "active", configuration, created_by: admin.id }).select("id").single();
  if (created.error) throw new Error(`Theme could not be saved: ${created.error.message}`);
  const applied = await db.from("experience_versions").update({ theme_id: created.data.id }).eq("id", versionId).eq("status", "draft"); if (applied.error) throw new Error("Theme was saved but could not be applied.");
  await audit(admin, "course.theme.saved", "experience_theme", created.data.id, { experienceId, versionId }); revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`); redirect(`/admin/trainings/${experienceId}/versions/${versionId}?saved=${encodeURIComponent("Theme saved and applied.")}`);
}

export async function applyCourseThemeAction(experienceId: string, versionId: string, form: FormData) {
  const admin = await requireAdmin(); const authorization = await getAuthorizationContext(admin.id, admin.email); if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to apply a Theme.");
  const db = createAdminSupabaseClient(); const themeId = String(form.get("theme_id") ?? "");
  const [version, theme] = await Promise.all([db.from("experience_versions").select("status,course_configuration").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(), db.from("experience_themes").select("configuration").eq("id", themeId).eq("status", "active").maybeSingle()]);
  const parsed = validateThemeConfiguration(theme.data?.configuration); if (version.data?.status !== "draft" || !parsed.ok) throw new Error("Choose an available Theme for this Draft.");
  const current = normalizeCourseConfiguration(version.data.course_configuration); const themeColors = parsed.value.colors ?? {}; const colors = Object.fromEntries(COURSE_COLOR_FIELDS.map(([key]) => [key, themeColors[key] ?? null]));
  const updated = await db.from("experience_versions").update({ theme_id: themeId, course_configuration: { ...current, appearance: { ...current.appearance, colors } } }).eq("id", versionId).eq("status", "draft").select("id").maybeSingle(); if (updated.error || !updated.data) throw new Error("Theme could not be applied.");
  await audit(admin, "course.theme.applied", "experience_version", versionId, { experienceId, themeId }); revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`); redirect(`/admin/trainings/${experienceId}/versions/${versionId}?saved=${encodeURIComponent("Theme applied.")}`);
}
