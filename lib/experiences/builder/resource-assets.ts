import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";

export const COURSE_ASSET_BUCKET = "purposeos-assets";
export const NATIVE_ASSET_MAX_BYTES = 25 * 1024 * 1024;
export const COURSE_ASSET_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
  "text/plain", "text/csv", "application/rtf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

type Db = SupabaseClient<Database>;
export type CourseAsset = Tables<"resources">;

function extension(filename: string) {
  const match = /\.([a-z0-9]{1,10})$/i.exec(filename);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function resourceType(mime: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "download";
}

async function validateSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  const ascii = new TextDecoder("ascii").decode(bytes);
  const valid = file.type === "image/jpeg" ? starts(0xff, 0xd8, 0xff)
    : file.type === "image/png" ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    : file.type === "image/gif" ? ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")
    : file.type === "image/webp" ? ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP"
    : file.type === "application/pdf" ? ascii.startsWith("%PDF-")
    : file.type === "application/rtf" ? ascii.startsWith("{\\rtf")
    : file.type.includes("openxmlformats") ? starts(0x50, 0x4b, 0x03, 0x04)
    : ["application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"].includes(file.type) ? starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)
    : ["text/plain", "text/csv"].includes(file.type) ? !bytes.includes(0) : false;
  if (!valid) throw new Error("The file contents do not match the declared file type.");
}

export async function uploadCourseAsset(db: Db, file: File, experienceId: string, actorId: string, title?: string) {
  if (!file.name || file.name.length > 255) throw new Error("Choose a file with a valid name of 255 characters or fewer.");
  if (!COURSE_ASSET_MIME_TYPES.has(file.type)) throw new Error("That file type is not supported. Upload an image, PDF, or common office document.");
  if (file.size < 1) throw new Error("Choose a non-empty file.");
  if (file.size > NATIVE_ASSET_MAX_BYTES) throw new Error("This file is too large. Files may be up to 25 MB.");
  await validateSignature(file);
  const resourceId = randomUUID();
  const objectPath = `courses/${experienceId}/${resourceId}/asset${extension(file.name)}`;
  const upload = await db.storage.from(COURSE_ASSET_BUCKET).upload(objectPath, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (upload.error) {
    console.error("Course asset Storage upload failed", { bucket: COURSE_ASSET_BUCKET, message: upload.error.message });
    if (/bucket.*not found|not found.*bucket/i.test(upload.error.message)) throw new Error("Native media storage has not been enabled for this environment.");
    throw new Error("The file could not be uploaded. Please try again or ask an administrator to review the server log.");
  }
  const created = await db.from("resources").insert({
    id: resourceId,
    title: title?.trim() || file.name.replace(/\.[^.]+$/, ""),
    description: null,
    resource_type: resourceType(file.type),
    status: "active",
    external_url: null,
    storage_bucket: COURSE_ASSET_BUCKET,
    storage_path: objectPath,
    original_filename: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    metadata: {},
    created_by: actorId,
  }).select("*").single();
  if (created.error) {
    console.error("Course asset Resource insert failed", { code: created.error.code, message: created.error.message, details: created.error.details, hint: created.error.hint });
    await db.storage.from(COURSE_ASSET_BUCKET).remove([objectPath]);
    if (created.error.code === "42703" || /original_filename|mime_type|file_size_bytes/i.test(created.error.message)) {
      throw new Error("Native media storage has not been enabled for this environment.");
    }
    throw new Error("The uploaded asset metadata could not be saved. Please try again or ask an administrator to review the server log.");
  }
  return created.data;
}

export async function signedAssetUrl(db: Db, resource: Pick<CourseAsset, "storage_bucket" | "storage_path"> & { original_filename?: string | null }, download = false) {
  if (!resource.storage_bucket || !resource.storage_path) return null;
  const signed = await db.storage.from(resource.storage_bucket).createSignedUrl(resource.storage_path, 15 * 60, download ? { download: resource.original_filename || true } : undefined);
  if (signed.error) throw new Error(`Asset access could not be prepared: ${signed.error.message}`);
  return signed.data.signedUrl;
}

export async function listCourseAssets(db: Db, type?: "image" | "document" | "pdf") {
  let query = db.from("resources").select("*").eq("status", "active").not("storage_path", "is", null).order("created_at", { ascending: false }).limit(100);
  query = type === "image" ? query.eq("resource_type", "image") : type === "pdf" ? query.eq("resource_type", "pdf").eq("mime_type", "application/pdf") : type === "document" ? query.in("resource_type", ["pdf", "download", "worksheet", "guide"]) : query;
  const result = await query;
  if (result.error) throw new Error(`Unable to load uploaded assets: ${result.error.message}`);
  return result.data ?? [];
}

export type ResolvedAsset = Readonly<{ id: string; url: string; downloadUrl: string; title: string; description: string | null; originalFilename: string | null; mimeType: string | null; sizeBytes: number | null }>;

async function resolveResources(db: Db, ids: readonly string[]) {
  if (!ids.length) return new Map<string, ResolvedAsset>();
  const result = await db.from("resources").select("*").in("id", [...new Set(ids)]).eq("status", "active");
  if (result.error) throw new Error(`Unable to load course assets: ${result.error.message}`);
  const entries = await Promise.all((result.data ?? []).map(async (resource) => {
    const url = resource.storage_path ? await signedAssetUrl(db, resource) : resource.external_url;
    const downloadUrl = resource.storage_path ? await signedAssetUrl(db, resource, true) : resource.external_url;
    return url && downloadUrl ? [resource.id, { id: resource.id, url, downloadUrl, title: resource.title, description: resource.description, originalFilename: resource.original_filename, mimeType: resource.mime_type, sizeBytes: resource.file_size_bytes }] as const : null;
  }));
  return new Map(entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)));
}

export async function resolveCourseAssets(db: Db, blockIds: readonly string[], sections: readonly { id: string; settings: unknown }[]) {
  const links = blockIds.length ? await db.from("content_block_resources").select("content_block_id,resource_id,sort_order").in("content_block_id", [...blockIds]).order("sort_order") : { data: [], error: null };
  if (links.error) throw new Error(`Unable to load Content asset links: ${links.error.message}`);
  const heroPairs = sections.map((section) => {
    const settings = section.settings && typeof section.settings === "object" && !Array.isArray(section.settings) ? section.settings as Record<string, unknown> : {};
    return [section.id, typeof settings.hero_resource_id === "string" ? settings.hero_resource_id : null] as const;
  });
  const ids = [...(links.data ?? []).map((link) => link.resource_id), ...heroPairs.map((pair) => pair[1]).filter((id): id is string => Boolean(id))];
  const resources = await resolveResources(db, ids);
  return {
    blocks: Object.fromEntries((links.data ?? []).map((link) => [link.content_block_id, resources.get(link.resource_id)]).filter((entry) => Boolean(entry[1]))) as Record<string, ResolvedAsset>,
    heroes: Object.fromEntries(heroPairs.map(([sectionId, resourceId]) => [sectionId, resourceId ? resources.get(resourceId) : undefined]).filter((entry) => Boolean(entry[1]))) as Record<string, ResolvedAsset>,
  };
}
