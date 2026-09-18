"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { validMeetingUrl } from "@/lib/experiences/builder/companion-live";

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "cohort"; }

export async function createCohortAction(form: FormData) {
  const admin = await requireAdmin(); const db = createAdminSupabaseClient();
  const name = String(form.get("name") ?? "").trim(); const experienceId = String(form.get("experience_id") ?? ""); const status = String(form.get("status") ?? "active");
  if (!name || name.length > 200 || !["draft", "open", "active"].includes(status)) throw new Error("Enter a valid Cohort name and status.");
  const experience = await db.from("experiences").select("id,current_published_version_id").eq("id", experienceId).maybeSingle();
  if (!experience.data?.current_published_version_id) throw new Error("Choose a Course with a current Published Version.");
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;
  const cohort = await db.from("cohorts").insert({ experience_id: experienceId, experience_version_id: null, name, slug, status, start_date: String(form.get("start_date") ?? "") || null, end_date: String(form.get("end_date") ?? "") || null }).select("id").single();
  if (cohort.error) throw new Error(`Cohort could not be created: ${cohort.error.message}`);
  const offering = await db.from("experience_offerings").insert({ experience_id: experienceId, experience_version_id: null, cohort_id: cohort.data.id, name, slug, status: "active", visibility: "private", access_mode: "cohort_membership", group_mode: "required", created_by: admin.id }).select("id").single();
  if (offering.error) throw new Error(`Cohort delivery could not be created: ${offering.error.message}`);
  await audit(admin, "cohort.created", "cohort", cohort.data.id, { experienceId, offeringId: offering.data.id, versionPolicy: "follow_current", initialVersionId: experience.data.current_published_version_id });
  revalidatePath("/admin/cohorts"); redirect(`/admin/cohorts/${cohort.data.id}?saved=created`);
}

export async function updateCohortAction(cohortId: string, form: FormData) {
  const admin = await requireAdmin(); const db = createAdminSupabaseClient(); const name = String(form.get("name") ?? "").trim(); const status = String(form.get("status") ?? "active");
  const startDate = String(form.get("start_date") ?? "") || null; const endDate = String(form.get("end_date") ?? "") || null;
  if (!name || name.length > 200 || !["draft", "open", "active", "completed"].includes(status) || startDate && endDate && endDate < startDate) throw new Error("Enter valid Cohort details and make sure the end date is not before the start date.");
  const saved = await db.from("cohorts").update({ name, status, start_date: startDate, end_date: endDate }).eq("id", cohortId).select("id").maybeSingle();
  if (saved.error || !saved.data) throw new Error("Cohort details could not be saved.");
  const offering = await db.from("experience_offerings").update({ name, status: status === "active" || status === "open" ? "active" : "inactive" }).eq("cohort_id", cohortId);
  if (offering.error) throw new Error("The Cohort was updated, but its delivery status could not be synchronized.");
  await audit(admin, "cohort.updated", "cohort", cohortId, { status }); revalidatePath(`/admin/cohorts/${cohortId}`); redirect(`/admin/cohorts/${cohortId}?saved=details`);
}

export async function saveCohortVideoConferenceAction(cohortId: string, companionModuleId: string, form: FormData) {
  const admin = await requireAdmin(); const db = createAdminSupabaseClient();
  const enabled = form.get("enabled") === "true"; const url = String(form.get("url") ?? "").trim();
  if (enabled && !validMeetingUrl(url)) redirect(`/admin/cohorts/${cohortId}?videoError=${encodeURIComponent("Enter a valid http or https Meeting Link before enabling Video Conference.")}`);
  const [cohort, offering, module] = await Promise.all([db.from("cohorts").select("experience_id").eq("id", cohortId).maybeSingle(), db.from("experience_offerings").select("id").eq("cohort_id", cohortId).order("created_at", { ascending: true }).limit(1).maybeSingle(), db.from("companion_modules").select("id,experience_version_id,module_type,availability_context").eq("id", companionModuleId).maybeSingle()]);
  if (!cohort.data || !offering.data || !module.data || module.data.module_type !== "video_call" || module.data.availability_context !== "cohort") throw new Error("This Course does not provide a Cohort Video Conference capability.");
  const version = await db.from("experience_versions").select("experience_id").eq("id", module.data.experience_version_id).maybeSingle(); if (version.data?.experience_id !== cohort.data.experience_id) throw new Error("Video Conference does not belong to this Cohort's Course.");
  const configuration = { enabled: enabled ? "true" : "false", url, provider: String(form.get("provider") ?? "").trim(), recurring_time: String(form.get("recurring_time") ?? "").trim(), instructions: String(form.get("instructions") ?? "").trim() };
  const existing = await db.from("companion_delivery_overrides").select("id").eq("companion_module_id", companionModuleId).eq("offering_id", offering.data.id).maybeSingle();
  const saved = existing.data ? await db.from("companion_delivery_overrides").update({ configuration, visibility: "inherit", updated_by: admin.id }).eq("id", existing.data.id) : await db.from("companion_delivery_overrides").insert({ companion_module_id: companionModuleId, experience_version_id: module.data.experience_version_id, offering_id: offering.data.id, configuration, visibility: "inherit", updated_by: admin.id });
  if (saved.error) throw new Error(`Video Conference could not be saved: ${saved.error.message}`);
  await audit(admin, "cohort.video_conference_updated", "cohort", cohortId, { companionModuleId, enabled }); revalidatePath(`/admin/cohorts/${cohortId}`); redirect(`/admin/cohorts/${cohortId}?saved=video`);
}
