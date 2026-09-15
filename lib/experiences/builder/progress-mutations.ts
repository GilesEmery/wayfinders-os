import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveParticipantCourse } from "./participant-runtime";
import { normalizeSectionProgress, summarizeParticipantProgress } from "./progress";
import type { BuilderSection } from "./types";
import { getBlockDefinition } from "./block-registry";

type ReadyCourse = Extract<Awaited<ReturnType<typeof resolveParticipantCourse>>, { status: "ready" }>;
type ProgressTarget = Readonly<{ moduleKey: string; lessonKey: string; section: BuilderSection }>;
type AuthorizedTarget = Readonly<{ participantId: string; enrollmentId: string; versionId: string; experienceId: string; target: ProgressTarget; structure: ReadyCourse["structure"] }>;
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function authorizeTarget(slug: string, moduleKey: string, lessonKey: string, sectionKey: string): Promise<AuthorizedTarget | null> {
  if (![slug, moduleKey, lessonKey, sectionKey].every((value) => value.length <= 120 && KEY.test(value))) return null;
  const resolution = await resolveParticipantCourse(slug);
  if (resolution.status !== "ready" || !resolution.enrollmentId) return null;
  const target = resolution.structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ moduleKey: module.module_key, lessonKey: lesson.lesson_key, section })))).find((item) => item.moduleKey === moduleKey && item.lessonKey === lessonKey && item.section.section_key === sectionKey);
  const genericSection = target && !target.section.legacy && (target.section.renderer_mode === "builder" || (target.section.renderer_mode === "hybrid" && !target.section.custom_renderer_key));
  if (!target || !genericSection) return null;
  return { participantId: resolution.participantId, enrollmentId: resolution.enrollmentId, versionId: resolution.structure.version.id, experienceId: resolution.structure.experience.id, target, structure: resolution.structure };
}

async function reconcileExperienceProgress(context: AuthorizedTarget, now: string) {
  const db = createAdminSupabaseClient();
  const progressResult = await db.from("section_progress").select("section_id,status").eq("enrollment_id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_version_id", context.versionId);
  if (progressResult.error) throw new Error(`Unable to reconcile Experience progress: ${progressResult.error.message}`);
  const states = Object.fromEntries((progressResult.data ?? []).map((row) => [row.section_id, normalizeSectionProgress(row.status)]));
  const summary = summarizeParticipantProgress(context.structure, states).experience;
  if (summary.status !== "completed") return summary;
  const experienceResult = await db.from("experience_progress").update({ status: "completed", completed_at: now, updated_at: now }).eq("enrollment_id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_id", context.experienceId).eq("experience_version_id", context.versionId).neq("status", "completed");
  if (experienceResult.error) throw new Error(`Unable to complete Experience progress: ${experienceResult.error.message}`);
  const enrollmentResult = await db.from("experience_enrollments").update({ status: "completed", completed_at: now, updated_at: now }).eq("id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_id", context.experienceId).eq("experience_version_id", context.versionId).neq("status", "completed");
  if (enrollmentResult.error) throw new Error(`Unable to complete the enrollment: ${enrollmentResult.error.message}`);
  return summary;
}

export async function recordParticipantSectionVisit(slug: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  const context = await authorizeTarget(slug, moduleKey, lessonKey, sectionKey);
  if (!context) return { ok: false, progressAvailable: false } as const;
  const db = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const experienceInsert = await db.from("experience_progress").upsert({ enrollment_id: context.enrollmentId, participant_id: context.participantId, experience_id: context.experienceId, experience_version_id: context.versionId, status: "in_progress", current_module_id: context.target.section.module_id, current_lesson_id: context.target.section.lesson_id, current_section_id: context.target.section.id, started_at: now, updated_at: now }, { onConflict: "enrollment_id", ignoreDuplicates: true });
  if (experienceInsert.error) throw new Error(`Unable to start Experience progress: ${experienceInsert.error.message}`);
  const experienceUpdate = await db.from("experience_progress").update({ current_module_id: context.target.section.module_id, current_lesson_id: context.target.section.lesson_id, current_section_id: context.target.section.id, updated_at: now }).eq("enrollment_id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_id", context.experienceId).eq("experience_version_id", context.versionId);
  if (experienceUpdate.error) throw new Error(`Unable to update the current Section: ${experienceUpdate.error.message}`);
  const experienceStart = await db.from("experience_progress").update({ status: "in_progress", updated_at: now }).eq("enrollment_id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_id", context.experienceId).eq("experience_version_id", context.versionId).neq("status", "completed");
  if (experienceStart.error) throw new Error(`Unable to start Experience progress: ${experienceStart.error.message}`);
  const sectionInsert = await db.from("section_progress").upsert({ enrollment_id: context.enrollmentId, participant_id: context.participantId, experience_version_id: context.versionId, section_id: context.target.section.id, status: context.target.section.completion_rule === "view" ? "completed" : "in_progress", resume_state: {}, started_at: now, completed_at: context.target.section.completion_rule === "view" ? now : null, updated_at: now }, { onConflict: "enrollment_id,section_id", ignoreDuplicates: true });
  if (sectionInsert.error) throw new Error(`Unable to start Section progress: ${sectionInsert.error.message}`);
  const sectionQuery = db.from("section_progress").update(context.target.section.completion_rule === "view" ? { status: "completed", completed_at: now, updated_at: now } : { status: "in_progress", updated_at: now }).eq("enrollment_id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_version_id", context.versionId).eq("section_id", context.target.section.id);
  const sectionUpdate = await sectionQuery.neq("status", "completed");
  if (sectionUpdate.error) throw new Error(`Unable to record the Section visit: ${sectionUpdate.error.message}`);
  const enrollmentTimestamp = await db.from("experience_enrollments").update({ started_at: now, updated_at: now }).eq("id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_id", context.experienceId).eq("experience_version_id", context.versionId).in("status", ["enrolled", "in_progress"]).is("started_at", null);
  if (enrollmentTimestamp.error) throw new Error(`Unable to timestamp the enrollment: ${enrollmentTimestamp.error.message}`);
  const enrollmentStart = await db.from("experience_enrollments").update({ status: "in_progress", updated_at: now }).eq("id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_id", context.experienceId).eq("experience_version_id", context.versionId).eq("status", "enrolled");
  if (enrollmentStart.error) throw new Error(`Unable to start the enrollment: ${enrollmentStart.error.message}`);
  const summary = await reconcileExperienceProgress(context, now);
  return { ok: true, progressAvailable: true, status: summary.status } as const;
}

export async function completeParticipantSection(slug: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  const visit = await recordParticipantSectionVisit(slug, moduleKey, lessonKey, sectionKey);
  if (!visit.ok) return { ok: false } as const;
  const context = await authorizeTarget(slug, moduleKey, lessonKey, sectionKey);
  if (!context || context.target.section.completion_rule !== "manual") return { ok: false } as const;
  const db = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const insertResult = await db.from("section_progress").upsert({ enrollment_id: context.enrollmentId, participant_id: context.participantId, experience_version_id: context.versionId, section_id: context.target.section.id, status: "completed", resume_state: {}, started_at: now, completed_at: now, updated_at: now }, { onConflict: "enrollment_id,section_id", ignoreDuplicates: true });
  if (insertResult.error) throw new Error(`Unable to create Section progress: ${insertResult.error.message}`);
  const result = await db.from("section_progress").update({ status: "completed", completed_at: now, updated_at: now }).eq("enrollment_id", context.enrollmentId).eq("participant_id", context.participantId).eq("experience_version_id", context.versionId).eq("section_id", context.target.section.id).neq("status", "completed");
  if (result.error) throw new Error(`Unable to complete the Section: ${result.error.message}`);
  const summary = await reconcileExperienceProgress(context, now);
  return { ok: true, status: summary.status } as const;
}

export async function completeParticipantSectionFromResponses(slug: string, moduleKey: string, lessonKey: string, sectionKey: string) {
  const context = await authorizeTarget(slug, moduleKey, lessonKey, sectionKey);
  if (!context || !["response_submitted", "all_required_blocks"].includes(context.target.section.completion_rule)) return { ok: false } as const;
  const blocks = context.target.section.layout?.columns.flatMap((column) => column.blocks).filter((block) => block.status === "active" && block.visibility === "visible" && block.requirement_level === "required") ?? [];
  const responseBlocks = blocks.filter((block) => Boolean(getBlockDefinition(block.block_type)?.response));
  if (context.target.section.completion_rule === "all_required_blocks" && blocks.some((block) => !responseBlocks.includes(block) && !["none", "view"].includes(block.completion_rule))) return { ok: true, completed: false } as const;
  if (!responseBlocks.length) return { ok: true, completed: false } as const;
  const db = createAdminSupabaseClient();
  const definitionsResult = await db.from("response_definitions").select("id,block_id,is_required").eq("experience_version_id", context.versionId).eq("lesson_id", context.target.section.lesson_id).in("block_id", responseBlocks.map((block) => block.id));
  if (definitionsResult.error) throw new Error(`Unable to evaluate response completion: ${definitionsResult.error.message}`);
  const requiredDefinitions = (definitionsResult.data ?? []).filter((definition) => definition.is_required);
  if (!requiredDefinitions.length || requiredDefinitions.length !== responseBlocks.length) return { ok: true, completed: false } as const;
  const submittedResult = await db.from("participant_responses").select("response_definition_id,status").eq("participant_id", context.participantId).eq("enrollment_id", context.enrollmentId).eq("experience_version_id", context.versionId).in("response_definition_id", requiredDefinitions.map((definition) => definition.id)).in("status", ["submitted", "finalized"]);
  if (submittedResult.error) throw new Error(`Unable to evaluate response completion: ${submittedResult.error.message}`);
  if (new Set((submittedResult.data ?? []).map((response) => response.response_definition_id)).size !== requiredDefinitions.length) return { ok: true, completed: false } as const;
  const now = new Date().toISOString();
  const upsert = await db.from("section_progress").upsert({ enrollment_id: context.enrollmentId, participant_id: context.participantId, experience_version_id: context.versionId, section_id: context.target.section.id, status: "completed", resume_state: {}, started_at: now, completed_at: now, updated_at: now }, { onConflict: "enrollment_id,section_id" });
  if (upsert.error) throw new Error(`Unable to complete the Section: ${upsert.error.message}`);
  const summary = await reconcileExperienceProgress(context, now);
  return { ok: true, completed: true, status: summary.status } as const;
}
