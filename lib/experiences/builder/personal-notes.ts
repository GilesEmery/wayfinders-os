import type { Json, Tables } from "@/lib/supabase/database.types";
import { curriculumContext, curriculumLocationLabel, type CurriculumContext } from "./companion-live.ts";

export type PersonalNote = Tables<"participant_personal_notes">;

export function personalNoteContext(value: Json): CurriculumContext {
  return curriculumContext(value);
}

export function personalNoteLocation(value: Json) {
  const context = personalNoteContext(value);
  const label = curriculumLocationLabel(value);
  return label.primary || label.secondary || context.module_title || context.lesson_title || context.section_title || "Course note";
}

export function noteWasEdited(note: Pick<PersonalNote, "created_at" | "updated_at">) {
  return Math.abs(Date.parse(note.updated_at) - Date.parse(note.created_at)) > 1000;
}

export function newestPersonalNotes(notes: PersonalNote[], limit?: number) {
  const sorted = [...notes].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at) || right.id.localeCompare(left.id));
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function searchPersonalNotes(notes: PersonalNote[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return notes;
  return notes.filter((note) => {
    const context = personalNoteContext(note.curriculum_context);
    return [note.content, context.module_title, context.lesson_title, context.section_title]
      .some((value) => value?.toLocaleLowerCase().includes(needle));
  });
}

export function personalNoteContextSnapshot(input: CurriculumContext): Json {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value === "string" && value.length > 0));
}

// Individual is a data-ownership context, not a curriculum-scope rule. Reads
// are always canonical-enrollment reads and never include a Cohort identifier.
export function personalNoteOwnershipFilter(enrollmentId: string, participantId: string, experienceId: string, companionModuleKey: string) {
  return { enrollmentId, participantId, experienceId, companionModuleKey } as const;
}
