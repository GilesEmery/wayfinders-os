"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createDraftVersion } from "@/lib/experiences/admin/mutations";
import { clonePublishedVersion } from "@/lib/experiences/admin/version-release";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
