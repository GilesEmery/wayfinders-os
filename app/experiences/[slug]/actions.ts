"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ACTIVE_ENROLLMENTS = ["enrolled", "in_progress", "completed"];

export async function selfEnrollAction(slug: string) {
  const user = await getPlatformUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/experiences/${slug}`)}`);
  const profile = await ensurePlatformProfile(user);
  if ("error" in profile) redirect(`/experiences/${slug}?enrollmentError=${encodeURIComponent(profile.error ?? "Unable to load your Wayfinders profile.")}`);

  const db = createAdminSupabaseClient();
  const experience = await db.from("experiences").select("id,slug,status,admission_policy,current_published_version_id").eq("slug", slug).maybeSingle();
  if (experience.error || !experience.data) redirect("/experiences");
  const target = experience.data;
  if ((target.status !== "active" && target.status !== "draft") || target.admission_policy !== "open_enrollment" || !target.current_published_version_id) {
    redirect(`/experiences/${slug}?enrollmentError=${encodeURIComponent("This training is not currently open for enrollment.")}`);
  }
  const version = await db.from("experience_versions").select("id").eq("id", target.current_published_version_id).eq("experience_id", target.id).eq("status", "published").maybeSingle();
  if (version.error || !version.data) redirect(`/experiences/${slug}?enrollmentError=${encodeURIComponent("This training does not have an available published version.")}`);
  const versionId = version.data.id;

  const existing = await db.from("experience_enrollments").select("id,experience_version_id,status").eq("participant_id", profile.participant.id).eq("experience_id", target.id).maybeSingle();
  if (existing.error) redirect(`/experiences/${slug}?enrollmentError=${encodeURIComponent("Enrollment could not be verified.")}`);
  const current = existing.data?.experience_version_id === versionId ? existing.data : null;
  if (!current) {
    if (existing.data) redirect(`/experiences/${slug}?enrollmentError=${encodeURIComponent("Your existing Course journey uses another Version and must be reconciled by an administrator.")}`);
    const created = await db.from("experience_enrollments").insert({ experience_id: target.id, experience_version_id: versionId, participant_id: profile.participant.id, version_policy: "follow_current", status: "enrolled", source_type: "self", source_id: profile.participant.id }).select("id").single();
    if (created.error) {
      const raced = await db.from("experience_enrollments").select("id").eq("participant_id", profile.participant.id).eq("experience_id", target.id).eq("experience_version_id", versionId).maybeSingle();
      if (raced.error || !raced.data) redirect(`/experiences/${slug}?enrollmentError=${encodeURIComponent("Enrollment could not be completed.")}`);
    }
  } else if (!ACTIVE_ENROLLMENTS.includes(current.status)) {
    const reactivated = await db.from("experience_enrollments").update({ status: "enrolled", version_policy: "follow_current", completed_experience_version_id: current.status === "completed" ? current.experience_version_id : null, updated_at: new Date().toISOString() }).eq("id", current.id);
    if (reactivated.error) redirect(`/experiences/${slug}?enrollmentError=${encodeURIComponent("Enrollment could not be reactivated.")}`);
  }
  revalidatePath("/dashboard");
  revalidatePath(`/experiences/${slug}`);
  redirect(`/experiences/${slug}`);
}
