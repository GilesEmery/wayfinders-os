import "server-only";

import { requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getExperienceStructure } from "../builder/data";
import { summarizeParticipantProgress } from "../builder/progress";
import { resolveCourseTemplate } from "../builder/course-templates";
import type { ExperienceDeliveryMode } from "../builder/types";
import type { ParticipantResponseContext } from "../builder/participant-runtime";
import { resolveCourseCoverUrl, resolveCourseHeaderLogoUrl, resolveCourseLogoUrl } from "../builder/course-cover";
import { resolveCourseAssets } from "../builder/resource-assets";
import { loadCompanionRuntime } from "../builder/companion-data";

export async function getAdminCoursePreview(experienceId: string, versionId: string, cohortId: string | null = null) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to preview this Experience.");
  const db = createAdminSupabaseClient();
  const structure = await getExperienceStructure(experienceId, versionId, db);
  if (structure.version.experience_id !== experienceId || !["draft", "published"].includes(structure.version.status)) throw new Error("This Version is unavailable for preview.");
  const themeId = structure.version.theme_id ?? structure.experience.default_theme_id;
  const theme = themeId ? await db.from("experience_themes").select("configuration").eq("id", themeId).maybeSingle() : { data: null, error: null };
  if (theme.error) throw new Error(`Unable to load preview theme: ${theme.error.message}`);
  const blockIds = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.flatMap((section) => section.layout?.columns.flatMap((column) => column.blocks.map((block) => block.id)) ?? [])));
  const definitions = blockIds.length ? await db.from("response_definitions").select("*").eq("experience_version_id", versionId).in("block_id", blockIds) : { data: [], error: null };
  if (definitions.error) throw new Error(`Unable to load preview response definitions: ${definitions.error.message}`);
  const responses: Readonly<Record<string, ParticipantResponseContext>> = Object.fromEntries((definitions.data ?? []).filter((definition) => definition.block_id).map((definition) => [definition.block_id!, { definition, response: null }]));
  const progress = { enrollmentId: null, currentSectionId: null, ...summarizeParticipantProgress(structure, {}) };
  const themeConfiguration = theme.data?.configuration ?? null;
  const [coverUrl, logoUrl, headerLogoUrl] = await Promise.all([resolveCourseCoverUrl(structure.version.course_configuration, themeConfiguration, db), resolveCourseLogoUrl(structure.version.course_configuration, themeConfiguration, db), resolveCourseHeaderLogoUrl(structure.version.course_configuration, themeConfiguration, db)]);
  const sections = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections));
  const offeringResult = await db.from("experience_offerings").select("*").eq("experience_id", experienceId).eq("status", "active").not("cohort_id", "is", null).order("name");
  const offerings = { ...offeringResult, data: (offeringResult.data ?? []).filter((offering) => offering.experience_version_id === versionId || offering.experience_version_id === null && structure.experience.current_published_version_id === versionId) };
  if (offerings.error) throw new Error(`Unable to load preview contexts: ${offerings.error.message}`);
  const cohortIds = [...new Set((offerings.data ?? []).flatMap((offering) => offering.cohort_id ? [offering.cohort_id] : []))];
  const cohorts = cohortIds.length ? await db.from("cohorts").select("id,name").in("id", cohortIds) : { data: [], error: null };
  if (cohorts.error) throw new Error(`Unable to load preview Cohort names: ${cohorts.error.message}`);
  const cohortNames = new Map((cohorts.data ?? []).map((cohort) => [cohort.id, cohort.name]));
  const selected = cohortId ? (offerings.data ?? []).filter((offering) => offering.cohort_id === cohortId) : [];
  if (cohortId && !selected.length) throw new Error("The selected Cohort is not a valid preview context for this Course Version.");
  const previewContexts = [...new Map((offerings.data ?? []).filter((offering) => offering.cohort_id).map((offering) => [offering.cohort_id!, { cohortId: offering.cohort_id!, label: cohortNames.get(offering.cohort_id!) ?? offering.name }])).values()];
  const selectedOffering = selected[0] ? { ...selected[0], name: cohortNames.get(selected[0].cohort_id!) ?? selected[0].name } : null;
  const [assets, companion] = await Promise.all([resolveCourseAssets(db, blockIds, sections), loadCompanionRuntime({ versionId, offering: selectedOffering, preview: true, db })]);
  return { structure, themeConfiguration, coverUrl, logoUrl, headerLogoUrl, assets, companion, previewContexts, courseTemplate: resolveCourseTemplate(structure.experience.delivery_mode as ExperienceDeliveryMode, structure.version.shell_mode), progress, responses };
}

export function adminPreviewHref(experienceId: string, versionId: string, moduleKey: string, lessonKey: string, sectionKey: string, cohortId: string | null = null) {
  const path = `/admin/trainings/${experienceId}/versions/${versionId}/preview/${encodeURIComponent(moduleKey)}/${encodeURIComponent(lessonKey)}/${encodeURIComponent(sectionKey)}`;
  return cohortId ? `${path}?cohort=${encodeURIComponent(cohortId)}` : path;
}
