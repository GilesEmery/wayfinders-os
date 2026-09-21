import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";
import { resolveDashboardCapabilities } from "@/lib/platform/authorization";
import { normalizeCourseConfiguration } from "@/lib/experiences/builder/course-configuration";
import { resolveCourseCoverUrl } from "@/lib/experiences/builder/course-cover";
import { resolveResourceIds } from "@/lib/experiences/builder/resource-assets";
import { resolveCourseCard } from "@/lib/platform/course-card";

export type DashboardData = Awaited<ReturnType<typeof getWayfinderDashboard>>;

export async function getWayfinderDashboard() {
  const user = await getPlatformUser();
  if (!user) return null;
  const context = await ensurePlatformProfile(user);
  if ("error" in context) return { user, error: context.error } as const;

  const db = createAdminSupabaseClient();
  const participant = context.participant;
  const capabilities = await resolveDashboardCapabilities(user.id, user.email);
  const lmu = await db.from("lmu_assessments").select("id,status,current_module,started_at,completed_at,updated_at").eq("participant_id", participant.id).order("updated_at", { ascending: false });
  const assessmentIds = (lmu.data ?? []).map((assessment) => assessment.id);
  const [sectionProgress, enrollments, progress, organizations, hubs, cohorts, tags, roles] = await Promise.all([
    assessmentIds.length ? db.from("lmu_section_progress").select("assessment_id,section_key,status,updated_at").in("assessment_id", assessmentIds).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
    db.from("experience_enrollments").select("id,experience_id,experience_version_id,cohort_id,status,enrolled_at,started_at,completed_at,updated_at").eq("participant_id", participant.id).in("status", ["enrolled", "in_progress", "completed"]).order("updated_at", { ascending: false }),
    db.from("experience_progress").select("enrollment_id,status,current_module_id,current_lesson_id,started_at,completed_at,updated_at").eq("participant_id", participant.id),
    db.from("organization_memberships").select("organization_id,membership_role,status,joined_at").eq("participant_id", participant.id).eq("status", "active"),
    db.from("hub_memberships").select("hub_id,membership_role,status,joined_at").eq("participant_id", participant.id).eq("status", "active"),
    db.from("cohort_memberships").select("cohort_id,membership_role,status,joined_at").eq("participant_id", participant.id).in("status", ["active", "completed"]),
    db.from("participant_tags").select("tag_id,created_at").eq("participant_id", participant.id),
    db.from("platform_role_assignments").select("role,scope_type,scope_id,status").eq("auth_user_id", user.id).eq("status", "active"),
  ]);

  const enrollmentRows = enrollments.data ?? [];
  const experienceIds = [...new Set(enrollmentRows.map((row) => row.experience_id))];
  const versionIds = [...new Set(enrollmentRows.map((row) => row.experience_version_id).filter((id): id is string => Boolean(id)))];
  const organizationIds = (organizations.data ?? []).map((row) => row.organization_id);
  const hubIds = [...new Set([...(hubs.data ?? []).map((row) => row.hub_id), ...(roles.data ?? []).filter((role) => role.role === "hub_leader" && role.scope_type === "hub" && role.scope_id).map((role) => role.scope_id!)])];
  const cohortIds = (cohorts.data ?? []).map((row) => row.cohort_id);
  const tagIds = (tags.data ?? []).map((row) => row.tag_id);
  const [experienceCatalog, versionCatalog, organizationCatalog, hubCatalog, cohortCatalog, cohortOfferingCatalog, tagCatalog, networkOverview] = await Promise.all([
    experienceIds.length ? db.from("experiences").select("id,slug,name,description,experience_type,delivery_mode,accent_color,default_theme_id,card_configuration").in("id", experienceIds) : Promise.resolve({ data: [] }),
    versionIds.length ? db.from("experience_versions").select("id,experience_id,title,theme_id,course_configuration").in("id", versionIds) : Promise.resolve({ data: [] }),
    organizationIds.length ? db.from("organizations").select("id,name").in("id", organizationIds) : Promise.resolve({ data: [] }),
    hubIds.length ? db.from("hubs").select("id,name,slug").in("id", hubIds) : Promise.resolve({ data: [] }),
    cohortIds.length ? db.from("cohorts").select("id,name,experience_id,status").in("id", cohortIds) : Promise.resolve({ data: [] }),
    cohortIds.length ? db.from("experience_offerings").select("id,cohort_id,experience_id,experience_version_id,status,is_default").in("cohort_id", cohortIds).eq("status", "active") : Promise.resolve({ data: [] }),
    tagIds.length ? db.from("tags").select("id,name,category").in("id", tagIds) : Promise.resolve({ data: [] }),
    capabilities.isAdmin ? Promise.all([
      db.from("participants").select("id", { count: "exact", head: true }),
      db.from("hubs").select("id", { count: "exact", head: true }).eq("status", "active"),
      db.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "partner"),
      db.from("admin_audit_log").select("id,action,created_at").order("created_at", { ascending: false }).limit(5),
    ]) : Promise.resolve(null),
  ]);

  const experienceRows = experienceCatalog.data ?? [];
  const versionRows = versionCatalog.data ?? [];
  const lmuExperienceResult = await db.from("experiences").select("id,name,description,experience_type,default_theme_id,card_configuration").eq("slug", "life-mapping-u").maybeSingle();
  if (lmuExperienceResult.error) throw new Error("Unable to load Life Mapping U card settings.");
  const lmuExperience = lmuExperienceResult.data;
  const experienceById = new Map(experienceRows.map((item) => [item.id, item]));
  const versionById = new Map(versionRows.map((item) => [item.id, item]));
  const themeIds = [...new Set([...enrollmentRows.flatMap((enrollment) => {
    const version = enrollment.experience_version_id ? versionById.get(enrollment.experience_version_id) : undefined;
    const themeId = version?.theme_id ?? experienceById.get(enrollment.experience_id)?.default_theme_id;
    return themeId ? [themeId] : [];
  }), ...(lmuExperience?.default_theme_id ? [lmuExperience.default_theme_id] : [])])];
  const themeCatalog = themeIds.length ? await db.from("experience_themes").select("id,configuration").in("id", themeIds) : { data: [], error: null };
  if (themeCatalog.error) throw new Error("Unable to load Course Card themes.");
  const themeById = new Map((themeCatalog.data ?? []).map((theme) => [theme.id, theme.configuration]));
  const configurations = [...versionRows.map((version) => normalizeCourseConfiguration(version.course_configuration)), ...experienceRows.filter((experience) => experience.delivery_mode === "custom_code").map((experience) => normalizeCourseConfiguration(experience.card_configuration)), ...(lmuExperience ? [normalizeCourseConfiguration(lmuExperience.card_configuration)] : [])];
  const cardImages = await resolveResourceIds(db, configurations.flatMap((configuration) => configuration.card.image_resource_id ? [configuration.card.image_resource_id] : []));
  const trainingCards = Object.fromEntries(await Promise.all(enrollmentRows.map(async (enrollment) => {
    const experience = experienceById.get(enrollment.experience_id);
    const version = enrollment.experience_version_id ? versionById.get(enrollment.experience_version_id) : undefined;
    if (!experience || (!version && experience.delivery_mode !== "custom_code")) return [enrollment.id, null] as const;
    const configurationSource = version?.course_configuration ?? experience.card_configuration;
    const configuration = normalizeCourseConfiguration(configurationSource);
    const themeId = version?.theme_id ?? experience.default_theme_id;
    const coverImageUrl = await resolveCourseCoverUrl(configurationSource, themeId ? themeById.get(themeId) : null, db);
    const cardImageUrl = configuration.card.image_resource_id ? cardImages.get(configuration.card.image_resource_id)?.url : null;
    return [enrollment.id, resolveCourseCard({ configuration, courseTitle: version?.title || experience.name, courseDescription: experience.description, experienceType: experience.experience_type, cardImageUrl, coverImageUrl })] as const;
  })));
  const lmuConfiguration = normalizeCourseConfiguration(lmuExperience?.card_configuration);
  const lmuCoverUrl = lmuExperience ? await resolveCourseCoverUrl(lmuExperience.card_configuration, lmuExperience.default_theme_id ? themeById.get(lmuExperience.default_theme_id) : null, db) : null;
  const lmuCardImageUrl = lmuConfiguration.card.image_resource_id ? cardImages.get(lmuConfiguration.card.image_resource_id)?.url : null;
  const lmuCard = lmuExperience ? resolveCourseCard({ configuration: lmuConfiguration, courseTitle: lmuExperience.name, courseDescription: lmuExperience.description, experienceType: lmuExperience.experience_type, cardImageUrl: lmuCardImageUrl, coverImageUrl: lmuCoverUrl }) : null;

  return {
    user,
    participant,
    lmuAssessments: lmu.data ?? [],
    lmuSectionProgress: sectionProgress.data ?? [],
    enrollments: enrollmentRows,
    progress: progress.data ?? [],
    experiences: experienceRows,
    trainingCards,
    lmuCard,
    organizationMemberships: organizations.data ?? [], organizations: organizationCatalog.data ?? [],
    hubMemberships: hubs.data ?? [], hubs: hubCatalog.data ?? [],
    cohortMemberships: cohorts.data ?? [], cohorts: cohortCatalog.data ?? [], cohortOfferings: cohortOfferingCatalog.data ?? [],
    participantTags: tags.data ?? [], tags: tagCatalog.data ?? [],
    roles: roles.data ?? [],
    capabilities,
    networkOverview: networkOverview ? { wayfinders: networkOverview[0].count ?? 0, activeHubs: networkOverview[1].count ?? 0, partners: networkOverview[2].count ?? 0, recentActivity: networkOverview[3].data ?? [] } : null,
  } as const;
}
