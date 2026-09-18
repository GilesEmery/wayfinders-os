"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { uploadLibraryAsset } from "@/lib/experiences/builder/resource-assets";
import { normalizeExperienceIds, validateResourceCategory } from "@/lib/resources/resource-library";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function category(value: FormDataEntryValue | null) { return validateResourceCategory(String(value ?? "")); }
function experienceIds(form: FormData) { return normalizeExperienceIds(form.getAll("experience_id").map(String)); }

export async function uploadResourceAction(form: FormData) {
  const admin = await requireAdmin(); const db = createAdminSupabaseClient(); const file = form.get("file"); const title = String(form.get("title") ?? "").trim(); const selectedCategory = category(form.get("resource_category"));
  if (!(file instanceof File)) throw new Error("Choose a file to upload."); if (!title || title.length > 200) throw new Error("Enter a Resource title of 1 to 200 characters.");
  const resource = await uploadLibraryAsset(db, file, admin.id, title, String(form.get("description") ?? ""), selectedCategory); const ids = experienceIds(form);
  if (ids.length) { const associated = await db.from("resource_experience_associations").insert(ids.map((experienceId) => ({ resource_id: resource.id, experience_id: experienceId, created_by: admin.id }))); if (associated.error) throw new Error("The file was uploaded, but Course associations could not be saved."); }
  await audit(admin, "resource.uploaded", "resource", resource.id, { category: selectedCategory, experienceIds: ids }); revalidatePath("/admin/resources"); redirect(`/admin/resources/${resource.id}?saved=uploaded`);
}

export async function updateResourceAction(resourceId: string, form: FormData) {
  const admin = await requireAdmin(); const db = createAdminSupabaseClient(); const title = String(form.get("title") ?? "").trim(); const selectedCategory = category(form.get("resource_category")); const ids = experienceIds(form);
  if (!title || title.length > 200) throw new Error("Enter a Resource title of 1 to 200 characters.");
  const updated = await db.from("resources").update({ title, description: String(form.get("description") ?? "").trim() || null, resource_category: selectedCategory }).eq("id", resourceId).select("id").maybeSingle(); if (updated.error || !updated.data) throw new Error("Resource metadata could not be updated.");
  const removed = await db.from("resource_experience_associations").delete().eq("resource_id", resourceId); if (removed.error) throw new Error("Existing Course associations could not be updated.");
  if (ids.length) { const associated = await db.from("resource_experience_associations").insert(ids.map((experienceId) => ({ resource_id: resourceId, experience_id: experienceId, created_by: admin.id }))); if (associated.error) throw new Error("Course associations could not be saved."); }
  await audit(admin, "resource.metadata_updated", "resource", resourceId, { category: selectedCategory, experienceIds: ids }); revalidatePath("/admin/resources"); revalidatePath(`/admin/resources/${resourceId}`); redirect(`/admin/resources/${resourceId}?saved=metadata`);
}

export async function setResourceStatusAction(resourceId: string, status: "active" | "archived") {
  const admin = await requireAdmin(); const db = createAdminSupabaseClient(); const updated = await db.from("resources").update({ status }).eq("id", resourceId).select("id").maybeSingle(); if (updated.error || !updated.data) throw new Error(`Resource could not be ${status === "archived" ? "archived" : "restored"}.`);
  await audit(admin, `resource.${status === "archived" ? "archived" : "restored"}`, "resource", resourceId, {}); revalidatePath("/admin/resources"); revalidatePath(`/admin/resources/${resourceId}`); redirect(`/admin/resources/${resourceId}?saved=${status}`);
}
