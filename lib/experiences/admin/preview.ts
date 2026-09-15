import "server-only";

import { requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getExperienceStructure } from "../builder/data";
import { summarizeParticipantProgress } from "../builder/progress";
import { resolveCourseTemplate } from "../builder/course-templates";
import type { ExperienceDeliveryMode } from "../builder/types";
import type { ParticipantResponseContext } from "../builder/participant-runtime";

export async function getAdminCoursePreview(experienceId: string, versionId: string) {
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
  return { structure, themeConfiguration: theme.data?.configuration ?? null, courseTemplate: resolveCourseTemplate(structure.experience.delivery_mode as ExperienceDeliveryMode, structure.version.shell_mode), progress, responses };
}

export function adminPreviewHref(experienceId: string, versionId: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  return `/admin/trainings/${experienceId}/versions/${versionId}/preview/${encodeURIComponent(moduleKey)}/${encodeURIComponent(lessonKey)}/${encodeURIComponent(sectionKey)}`;
}
