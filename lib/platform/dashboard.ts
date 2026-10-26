import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";
import { resolveDashboardCapabilities } from "@/lib/platform/authorization";
import { normalizeCourseConfiguration } from "@/lib/experiences/builder/course-configuration";
import { courseCardImageIds, courseCardImageUrl, resolveCardImages } from "@/lib/experiences/builder/card-images";
import { resolveCourseCard } from "@/lib/platform/course-card";

import { completedJourneyRecords } from "./journey-policy";

export type DashboardData = Awaited<ReturnType<typeof getWayfinderDashboard>>;

export async function getWayfinderDashboard({ includeNetworkOverview = true }: { includeNetworkOverview?: boolean } = {}) {
  const user = await getPlatformUser();
  if (!user) return null;
  const context = await ensurePlatformProfile(user);
  if ("error" in context) return { user, error: context.error } as const;

  const db = createAdminSupabaseClient();
  const participant = context.participant;
  const [capabilities, lmu] = await Promise.all([resolveDashboardCapabilities(user.id, user.email), db.from("lmu_assessments").select("id,status,current_module,started_at,completed_at,updated_at").eq("participant_id", participant.id).order("updated_at", { ascending: false })]);
  const assessmentIds = (lmu.data ?? []).map((assessment) => assessment.id);
  const [sectionProgress, enrollments, progress, organizations, hubs, cohorts, tags, roles, preferences] = await Promise.all([
    assessmentIds.length ? db.from("lmu_section_progress").select("assessment_id,section_key,status,updated_at").in("assessment_id", assessmentIds).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
    db.from("experience_enrollments").select("id,experience_id,experience_version_id,cohort_id,status,enrolled_at,started_at,completed_at,updated_at").eq("participant_id", participant.id).in("status", ["enrolled", "in_progress", "completed"]).order("updated_at", { ascending: false }),
    db.from("experience_progress").select("enrollment_id,status,current_module_id,current_lesson_id,started_at,completed_at,updated_at").eq("participant_id", participant.id),
    db.from("organization_memberships").select("organization_id,membership_role,status,joined_at").eq("participant_id", participant.id).eq("status", "active"),
    db.from("hub_memberships").select("hub_id,membership_role,status,joined_at").eq("participant_id", participant.id).eq("status", "active"),
    db.from("cohort_memberships").select("cohort_id,membership_role,status,joined_at").eq("participant_id", participant.id).in("status", ["active", "completed"]),
    db.from("participant_tags").select("tag_id,created_at").eq("participant_id", participant.id),
    db.from("platform_role_assignments").select("role,scope_type,scope_id,status").eq("auth_user_id", user.id).eq("status", "active"),
    db.from("participant_preferences").select("default_hub_id").eq("participant_id", participant.id).maybeSingle(),
  ]);

  if (lmu.error || enrollments.error || progress.error) return { user, error: "Unable to load your Experiences. Please refresh and try again." } as const;
  const history = await db.from("experience_enrollment_version_history").select("id,enrollment_id,experience_id,experience_version_id,completion:artifact_snapshot->completion").eq("participant_id", participant.id);
  if (history.error) return { user, error: "Unable to load your Journey history. Please refresh and try again." } as const;
  const enrollmentRows = enrollments.data ?? [];
  const completionRecords = completedJourneyRecords(enrollmentRows, (history.data ?? []).map(row => ({ ...row, artifact_snapshot: { completion: row.completion } })));
  const cardEnrollments = [...enrollmentRows, ...completionRecords.map((record) => ({ id: record.id, experience_id: record.experienceId, experience_version_id: record.versionId }))];
  const experienceIds = [...new Set(cardEnrollments.map((row) => row.experience_id))];
  const versionIds = [...new Set(cardEnrollments.map((row) => row.experience_version_id).filter((id): id is string => Boolean(id)))];
  const organizationIds = (organizations.data ?? []).map((row) => row.organization_id);
  const hubIds = [...new Set([...(hubs.data ?? []).map((row) => row.hub_id), ...(roles.data ?? []).filter((role) => role.role === "hub_leader" && role.scope_type === "hub" && role.scope_id).map((role) => role.scope_id!)])];
  const cohortIds = (cohorts.data ?? []).map((row) => row.cohort_id);
  const tagIds = (tags.data ?? []).map((row) => row.tag_id);
  const [experienceCatalog, versionCatalog, organizationCatalog, hubCatalog, hubMemberCatalog, cohortCatalog, cohortOfferingCatalog, tagCatalog, networkOverview] = await Promise.all([
    experienceIds.length ? db.from("experiences").select("id,slug,name,description,experience_type,delivery_mode,accent_color,default_theme_id,card_configuration,current_published_version_id").in("id", experienceIds) : Promise.resolve({ data: [] }),
    versionIds.length ? db.from("experience_versions").select("id,experience_id,title,theme_id,course_configuration").in("id", versionIds) : Promise.resolve({ data: [] }),
    organizationIds.length ? db.from("organizations").select("id,name").in("id", organizationIds) : Promise.resolve({ data: [] }),
    hubIds.length ? db.from("hubs").select("id,name,slug,description,location").in("id", hubIds).eq("status", "active") : Promise.resolve({ data: [] }),
    includeNetworkOverview && hubIds.length ? db.from("hub_memberships").select("hub_id").in("hub_id", hubIds).eq("status", "active") : Promise.resolve({ data: [] }),
    cohortIds.length ? db.from("cohorts").select("id,name,experience_id,status").in("id", cohortIds) : Promise.resolve({ data: [] }),
    cohortIds.length ? db.from("experience_offerings").select("id,cohort_id,experience_id,experience_version_id,status,is_default").in("cohort_id", cohortIds).eq("status", "active") : Promise.resolve({ data: [] }),
    tagIds.length ? db.from("tags").select("id,name,category").in("id", tagIds) : Promise.resolve({ data: [] }),
    includeNetworkOverview && capabilities.isAdmin ? Promise.all([
      db.from("participants").select("id", { count: "exact", head: true }),
      db.from("hubs").select("id", { count: "exact", head: true }).eq("status", "active"),
      db.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "partner"),
      db.from("admin_audit_log").select("id,action,created_at").order("created_at", { ascending: false }).limit(5),
    ]) : Promise.resolve(null),
  ]);

  const experienceRows = experienceCatalog.data ?? [];
  const versionRows = versionCatalog.data ?? [];
  // Course-list presentation follows the current published card, even for
  // completed enrollments that retain an earlier curriculum version.
  const currentVersionIds = [...new Set(experienceRows.flatMap(item => item.current_published_version_id ? [item.current_published_version_id] : []))].filter(id => !versionRows.some(version => version.id === id));
  const currentVersions = currentVersionIds.length ? await db.from("experience_versions").select("id,experience_id,title,theme_id,course_configuration").in("id", currentVersionIds).eq("status", "published") : { data: [], error: null };
  if (currentVersions.error) throw new Error("Unable to load current Course Cards.");
  const presentationVersions = [...versionRows, ...(currentVersions.data ?? [])];
  const lmuExperienceResult = await db.from("experiences").select("id,name,description,experience_type,default_theme_id,card_configuration").eq("slug", "life-mapping-u").maybeSingle();
  if (lmuExperienceResult.error) throw new Error("Unable to load Life Mapping U card settings.");
  const lmuExperience = lmuExperienceResult.data;
  const experienceById = new Map(experienceRows.map((item) => [item.id, item]));
  const versionById = new Map(presentationVersions.map((item) => [item.id, item]));
  const themeIds = [...new Set([...cardEnrollments.flatMap((enrollment) => {
    const version = versionById.get(experienceById.get(enrollment.experience_id)?.current_published_version_id ?? enrollment.experience_version_id ?? "");
    const themeId = version?.theme_id ?? experienceById.get(enrollment.experience_id)?.default_theme_id;
    return themeId ? [themeId] : [];
  }), ...(lmuExperience?.default_theme_id ? [lmuExperience.default_theme_id] : [])])];
  const themeCatalog = themeIds.length ? await db.from("experience_themes").select("id,configuration").in("id", themeIds) : { data: [], error: null };
  if (themeCatalog.error) throw new Error("Unable to load Course Card themes.");
  const themeById = new Map((themeCatalog.data ?? []).map((theme) => [theme.id, theme.configuration]));
  const imageFor = (configuration: unknown, themeId: string | null | undefined) => courseCardImageIds(configuration, themeId ? themeById.get(themeId) : null);
  const imageIds = cardEnrollments.map((enrollment) => {
    const experience = experienceById.get(enrollment.experience_id);
    const version = versionById.get(experienceById.get(enrollment.experience_id)?.current_published_version_id ?? enrollment.experience_version_id ?? "");
    return imageFor(experience?.delivery_mode === "custom_code" ? experience.card_configuration : version?.course_configuration ?? experience?.card_configuration, version?.theme_id ?? experience?.default_theme_id);
  });
  const lmuImageId = lmuExperience ? imageFor(lmuExperience.card_configuration, lmuExperience.default_theme_id) : [];
  const archivedCardIds = [...presentationVersions.map(version => version.course_configuration), ...experienceRows.map(experience => experience.card_configuration), lmuExperience?.card_configuration]
    .flatMap(source => { const id = normalizeCourseConfiguration(source).card.image_resource_id; return id ? [id] : []; });
  const cardImages = await resolveCardImages(db, [...imageIds.flat(), ...lmuImageId], user.id, archivedCardIds);
  const trainingCards = Object.fromEntries(cardEnrollments.map((enrollment, index) => {
    const experience = experienceById.get(enrollment.experience_id);
    const version = versionById.get(experienceById.get(enrollment.experience_id)?.current_published_version_id ?? enrollment.experience_version_id ?? "");
    if (!experience) return [enrollment.id, null] as const;
    const configurationSource = experience.delivery_mode === "custom_code" ? experience.card_configuration : version?.course_configuration ?? experience.card_configuration;
    const configuration = normalizeCourseConfiguration(configurationSource);
    const cardImageUrl = courseCardImageUrl(cardImages, imageIds[index]);
    return [enrollment.id, resolveCourseCard({ configuration, courseTitle: version?.title || experience.name, courseDescription: experience.description, experienceType: experience.experience_type, cardImageUrl })] as const;
  }));
  const lmuConfiguration = normalizeCourseConfiguration(lmuExperience?.card_configuration);
  const lmuCardImageUrl = courseCardImageUrl(cardImages, lmuImageId);
  const lmuCard = lmuExperience ? resolveCourseCard({ configuration: lmuConfiguration, courseTitle: lmuExperience.name, courseDescription: lmuExperience.description, experienceType: lmuExperience.experience_type, cardImageUrl: lmuCardImageUrl,  }) : null;

  return {
    user,
    participant,
    lmuAssessments: lmu.data ?? [],
    lmuSectionProgress: sectionProgress.data ?? [],
    enrollments: enrollmentRows,
    progress: progress.data ?? [],
    experiences: experienceRows,
    trainingCards,
    completionRecords,
    lmuCard,
    organizationMemberships: organizations.data ?? [], organizations: organizationCatalog.data ?? [],
    hubMemberships: hubs.data ?? [], hubs: hubCatalog.data ?? [], hubMemberCatalog: hubMemberCatalog.data ?? [], defaultHubId: preferences.data?.default_hub_id ?? null,
    cohortMemberships: cohorts.data ?? [], cohorts: cohortCatalog.data ?? [], cohortOfferings: cohortOfferingCatalog.data ?? [],
    participantTags: tags.data ?? [], tags: tagCatalog.data ?? [],
    roles: roles.data ?? [],
    capabilities,
    networkOverview: networkOverview ? { wayfinders: networkOverview[0].count ?? 0, activeHubs: networkOverview[1].count ?? 0, partners: networkOverview[2].count ?? 0, recentActivity: networkOverview[3].data ?? [] } : null,
  } as const;
}
