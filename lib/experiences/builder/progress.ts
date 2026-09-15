import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { BuilderCourseStructure, SectionProgressState } from "./types";

type Db = ReturnType<typeof createAdminSupabaseClient>;
type DerivedState = "not_started" | "in_progress" | "completed";

export type ProgressCounts = Readonly<{ requiredTotal: number; requiredCompleted: number; total: number; completed: number; requiredPercent: number; status: DerivedState }>;
export type ParticipantProgressSnapshot = Readonly<{ enrollmentId: string | null; currentSectionId: string | null; sections: Readonly<Record<string, SectionProgressState>>; lessons: Readonly<Record<string, DerivedState>>; modules: Readonly<Record<string, DerivedState>>; experience: ProgressCounts }>;

function derivedState(statuses: SectionProgressState[], requiredStatuses: SectionProgressState[]): DerivedState {
  if (requiredStatuses.length > 0 && requiredStatuses.every((status) => status === "completed")) return "completed";
  if (statuses.some((status) => status !== "not_started")) return "in_progress";
  return "not_started";
}

export function normalizeSectionProgress(status: string): SectionProgressState {
  return status === "in_progress" || status === "completed" || status === "skipped" ? status : "not_started";
}

export function summarizeParticipantProgress(structure: BuilderCourseStructure, sectionStates: Readonly<Record<string, SectionProgressState>>): Omit<ParticipantProgressSnapshot, "enrollmentId" | "currentSectionId"> {
  const sections = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.filter((section) => !section.legacy)));
  const state = (sectionId: string): SectionProgressState => sectionStates[sectionId] ?? "not_started";
  const required = sections.filter((section) => section.requirement_level === "required");
  const completed = sections.filter((section) => state(section.id) === "completed").length;
  const requiredCompleted = required.filter((section) => state(section.id) === "completed").length;
  const anyStarted = sections.some((section) => state(section.id) !== "not_started");
  const allRequiredComplete = required.length > 0 && requiredCompleted === required.length;
  const experience: ProgressCounts = { requiredTotal: required.length, requiredCompleted, total: sections.length, completed, requiredPercent: required.length ? Math.round(requiredCompleted / required.length * 100) : 0, status: allRequiredComplete ? "completed" : anyStarted ? "in_progress" : "not_started" };
  const lessons = Object.fromEntries(structure.modules.flatMap((module) => module.lessons.map((lesson) => {
    const trackable = lesson.sections.filter((section) => !section.legacy);
    const statuses = trackable.map((section) => state(section.id));
    const requiredStatuses = trackable.filter((section) => section.requirement_level === "required").map((section) => state(section.id));
    return [lesson.id, derivedState(statuses, requiredStatuses)];
  })));
  const modules = Object.fromEntries(structure.modules.map((module) => {
    const descendants = module.lessons.flatMap((lesson) => lesson.sections.filter((section) => !section.legacy));
    const statuses = descendants.map((section) => state(section.id));
    const requiredStatuses = descendants.filter((section) => section.requirement_level === "required").map((section) => state(section.id));
    return [module.id, derivedState(statuses, requiredStatuses)];
  }));
  return { sections: sectionStates, lessons, modules, experience };
}

export async function loadParticipantProgress({ enrollmentId, participantId, versionId, structure, db = createAdminSupabaseClient() }: { enrollmentId: string | null; participantId: string; versionId: string; structure: BuilderCourseStructure; db?: Db }): Promise<ParticipantProgressSnapshot> {
  if (!enrollmentId) return { enrollmentId: null, currentSectionId: null, ...summarizeParticipantProgress(structure, {}) };
  const [experienceResult, sectionsResult] = await Promise.all([
    db.from("experience_progress").select("current_section_id").eq("enrollment_id", enrollmentId).eq("participant_id", participantId).eq("experience_version_id", versionId).maybeSingle(),
    db.from("section_progress").select("section_id,status").eq("enrollment_id", enrollmentId).eq("participant_id", participantId).eq("experience_version_id", versionId),
  ]);
  const error = experienceResult.error || sectionsResult.error;
  if (error) throw new Error(`Unable to load participant progress: ${error.message}`);
  const states = Object.fromEntries((sectionsResult.data ?? []).map((row) => [row.section_id, normalizeSectionProgress(row.status)]));
  return { enrollmentId, currentSectionId: experienceResult.data?.current_section_id ?? null, ...summarizeParticipantProgress(structure, states) };
}
