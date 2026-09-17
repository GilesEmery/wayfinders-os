import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { safeExternalUrl } from "./media-source";
import { normalizeCourseConfiguration } from "./course-configuration";
import { signedAssetUrl } from "./resource-assets";
import { validateThemeConfiguration } from "./theme-validation";

export async function resolveCourseCoverUrl(courseConfiguration: unknown, themeConfiguration: unknown, db: ReturnType<typeof createAdminSupabaseClient>): Promise<string | null> {
  const course = normalizeCourseConfiguration(courseConfiguration);
  const theme = validateThemeConfiguration(themeConfiguration);
  const resourceId = course.appearance.cover_resource_id ?? (theme.ok ? theme.value.coverImageResourceId : null);
  if (!resourceId) return null;
  const result = await db.from("resources").select("external_url,storage_bucket,storage_path").eq("id", resourceId).eq("resource_type", "image").eq("status", "active").maybeSingle();
  if (result.error) throw new Error(`Unable to load course cover: ${result.error.message}`);
  if (!result.data) return null;
  return result.data.storage_path ? signedAssetUrl(db, result.data) : safeExternalUrl(result.data.external_url ?? "");
}

export async function resolveCourseLogoUrl(courseConfiguration: unknown, themeConfiguration: unknown, db: ReturnType<typeof createAdminSupabaseClient>): Promise<string | null> {
  const course = normalizeCourseConfiguration(courseConfiguration);
  const theme = validateThemeConfiguration(themeConfiguration);
  const resourceId = course.appearance.logo_resource_id ?? (theme.ok ? theme.value.logoResourceId : null);
  if (!resourceId) return null;
  const result = await db.from("resources").select("external_url,storage_bucket,storage_path").eq("id", resourceId).eq("resource_type", "image").eq("status", "active").maybeSingle();
  if (result.error) throw new Error(`Unable to load course logo: ${result.error.message}`);
  if (!result.data) return null;
  return result.data.storage_path ? signedAssetUrl(db, result.data) : safeExternalUrl(result.data.external_url ?? "");
}
