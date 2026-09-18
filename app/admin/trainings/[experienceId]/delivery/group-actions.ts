"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const deliveryPath = (experienceId: string, message?: string) => `/admin/trainings/${experienceId}/delivery${message ? `?groupSaved=${encodeURIComponent(message)}` : ""}`;
async function managementReturn(experienceId: string, message: string) { const referer = (await headers()).get("referer"); if (referer) { const path = new URL(referer).pathname; if (path.startsWith("/admin/cohorts/")) return `${path}?saved=${encodeURIComponent(message)}`; } return deliveryPath(experienceId, message); }

async function authorized(experienceId: string, offeringId?: string) {
  const admin = await requireAdmin();
  const db = createAdminSupabaseClient();
  const experience = await db.from("experiences").select("id,current_published_version_id").eq("id", experienceId).maybeSingle();
  if (!experience.data) throw new Error("Training not found.");
  const offering = offeringId ? await db.from("experience_offerings").select("id,cohort_id,experience_version_id").eq("id", offeringId).eq("experience_id", experienceId).maybeSingle() : { data: null, error: null };
  if (offeringId && !offering.data?.cohort_id) throw new Error("This delivery is not a Cohort.");
  return { admin, db, experience: experience.data, offering: offering.data };
}

export async function createGroupAction(experienceId: string, form: FormData) {
  const { admin, db, experience } = await authorized(experienceId);
  const name = String(form.get("name") ?? "").trim();
  const versionId = experience.current_published_version_id ?? "";
  if (!name || name.length > 200 || !versionId) throw new Error("Enter a Cohort name and choose a published Course Version.");
  const version = await db.from("experience_versions").select("id").eq("id", versionId).eq("experience_id", experienceId).eq("status", "published").maybeSingle();
  if (!version.data) throw new Error("Choose a published Course Version from this training.");
  const slugBase = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "group";
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const cohort = await db.from("cohorts").insert({ experience_id: experienceId, experience_version_id: null, name, slug, status: "active" }).select("id").single();
  if (cohort.error) throw new Error(`Cohort could not be created: ${cohort.error.message}`);
  const offering = await db.from("experience_offerings").insert({ experience_id: experienceId, experience_version_id: null, cohort_id: cohort.data.id, name, slug, status: "active", visibility: "private", access_mode: "cohort_membership", group_mode: "required", created_by: admin.id }).select("id").single();
  if (offering.error) throw new Error(`Cohort delivery could not be created: ${offering.error.message}`);
  await audit(admin, "course.group.created", "cohort", cohort.data.id, { experienceId, offeringId: offering.data.id, versionPolicy: "follow_current", initialVersionId: versionId });
  revalidatePath(deliveryPath(experienceId));
  redirect(deliveryPath(experienceId, `${name} created.`));
}

export async function attachExistingGroupAction(experienceId: string, form: FormData) {
  const { admin, db } = await authorized(experienceId);
  const cohortId = String(form.get("cohort_id") ?? "");
  const versionId = String(form.get("experience_version_id") ?? "");
  const cohort = await db.from("cohorts").select("id,name,slug,experience_version_id").eq("id", cohortId).eq("experience_id", experienceId).maybeSingle();
  if (!cohort.data || cohort.data.experience_version_id && cohort.data.experience_version_id !== versionId) throw new Error("Choose a compatible Cohort and Course Version.");
  const version = await db.from("experience_versions").select("id").eq("id", versionId).eq("experience_id", experienceId).eq("status", "published").maybeSingle();
  if (!version.data) throw new Error("Choose a published Course Version.");
  if (!cohort.data.experience_version_id) await db.from("cohorts").update({ experience_version_id: versionId, status: "active" }).eq("id", cohortId);
  const existing = await db.from("experience_offerings").select("id").eq("experience_id", experienceId).eq("cohort_id", cohortId).maybeSingle();
  if (existing.data) redirect(deliveryPath(experienceId, `${cohort.data.name} is already connected.`));
  const offering = await db.from("experience_offerings").insert({ experience_id: experienceId, experience_version_id: versionId, cohort_id: cohortId, name: cohort.data.name, slug: cohort.data.slug, status: "active", visibility: "private", access_mode: "cohort_membership", group_mode: "required", created_by: admin.id }).select("id").single();
  if (offering.error) throw new Error(`Cohort delivery could not be connected: ${offering.error.message}`);
  const plan = await db.from("cohort_course_plans").insert({ cohort_id: cohortId, experience_id: experienceId, experience_version_id: versionId, name: `${cohort.data.name} Journey`, status: "active", group_mode_override: "required", settings: {}, created_by: admin.id });
  if (plan.error) throw new Error(`Cohort Journey could not be created: ${plan.error.message}`);
  await audit(admin, "course.group.attached", "cohort", cohortId, { experienceId, offeringId: offering.data.id, versionId });
  revalidatePath(deliveryPath(experienceId)); redirect(deliveryPath(experienceId, `${cohort.data.name} connected.`));
}

export async function addGroupMemberAction(experienceId: string, offeringId: string, form: FormData) {
  const { admin, db, offering } = await authorized(experienceId, offeringId);
  const participantId = String(form.get("participant_id") ?? "");
  const participant = await db.from("participants").select("id").eq("id", participantId).maybeSingle();
  if (!participant.data) throw new Error("Choose a valid Wayfinder.");
  await db.from("cohort_memberships").delete().eq("cohort_id", offering!.cohort_id!).eq("participant_id", participantId);
  const membership = await db.from("cohort_memberships").insert({ cohort_id: offering!.cohort_id!, participant_id: participantId, membership_role: "participant", status: "active", joined_at: new Date().toISOString() });
  if (membership.error) throw new Error(`Member could not be added: ${membership.error.message}`);
  await audit(admin, "course.group.member_added", "cohort", offering!.cohort_id!, { experienceId, offeringId, participantId });
  revalidatePath(deliveryPath(experienceId)); redirect(await managementReturn(experienceId, "Member added."));
}

export async function setGroupMemberRoleAction(experienceId: string, offeringId: string, participantId: string, role: "participant" | "facilitator") {
  const { admin, db, offering } = await authorized(experienceId, offeringId);
  await db.from("cohort_memberships").delete().eq("cohort_id", offering!.cohort_id!).eq("participant_id", participantId);
  const saved = await db.from("cohort_memberships").insert({ cohort_id: offering!.cohort_id!, participant_id: participantId, membership_role: role, status: "active", joined_at: new Date().toISOString() });
  if (saved.error) throw new Error(`Leader assignment could not be saved: ${saved.error.message}`);
  await audit(admin, "course.group.member_role_updated", "cohort", offering!.cohort_id!, { experienceId, offeringId, participantId, role });
  revalidatePath(deliveryPath(experienceId)); redirect(await managementReturn(experienceId, role === "facilitator" ? "Leader assigned." : "Member role saved."));
}

export async function removeGroupMemberAction(experienceId: string, offeringId: string, participantId: string) {
  const { admin, db, offering } = await authorized(experienceId, offeringId);
  const removed = await db.from("cohort_memberships").delete().eq("cohort_id", offering!.cohort_id!).eq("participant_id", participantId);
  if (removed.error) throw new Error(`Member could not be removed: ${removed.error.message}`);
  await audit(admin, "course.group.member_removed", "cohort", offering!.cohort_id!, { experienceId, offeringId, participantId });
  revalidatePath(deliveryPath(experienceId)); redirect(await managementReturn(experienceId, "Member removed; Course enrollment retained."));
}
