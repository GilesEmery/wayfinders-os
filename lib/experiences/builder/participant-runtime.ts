import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPlatformUser } from "@/lib/platform/auth";
import type { Tables } from "@/lib/supabase/database.types";
import { getExperienceStructure } from "./data";
import { loadParticipantProgress, type ParticipantProgressSnapshot } from "./progress";
import { resolveExperienceRuntime } from "./runtime";
import type { BuilderCourseStructure, ExperienceDeliveryMode } from "./types";
import { resolveCourseTemplate, type CourseTemplate } from "./course-templates";
import { resolveCourseCoverUrl, resolveCourseHeaderLogoUrl, resolveCourseLogoUrl } from "./course-cover";
import { resolveCourseAssets, type ResolvedAsset } from "./resource-assets";
import { loadCompanionRuntime, type CompanionRuntimeData } from "./companion-data";

type Db = ReturnType<typeof createAdminSupabaseClient>;
type Enrollment = Tables<"experience_enrollments">;
type Entitlement = Tables<"experience_entitlements">;
type Offering = Tables<"experience_offerings">;
export type ParticipantResponseContext = Readonly<{ definition: Tables<"response_definitions">; response: Tables<"participant_responses"> | null }>;

export type ParticipantExperienceAccess = Readonly<{
  allowed: boolean;
  source: "enrollment" | "offering_assignment" | "entitlement" | "open_offering" | "hub_membership" | "cohort_membership" | "none";
  enrollment: Enrollment | null;
  entitlement: Entitlement | null;
  offering: Offering | null;
  versionId: string | null;
}>;

export type ParticipantCourseResolution =
  | { status: "not_found" }
  | { status: "signed_out"; experience: Tables<"experiences"> }
  | { status: "custom"; route: string }
  | { status: "enrollment_available"; experience: Tables<"experiences"> }
  | { status: "denied"; experience: Tables<"experiences"> }
  | { status: "unavailable"; experience: Tables<"experiences">; reason: "runtime" | "version" | "curriculum" }
  | { status: "ready"; structure: BuilderCourseStructure; courseTemplate: CourseTemplate; themeConfiguration: unknown; coverUrl: string | null; logoUrl: string | null; headerLogoUrl: string | null; assets: { blocks: Record<string, ResolvedAsset>; heroes: Record<string, ResolvedAsset> }; companion: CompanionRuntimeData; accessSource: ParticipantExperienceAccess["source"]; participantId: string; enrollmentId: string | null; progress: ParticipantProgressSnapshot; responses: Readonly<Record<string, ParticipantResponseContext>> };

const ENROLLMENT_ACCESS = new Set(["enrolled", "in_progress", "completed"]);

function current(startsAt: string | null, expiresAt: string | null, now: number) {
  return (!startsAt || Date.parse(startsAt) <= now) && (!expiresAt || Date.parse(expiresAt) > now);
}

function newest<T extends { updated_at: string }>(rows: T[]) {
  return [...rows].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))[0] ?? null;
}

function preferredOffering(rows: Offering[]) {
  return [...rows].sort((left, right) => Number(right.is_default) - Number(left.is_default) || Date.parse(right.updated_at) - Date.parse(left.updated_at))[0] ?? null;
}

function hiddenLessonIds(settings: unknown) { if (!settings || typeof settings !== "object" || Array.isArray(settings)) return new Set<string>(); const value = (settings as Record<string, unknown>).hidden_lesson_ids; return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []); }

function filterDeliveryStructure(structure: BuilderCourseStructure, moduleRows: Array<{ source_module_id: string; sort_order: number; visibility: string }>, sectionRows: Array<{ source_section_id: string | null; sort_order: number; visibility: string }>, hiddenLessons: Set<string>): BuilderCourseStructure {
  const modules = new Map(moduleRows.map((row) => [row.source_module_id, row])); const sections = new Map(sectionRows.filter((row) => row.source_section_id).map((row) => [row.source_section_id!, row]));
  return { ...structure, modules: structure.modules.filter((module) => modules.get(module.id)?.visibility !== "hidden").map((module) => ({ ...module, lessons: module.lessons.filter((lesson) => !hiddenLessons.has(lesson.id)).map((lesson) => ({ ...lesson, sections: lesson.sections.filter((section) => sections.get(section.id)?.visibility !== "hidden").sort((a, b) => (sections.get(a.id)?.sort_order ?? a.sort_order) - (sections.get(b.id)?.sort_order ?? b.sort_order)) })) })).sort((a, b) => (modules.get(a.id)?.sort_order ?? a.sort_order) - (modules.get(b.id)?.sort_order ?? b.sort_order)) };
}

async function effectiveDeliveryStructure(structure: BuilderCourseStructure, offering: Offering | null, db: Db) {
  if (!offering) return structure;
  const plan = offering.cohort_id ? await db.from("cohort_course_plans").select("id,settings").eq("cohort_id", offering.cohort_id).eq("experience_version_id", structure.version.id).eq("status", "active").maybeSingle() : { data: null, error: null };
  if (plan.error) throw new Error(`Unable to load cohort Journey: ${plan.error.message}`);
  if (plan.data) { const [modules, sections] = await Promise.all([db.from("cohort_course_plan_modules").select("source_module_id,sort_order,visibility").eq("plan_id", plan.data.id), db.from("cohort_course_plan_sections").select("source_section_id,sort_order,visibility").eq("plan_id", plan.data.id).eq("occurrence_type", "canonical")]); const error = modules.error || sections.error; if (error) throw new Error(`Unable to load cohort Journey: ${error.message}`); return filterDeliveryStructure(structure, modules.data ?? [], sections.data ?? [], hiddenLessonIds(plan.data.settings)); }
  if (!offering.default_delivery_plan_template_id) return structure;
  const [template, modules, sections] = await Promise.all([db.from("delivery_plan_templates").select("settings").eq("id", offering.default_delivery_plan_template_id).eq("status", "active").maybeSingle(), db.from("delivery_plan_template_modules").select("source_module_id,sort_order,visibility").eq("template_id", offering.default_delivery_plan_template_id), db.from("delivery_plan_template_sections").select("source_section_id,sort_order,visibility").eq("template_id", offering.default_delivery_plan_template_id)]); const error = template.error || modules.error || sections.error; if (error) throw new Error(`Unable to load offering Journey: ${error.message}`); if (!template.data) return structure; return filterDeliveryStructure(structure, modules.data ?? [], sections.data ?? [], hiddenLessonIds(template.data.settings));
}

export async function resolveParticipantExperienceAccess({ participantId, experienceId, db = createAdminSupabaseClient() }: { participantId: string; experienceId: string; db?: Db }): Promise<ParticipantExperienceAccess> {
  const [enrollmentResult, entitlementResult, assignmentResult, hubResult, cohortResult, offeringResult] = await Promise.all([
    db.from("experience_enrollments").select("*").eq("participant_id", participantId).eq("experience_id", experienceId).in("status", [...ENROLLMENT_ACCESS]),
    db.from("experience_entitlements").select("*").eq("participant_id", participantId).eq("experience_id", experienceId).eq("status", "active"),
    db.from("participant_offering_assignments").select("*").eq("participant_id", participantId).eq("status", "active"),
    db.from("hub_memberships").select("hub_id").eq("participant_id", participantId).eq("status", "active"),
    db.from("cohort_memberships").select("cohort_id").eq("participant_id", participantId).eq("status", "active"),
    db.from("experience_offerings").select("*").eq("experience_id", experienceId).eq("status", "active"),
  ]);
  const error = enrollmentResult.error || entitlementResult.error || assignmentResult.error || hubResult.error || cohortResult.error || offeringResult.error;
  if (error) throw new Error(`Unable to resolve Experience access: ${error.message}`);

  const now = Date.now();
  const enrollment = newest((enrollmentResult.data ?? []).filter((item) => ENROLLMENT_ACCESS.has(item.status)));
  const entitlement = newest((entitlementResult.data ?? []).filter((item) => current(item.starts_at, item.expires_at, now)));
  const assignments = (assignmentResult.data ?? []).filter((item) => current(item.starts_at, item.expires_at, now));
  const assignmentIds = new Set(assignments.map((item) => item.offering_id));
  const hubs = new Set((hubResult.data ?? []).map((item) => item.hub_id));
  const cohorts = new Set((cohortResult.data ?? []).map((item) => item.cohort_id));
  const offerings = (offeringResult.data ?? []).filter((item) => current(item.starts_at, item.ends_at, now));
  const assignedOffering = preferredOffering(offerings.filter((item) => assignmentIds.has(item.id)));
  const accessibleOfferings = offerings.filter((item) => {
    const inHub = Boolean(item.hub_id && hubs.has(item.hub_id));
    const inCohort = Boolean(item.cohort_id && cohorts.has(item.cohort_id));
    if (item.access_mode === "assignment") return assignmentIds.has(item.id);
    if (item.access_mode === "entitlement") return Boolean(entitlement);
    if (item.access_mode === "hub_membership") return inHub;
    if (item.access_mode === "cohort_membership") return inCohort;
    if (item.access_mode === "open") return (!item.hub_id && !item.cohort_id) || inHub || inCohort;
    return false;
  });
  const enrollmentOffering = enrollment ? offerings.find((item) => item.id === enrollment.offering_id) ?? offerings.find((item) => Boolean(enrollment.cohort_id) && item.cohort_id === enrollment.cohort_id) ?? null : null;
  const offering = enrollmentOffering ?? assignedOffering ?? preferredOffering(accessibleOfferings);

  if (enrollment) return { allowed: true, source: "enrollment", enrollment, entitlement, offering, versionId: enrollment.experience_version_id ?? offering?.experience_version_id ?? null };
  if (assignedOffering) return { allowed: true, source: "offering_assignment", enrollment: null, entitlement, offering: assignedOffering, versionId: assignedOffering.experience_version_id };
  if (entitlement) return { allowed: true, source: "entitlement", enrollment: null, entitlement, offering, versionId: offering?.experience_version_id ?? null };
  if (offering) {
    const source = offering.access_mode === "hub_membership" ? "hub_membership" : offering.access_mode === "cohort_membership" ? "cohort_membership" : "open_offering";
    return { allowed: true, source, enrollment: null, entitlement: null, offering, versionId: offering.experience_version_id };
  }
  return { allowed: false, source: "none", enrollment: null, entitlement: null, offering: null, versionId: null };
}

async function participantFor(user: User, db: Db) {
  const result = await db.from("participants").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (result.error) throw new Error(`Unable to resolve the participant identity: ${result.error.message}`);
  return result.data;
}

export async function resolveParticipantCourse(slug: string): Promise<ParticipantCourseResolution> {
  const db = createAdminSupabaseClient();
  const [user, experienceResult] = await Promise.all([
    getPlatformUser(),
    db.from("experiences").select("*").eq("slug", slug).maybeSingle(),
  ]);
  if (experienceResult.error) throw new Error(`Unable to load the Experience: ${experienceResult.error.message}`);
  const experience = experienceResult.data;
  if (!experience) return { status: "not_found" };
  // Publication does not change the Experience lifecycle status. A Draft
  // Experience can still serve an explicitly pinned, Published enrollment;
  // inactive/archived Experiences remain unavailable to the participant route.
  if (experience.status === "inactive" || experience.status === "archived") return { status: "not_found" };
  if (experience.status === "draft" && !experience.current_published_version_id && !user) return { status: "not_found" };
  const runtime = resolveExperienceRuntime(experience.slug, experience.delivery_mode as ExperienceDeliveryMode);
  if (runtime.kind === "custom") return experience.status === "active" ? { status: "custom", route: runtime.route } : { status: "not_found" };
  if (runtime.kind === "unavailable") return { status: "unavailable", experience, reason: "runtime" };
  if (!user) return { status: "signed_out", experience };
  const participant = await participantFor(user, db);
  if (!participant) return { status: "denied", experience };
  const access = await resolveParticipantExperienceAccess({ participantId: participant.id, experienceId: experience.id, db });
  if (!access.allowed) {
    if ((experience.status === "active" || experience.status === "draft") && experience.admission_policy === "open_enrollment" && experience.current_published_version_id) return { status: "enrollment_available", experience };
    return experience.status === "draft" && !experience.current_published_version_id ? { status: "not_found" } : { status: "denied", experience };
  }
  if (experience.status === "draft" && (!access.enrollment?.experience_version_id || access.source !== "enrollment")) {
    return { status: "not_found" };
  }

  const versionId = access.versionId ?? experience.current_published_version_id;
  if (!versionId) return { status: "unavailable", experience, reason: "version" };
  const versionResult = await db.from("experience_versions").select("id,status,experience_id,theme_id").eq("id", versionId).eq("experience_id", experience.id).eq("status", "published").maybeSingle();
  if (versionResult.error) throw new Error(`Unable to resolve the published Experience Version: ${versionResult.error.message}`);
  if (!versionResult.data) return { status: "unavailable", experience, reason: "version" };

  const themeId = versionResult.data.theme_id ?? experience.default_theme_id;
  const [canonicalStructure, themeResult] = await Promise.all([
    getExperienceStructure(experience.id, versionResult.data.id, db),
    themeId ? db.from("experience_themes").select("configuration").eq("id", themeId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (themeResult.error) throw new Error(`Unable to load the Experience theme: ${themeResult.error.message}`);
  const structure = await effectiveDeliveryStructure(canonicalStructure, access.offering, db);
  // Progress foreign keys require the enrollment itself to be pinned to this Version.
  const enrollmentId = access.enrollment?.experience_version_id === versionResult.data.id ? access.enrollment.id : null;
  const progress = await loadParticipantProgress({ enrollmentId, participantId: participant.id, versionId: versionResult.data.id, structure, db });
  const blockIds = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.flatMap((section) => section.layout?.columns.flatMap((column) => column.blocks.map((block) => block.id)) ?? [])));
  const definitionResult = blockIds.length ? await db.from("response_definitions").select("*").eq("experience_version_id", versionResult.data.id).in("block_id", blockIds) : { data: [], error: null };
  if (definitionResult.error) throw new Error(`Unable to load response definitions: ${definitionResult.error.message}`);
  const definitionIds = (definitionResult.data ?? []).map((definition) => definition.id);
  const participantResponseResult = enrollmentId && definitionIds.length ? await db.from("participant_responses").select("*").eq("participant_id", participant.id).eq("enrollment_id", enrollmentId).eq("experience_version_id", versionResult.data.id).in("response_definition_id", definitionIds) : { data: [], error: null };
  if (participantResponseResult.error) throw new Error(`Unable to load participant responses: ${participantResponseResult.error.message}`);
  const participantResponses = new Map((participantResponseResult.data ?? []).map((response) => [response.response_definition_id, response]));
  const responses = Object.fromEntries((definitionResult.data ?? []).filter((definition) => definition.block_id).map((definition) => [definition.block_id!, { definition, response: participantResponses.get(definition.id) ?? null }]));
  const themeConfiguration = themeResult.data?.configuration ?? null;
  const [coverUrl, logoUrl, headerLogoUrl] = await Promise.all([resolveCourseCoverUrl(structure.version.course_configuration, themeConfiguration, db), resolveCourseLogoUrl(structure.version.course_configuration, themeConfiguration, db), resolveCourseHeaderLogoUrl(structure.version.course_configuration, themeConfiguration, db)]);
  const sections = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections));
  const [assets, companion] = await Promise.all([resolveCourseAssets(db, blockIds, sections), loadCompanionRuntime({ versionId: structure.version.id, offering: access.offering, participantId: participant.id, enrollmentId, db })]);
  return { status: "ready", structure, courseTemplate: resolveCourseTemplate(experience.delivery_mode as ExperienceDeliveryMode, structure.version.shell_mode), themeConfiguration, coverUrl, logoUrl, headerLogoUrl, assets, companion, accessSource: access.source, participantId: participant.id, enrollmentId, progress, responses };
}

export function participantSectionHref(slug: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  return `/experiences/${encodeURIComponent(slug)}/course/${encodeURIComponent(moduleKey)}/${encodeURIComponent(lessonKey)}/${encodeURIComponent(sectionKey)}`;
}
