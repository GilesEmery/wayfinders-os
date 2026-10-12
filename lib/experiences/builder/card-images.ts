import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeCourseConfiguration } from "./course-configuration";
import { validateThemeConfiguration } from "./theme-validation";
import { safeExternalUrl } from "./media-source";
import { createCardImageCache } from "./card-image-cache";

const urls = createCardImageCache();
export function courseCardImageIds(configuration: unknown, themeConfiguration: unknown) {
  const course = normalizeCourseConfiguration(configuration);
  const theme = validateThemeConfiguration(themeConfiguration);
  return [course.card.image_resource_id, course.appearance.cover_resource_id ?? (theme.ok ? theme.value.coverImageResourceId : null)].filter((id): id is string => Boolean(id));
}

export function courseCardImageUrl(images: Map<string, string>, ids: readonly string[]) {
  return ids.map(id => images.get(id)).find(Boolean) ?? null;
}

// Call only after the enclosing page resolves its current catalog/enrollment.
// Scope is the verified Auth user ID, or the already-public catalog. No lesson media.
export async function resolveCardImages(db: SupabaseClient<Database>, ids: readonly string[], viewerScope: string, archivedCardIds: readonly string[] = []) {
  const result = new Map<string, string>();
  const archivedAllowed = new Set(archivedCardIds);
  const unique = [...new Set(ids)];
  for (let offset = 0; offset < unique.length; offset += 50) {
    const resources = await db.from("resources").select("id,external_url,storage_bucket,storage_path,updated_at,status")
      .in("id", unique.slice(offset, offset + 50)).eq("resource_type", "image").in("status", ["active", "archived"]);
    if (resources.error) throw new Error("Unable to load Course Card images.");
    const buckets = new Map<string, Array<{ id: string; path: string; key: string }>>();
    for (const resource of resources.data ?? []) {
      // Explicit card images historically support archived resources. Cover
      // fallbacks historically require active resources; keep that boundary.
      if (resource.status === "archived" && !archivedAllowed.has(resource.id)) continue;
      if (!resource.storage_path) {
        const url = safeExternalUrl(resource.external_url ?? "");
        if (url) result.set(resource.id, url);
        continue;
      }
      if (!resource.storage_bucket) throw new Error("Course Card image access could not be prepared.");
      const key = JSON.stringify([viewerScope, resource.id, resource.storage_bucket, resource.storage_path, resource.updated_at, resource.status]);
      const existing = urls.get(key);
      if (existing) { result.set(resource.id, existing); continue; }
      const pending = buckets.get(resource.storage_bucket) ?? [];
      pending.push({ id: resource.id, path: resource.storage_path, key });
      buckets.set(resource.storage_bucket, pending);
    }
    // Bounded chunks; no unused download signatures and no unbounded Promise.all.
    for (const [bucket, pending] of buckets) {
      const issuedAt = Date.now();
      const signed = await db.storage.from(bucket).createSignedUrls([...new Set(pending.map(item => item.path))], 900);
      if (signed.error || !signed.data) throw new Error("Course Card image access could not be prepared.");
      for (const item of pending) {
        const url = signed.data.find(row => row.path === item.path && !row.error)?.signedUrl;
        if (!url) throw new Error("Course Card image access could not be prepared.");
        result.set(item.id, url);
        urls.set(item.key, url, issuedAt);
      }
    }
  }
  return result;
}
