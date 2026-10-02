import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authorizeParticipantCourse, effectiveDeliveryStructure } from "./participant-runtime";
import { loadCompanionRuntime } from "./companion-data";
import type { BuilderCourseStructure } from "./types";

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export async function loadParticipantCompanionUpdates(slug: string, moduleKey: string, lessonKey: string, sectionKey: string, cohortId: string | null, after: string | null) {
  if (![slug, moduleKey, lessonKey, sectionKey].every(value => value.length <= 120 && KEY.test(value))) return null;
  const context = await authorizeParticipantCourse(slug, cohortId);
  if (context.status !== "ready" || !context.access.enrollment || context.access.enrollment.experience_version_id !== context.version.id || !context.access.offering?.cohort_id) return null;
  const db = createAdminSupabaseClient();
  // Only hierarchy rows for this location, never layouts, blocks, responses or assets.
  const [modules, lessons, sections] = await Promise.all([
    db.from("experience_modules").select("*").eq("experience_version_id", context.version.id).eq("module_key", moduleKey),
    db.from("experience_lessons").select("*").eq("experience_version_id", context.version.id).eq("lesson_key", lessonKey),
    db.from("experience_sections").select("*").eq("experience_version_id", context.version.id).eq("section_key", sectionKey),
  ]);
  if (modules.error || lessons.error || sections.error) throw new Error("Unable to load Companion location.");
  const currentModule = modules.data?.[0];
  const lesson = lessons.data?.find(item => item.module_id === currentModule?.id);
  const section = sections.data?.find(item => item.lesson_id === lesson?.id && item.module_id === currentModule?.id);
  if (!currentModule || !lesson || !section) return null;
  const outline = { experience: context.experience, version: context.version, modules: [{ ...currentModule, lessons: [{ ...lesson, sections: [{ ...section, layout: null, legacy: false }] }] }] } as unknown as BuilderCourseStructure;
  const delivery = await effectiveDeliveryStructure(outline, context.access.offering, db);
  if (!delivery.modules.some(item => item.lessons.some(item => item.sections.some(item => item.id === section.id)))) return null;
  const companion = await loadCompanionRuntime({ versionId: context.version.id, offering: context.access.offering, participantId: context.participantId, enrollmentId: context.access.enrollment.id, liveLocation: { moduleId: currentModule.id, lessonId: lesson.id, sectionId: section.id }, db });
  if (!companion.hasCohortContext) return null;
  return companion.modules.map(item => ({
    id: item.id,
    configuration: item.effective_configuration,
    callSession: item.call_session,
    // A bounded window of IDs reconciles deletions. Only new/tied messages carry bodies.
    messageIds: item.chat_messages.map(message => message.id),
    messages: item.chat_messages.filter(message => !after || Date.parse(message.created_at) >= Date.parse(after)),
  }));
}
