import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function resourceBelongsToCourse(storagePath: string | null, experienceId: string) {
  return !storagePath || storagePath.startsWith(`courses/${experienceId}/`) || storagePath.startsWith("library/");
}

// Source and destination blocks are already verified in the same editable course.
// Copy associations only; never upload, copy or delete Storage objects.
export async function inspectBlockResourceLinks(db: SupabaseClient<Database>, sourceBlockId: string, experienceId: string) {
  const links = await db.from("content_block_resources").select("resource_id,sort_order").eq("content_block_id", sourceBlockId);
  if (links.error) throw new Error("Unable to verify the source Block's resources.");
  if (!links.data?.length) return [];
  const ids = [...new Set(links.data.map((link) => link.resource_id))];
  const resources = await db.from("resources").select("id,status,storage_path").in("id", ids);
  if (resources.error || resources.data?.length !== ids.length || resources.data.some((resource) => resource.status !== "active" || !resourceBelongsToCourse(resource.storage_path, experienceId))) throw new Error("A source resource is unavailable or belongs to a different course. Review the asset before copying.");
  return links.data;
}
