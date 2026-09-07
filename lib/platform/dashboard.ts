import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";

export type DashboardData = Awaited<ReturnType<typeof getWayfinderDashboard>>;

export async function getWayfinderDashboard() {
  const user = await getPlatformUser();
  if (!user) return null;
  const context = await ensurePlatformProfile(user);
  if ("error" in context) return { user, error: context.error } as const;

  const db = createAdminSupabaseClient();
  const participant = context.participant;
  const lmu = await db.from("lmu_assessments").select("id,status,current_module,started_at,completed_at,updated_at").eq("participant_id", participant.id).order("updated_at", { ascending: false });
  const assessmentIds = (lmu.data ?? []).map((assessment) => assessment.id);
  const [sectionProgress, enrollments, progress, organizations, hubs, cohorts, tags, roles] = await Promise.all([
    assessmentIds.length ? db.from("lmu_section_progress").select("assessment_id,section_key,status,updated_at").in("assessment_id", assessmentIds).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
    db.from("experience_enrollments").select("id,experience_id,experience_version_id,cohort_id,status,enrolled_at,started_at,completed_at,updated_at").eq("participant_id", participant.id).order("updated_at", { ascending: false }),
    db.from("experience_progress").select("enrollment_id,status,current_module_id,current_lesson_id,started_at,completed_at,updated_at").eq("participant_id", participant.id),
    db.from("organization_memberships").select("organization_id,membership_role,status,joined_at").eq("participant_id", participant.id).eq("status", "active"),
    db.from("hub_memberships").select("hub_id,membership_role,status,joined_at").eq("participant_id", participant.id).eq("status", "active"),
    db.from("cohort_memberships").select("cohort_id,membership_role,status,joined_at").eq("participant_id", participant.id).in("status", ["active", "completed"]),
    db.from("participant_tags").select("tag_id,created_at").eq("participant_id", participant.id),
    db.from("platform_role_assignments").select("role,scope_type,scope_id,status").eq("auth_user_id", user.id).eq("status", "active"),
  ]);

  const enrollmentRows = enrollments.data ?? [];
  const experienceIds = [...new Set(enrollmentRows.map((row) => row.experience_id))];
  const organizationIds = (organizations.data ?? []).map((row) => row.organization_id);
  const hubIds = (hubs.data ?? []).map((row) => row.hub_id);
  const cohortIds = (cohorts.data ?? []).map((row) => row.cohort_id);
  const tagIds = (tags.data ?? []).map((row) => row.tag_id);
  const [experienceCatalog, organizationCatalog, hubCatalog, cohortCatalog, tagCatalog] = await Promise.all([
    experienceIds.length ? db.from("experiences").select("id,slug,name,experience_type,accent_color").in("id", experienceIds) : Promise.resolve({ data: [] }),
    organizationIds.length ? db.from("organizations").select("id,name").in("id", organizationIds) : Promise.resolve({ data: [] }),
    hubIds.length ? db.from("hubs").select("id,name").in("id", hubIds) : Promise.resolve({ data: [] }),
    cohortIds.length ? db.from("cohorts").select("id,name,experience_id").in("id", cohortIds) : Promise.resolve({ data: [] }),
    tagIds.length ? db.from("tags").select("id,name,category").in("id", tagIds) : Promise.resolve({ data: [] }),
  ]);

  return {
    user,
    participant,
    lmuAssessments: lmu.data ?? [],
    lmuSectionProgress: sectionProgress.data ?? [],
    enrollments: enrollmentRows,
    progress: progress.data ?? [],
    experiences: experienceCatalog.data ?? [],
    organizationMemberships: organizations.data ?? [], organizations: organizationCatalog.data ?? [],
    hubMemberships: hubs.data ?? [], hubs: hubCatalog.data ?? [],
    cohortMemberships: cohorts.data ?? [], cohorts: cohortCatalog.data ?? [],
    participantTags: tags.data ?? [], tags: tagCatalog.data ?? [],
    roles: roles.data ?? [],
  } as const;
}
