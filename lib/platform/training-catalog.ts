import "server-only";

import { connection } from "next/server";
import { resolveCourseCoverUrl } from "@/lib/experiences/builder/course-cover";
import { normalizeCourseConfiguration } from "@/lib/experiences/builder/course-configuration";
import { resolveResourceIds } from "@/lib/experiences/builder/resource-assets";
import { resolveExperienceRuntime } from "@/lib/experiences/builder/runtime";
import type { ExperienceDeliveryMode } from "@/lib/experiences/builder/types";
import { getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveCourseCard, type CourseCardDisplay } from "@/lib/platform/course-card";
import { catalogParticipantCourseHref, resolveParticipantCourseEntries } from "@/lib/platform/participant-course-context";

const ACTIVE_ENROLLMENT_STATUSES = ["enrolled", "in_progress", "completed"];

export type TrainingCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  experienceType: string;
  admissionPolicy: string;
  card: CourseCardDisplay;
  enrollmentStatus: string | null;
  href: string;
};

export async function getTrainingCatalog(): Promise<{ items: TrainingCatalogItem[]; signedIn: boolean }> {
  await connection();
  const db = createAdminSupabaseClient();
  const user = await getPlatformUser();
  const experiences = await db.from("experiences")
    .select("id,slug,name,description,experience_type,delivery_mode,status,admission_policy,current_published_version_id,default_theme_id,card_configuration")
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
    ? db.from("experience_versions").select("id,experience_id,title,status,theme_id,course_configuration").in("id", versionIds).eq("status", "published")
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
      ? db.from("experience_enrollments").select("id,experience_id,experience_version_id,status").eq("participant_id", participant.data.id).in("experience_id", eligibleRows.map(({ item }) => item.id)).in("status", ACTIVE_ENROLLMENT_STATUSES)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (themes.error || enrollments.error) throw new Error("Unable to load Training appearance or enrollment state.");
  const enrollmentRows = enrollments.data ?? [];
  const membershipResult = participant.data ? await db.from("cohort_memberships").select("cohort_id,membership_role,status").eq("participant_id", participant.data.id).eq("status", "active") : { data: [], error: null };
  const cohortIds = (membershipResult.data ?? []).map((membership) => membership.cohort_id);
  const [cohortResult, offeringResult] = cohortIds.length ? await Promise.all([db.from("cohorts").select("id,name,experience_id,status").in("id", cohortIds), db.from("experience_offerings").select("cohort_id,experience_id,experience_version_id,status").in("cohort_id", cohortIds).eq("status", "active")]) : [{ data: [], error: null }, { data: [], error: null }];
  if (membershipResult.error || cohortResult.error || offeringResult.error) throw new Error("Unable to resolve participant Course contexts.");
  const themeById = new Map((themes.data ?? []).map((theme) => [theme.id, theme.configuration]));
  const enrollmentByExperience = new Map(enrollmentRows.map((enrollment) => [enrollment.experience_id, enrollment]));
  const configurations = eligibleRows.map(({ item }) => normalizeCourseConfiguration(publishedByExperience.get(item.id)?.course_configuration ?? item.card_configuration));
  const cardImages = await resolveResourceIds(db, configurations.flatMap((configuration) => configuration.card.image_resource_id ? [configuration.card.image_resource_id] : []));
  const items = await Promise.all(eligibleRows.map(async ({ item, href }) => {
    const version = publishedByExperience.get(item.id);
    const themeId = version?.theme_id ?? item.default_theme_id;
    const configurationSource = version?.course_configuration ?? item.card_configuration;
    const configuration = normalizeCourseConfiguration(configurationSource);
    const coverUrl = await resolveCourseCoverUrl(configurationSource, themeId ? themeById.get(themeId) : null, db);
    const cardImageUrl = configuration.card.image_resource_id ? cardImages.get(configuration.card.image_resource_id)?.url : null;
    const enrollment = enrollmentByExperience.get(item.id);
    const entries = enrollment ? resolveParticipantCourseEntries({ enrollment, experience: item, memberships: membershipResult.data ?? [], cohorts: cohortResult.data ?? [], offerings: offeringResult.data ?? [] }) : [];
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      experienceType: item.experience_type,
      admissionPolicy: item.admission_policy,
      card: resolveCourseCard({ configuration, courseTitle: version?.title || item.name, courseDescription: item.description, experienceType: item.experience_type, cardImageUrl, coverImageUrl: coverUrl }),
      enrollmentStatus: enrollment?.status ?? null,
      href: catalogParticipantCourseHref(href, entries),
    };
  }));
  return { items, signedIn: Boolean(user) };
}
