import "server-only";

import { requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, canPublishExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { validatePublishRuntime } from "./publish-validation";

const LABEL = /^.{1,80}$/;

async function releaseContext(experienceId: string, versionId: string, mode: "publish" | "clone") {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  const allowed = mode === "publish"
    ? await canPublishExperienceById(authorization, experienceId)
    : await canBuildExperienceById(authorization, experienceId);
  if (!allowed) throw new Error(`You are not authorized to ${mode} this Experience Version.`);
  const db = createAdminSupabaseClient();
  const [experience, version] = await Promise.all([
    db.from("experiences").select("id,slug,delivery_mode,current_published_version_id").eq("id", experienceId).maybeSingle(),
    db.from("experience_versions").select("id,experience_id,status").eq("id", versionId).maybeSingle(),
  ]);
  if (experience.error || version.error) throw new Error("Unable to verify this Experience Version.");
  if (!experience.data || !version.data || version.data.experience_id !== experienceId) throw new Error("This Version does not belong to the selected Experience.");
  return { admin, db, experience: experience.data, version: version.data };
}

export async function publishVersion(experienceId: string, versionId: string): Promise<string> {
  const { admin, db, experience, version } = await releaseContext(experienceId, versionId, "publish");
  if (version.status !== "draft") throw new Error("This Version is no longer Draft. Reload before publishing.");
  await validatePublishRuntime(experienceId, versionId);
  const result = await db.rpc("publish_experience_version", {
    p_experience_id: experienceId, p_version_id: versionId, p_actor_id: admin.id,
  });
  if (result.error) {
    console.error("publish_experience_version failed", { experienceId, versionId, code: result.error.code, message: result.error.message });
    if (result.error.message === "Publish requires a Draft Version") throw new Error("This Version is no longer Draft. Reload before publishing.");
    if (result.error.message.includes("companion_chat_messages_author_enrollment_fk") || result.error.message.includes("companion_call_sessions_starter_enrollment_fk")) {
      throw new Error("Publishing is waiting for the canonical Companion enrollment migration. Apply 20260919123000_live_companion_canonical_enrollment_fk.sql, then publish again.");
    }
    if (result.error.message.includes("Draft Companion modules require stable-key reconciliation before publishing.")) {
      throw new Error("A Companion module containing saved learner notes was removed from this Draft. Restore that module before publishing so the notes remain available.");
    }
    if (result.error.message.startsWith("Cannot publish:")) throw new Error(result.error.message);
    throw new Error("Publication could not be completed. No Version state was changed.");
  }
  if (result.data !== versionId) throw new Error("Publication returned an unexpected Version ID.");
  if (experience.current_published_version_id && experience.current_published_version_id !== versionId) {
    const [sourceModules, targetModules] = await Promise.all([db.from("companion_modules").select("id,module_key").eq("experience_version_id", experience.current_published_version_id), db.from("companion_modules").select("id,module_key").eq("experience_version_id", versionId)]);
    if (sourceModules.error || targetModules.error) throw new Error("The Version was Published, but Cohort Companion continuity could not be resolved.");
    const targetByKey = new Map((targetModules.data ?? []).map((module) => [module.module_key, module.id])); const sourceIds = (sourceModules.data ?? []).map((module) => module.id);
    const overrides = sourceIds.length ? await db.from("companion_delivery_overrides").select("companion_module_id,offering_id,cohort_course_plan_id,visibility,configuration,updated_by").in("companion_module_id", sourceIds) : { data: [], error: null };
    if (overrides.error) throw new Error("The Version was Published, but Cohort Companion delivery settings could not be loaded.");
    const keyBySource = new Map((sourceModules.data ?? []).map((module) => [module.id, module.module_key]));
    for (const override of overrides.data ?? []) { if (!override.offering_id) continue; const targetId = targetByKey.get(keyBySource.get(override.companion_module_id) ?? ""); if (!targetId) continue; const existing = await db.from("companion_delivery_overrides").select("id").eq("companion_module_id", targetId).eq("offering_id", override.offering_id).maybeSingle(); if (!existing.data) { const copied = await db.from("companion_delivery_overrides").insert({ companion_module_id: targetId, experience_version_id: versionId, offering_id: override.offering_id, visibility: override.visibility, configuration: override.configuration, updated_by: override.updated_by }); if (copied.error && copied.error.code !== "23505") throw new Error("The Version was Published, but Cohort Companion delivery settings could not be carried forward."); } }
  }
  const activated = await db.from("experiences").update({ status: "active" }).eq("id", experienceId).in("status", ["draft", "active"]).select("id").maybeSingle();
  if (activated.error || !activated.data) throw new Error("The Version was Published, but the Experience could not be activated. Review its lifecycle status before sharing it.");
  return versionId;
}

export async function clonePublishedVersion(experienceId: string, sourceVersionId: string, requestedLabel: string): Promise<string> {
  const { admin, db, version } = await releaseContext(experienceId, sourceVersionId, "clone");
  if (version.status !== "published") throw new Error("Only a Published Version can be cloned into a new Draft.");
  const label = requestedLabel.trim();
  if (!LABEL.test(label)) throw new Error("Enter a Version label of 1 to 80 characters.");
  const result = await db.rpc("clone_experience_version_with_companion_keys", {
    p_experience_id: experienceId, p_source_version_id: sourceVersionId,
    p_version_label: label, p_actor_id: admin.id,
  });
  if (result.error) {
    console.error("clone_experience_version_with_companion_keys failed", { experienceId, sourceVersionId, code: result.error.code, message: result.error.message });
    if (result.error.code === "23505" || /duplicate version label/i.test(result.error.message)) throw new Error("That Version label is already in use. Choose another label.");
    if (result.error.message === "Clone requires a Published source Version") throw new Error("The source Version is no longer Published. Reload and try again.");
    throw new Error("The new Draft could not be created. The Published Version was not changed.");
  }
  if (!result.data) throw new Error("The clone did not return a new Draft Version ID.");
  return result.data;
}
