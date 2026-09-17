import "server-only";

import { connection } from "next/server";
import { resolveCourseCoverUrl } from "@/lib/experiences/builder/course-cover";
import { resolveExperienceRuntime } from "@/lib/experiences/builder/runtime";
import type { ExperienceDeliveryMode } from "@/lib/experiences/builder/types";
import { getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ACTIVE_ENROLLMENT_STATUSES = ["enrolled", "in_progress", "completed"];

export type TrainingCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  experienceType: string;
  admissionPolicy: string;
  coverUrl: string | null;
  enrollmentStatus: string | null;
  href: string;
};

export async function getTrainingCatalog(): Promise<{ items: TrainingCatalogItem[]; signedIn: boolean }> {
  await connection();
  const db = createAdminSupabaseClient();
  const user = await getPlatformUser();
  const experiences = await db.from("experiences")
    .select("id,slug,name,description,experience_type,delivery_mode,status,admission_policy,current_published_version_id,default_theme_id")
    .eq("visibility", "public")
    .in("status", ["draft", "active"])
    .order("name");
  if (experiences.error) throw new Error(`Unable to load the Trainings Catalog: ${experiences.error.message}`);
  const rows = experiences.data ?? [];
  const versionIds = rows.flatMap((item) => item.current_published_version_id ? [item.current_published_version_id] : []);
  const participantPromise = user
    ? db.from("participants").select("id").eq("auth_user_id", user.id).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const versionsPromise = versionIds.length
    ? db.from("experience_versions").select("id,experience_id,status,theme_id,course_configuration").in("id", versionIds).eq("status", "published")
    : Promise.resolve({ data: [], error: null });
  const [participant, versions] = await Promise.all([participantPromise, versionsPromise]);
  if (participant.error || versions.error) throw new Error("Unable to resolve the Trainings Catalog context.");
  const publishedByExperience = new Map((versions.data ?? []).map((version) => [version.experience_id, version]));
  const eligibleRows = rows.flatMap((item) => {
    const runtime = resolveExperienceRuntime(item.slug, item.delivery_mode as ExperienceDeliveryMode);
    if (item.delivery_mode === "custom_code") return item.status === "active" && runtime.kind === "custom" ? [{ item, href: runtime.route }] : [];
    return publishedByExperience.has(item.id) && (runtime.kind === "builder" || runtime.kind === "hybrid") ? [{ item, href: `/experiences/${item.slug}` }] : [];
  });
  const themeIds = [...new Set(eligibleRows.flatMap(({ item }) => {
    const version = publishedByExperience.get(item.id);
    const themeId = version?.theme_id ?? item.default_theme_id;
    return themeId ? [themeId] : [];
  }))];
  const [themes, enrollments] = await Promise.all([
    themeIds.length ? db.from("experience_themes").select("id,configuration").in("id", themeIds) : Promise.resolve({ data: [], error: null }),
    participant.data && eligibleRows.length
      ? db.from("experience_enrollments").select("experience_id,status").eq("participant_id", participant.data.id).in("experience_id", eligibleRows.map(({ item }) => item.id)).in("status", ACTIVE_ENROLLMENT_STATUSES)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (themes.error || enrollments.error) throw new Error("Unable to load Training appearance or enrollment state.");
  const themeById = new Map((themes.data ?? []).map((theme) => [theme.id, theme.configuration]));
  const enrollmentByExperience = new Map((enrollments.data ?? []).map((enrollment) => [enrollment.experience_id, enrollment.status]));
  const items = await Promise.all(eligibleRows.map(async ({ item, href }) => {
    const version = publishedByExperience.get(item.id);
    const themeId = version?.theme_id ?? item.default_theme_id;
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      experienceType: item.experience_type,
      admissionPolicy: item.admission_policy,
      coverUrl: version ? await resolveCourseCoverUrl(version.course_configuration, themeId ? themeById.get(themeId) : null, db) : null,
      enrollmentStatus: enrollmentByExperience.get(item.id) ?? null,
      href,
    };
  }));
  return { items, signedIn: Boolean(user) };
}
