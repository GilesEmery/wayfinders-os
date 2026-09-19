import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Tables } from "../../supabase/database.types.ts";
import { newestPersonalNotes, noteWasEdited, personalNoteContextSnapshot, personalNoteLocation, personalNoteOwnershipFilter, searchPersonalNotes } from "./personal-notes.ts";

type Note = Tables<"participant_personal_notes">;
const note = (values: Partial<Note> = {}): Note => ({ id: "note-a", enrollment_id: "enrollment", participant_id: "participant", experience_id: "course", companion_module_key: "notebook", source_experience_version_id: "version", source_companion_module_id: "module", content: "Questions create room", curriculum_context: { module_key: "week-3", module_title: "Week 3", lesson_key: "listening", lesson_title: "Listening Well", section_key: "questions", section_title: "Asking Better Questions" }, created_at: "2026-09-19T18:32:00.000Z", updated_at: "2026-09-19T18:32:00.000Z", ...values });

test("Personal Notes use canonical ownership without Cohort identity", () => {
  assert.deepEqual(personalNoteOwnershipFilter("enrollment", "participant", "course", "notebook"), { enrollmentId: "enrollment", participantId: "participant", experienceId: "course", companionModuleKey: "notebook" });
});

test("newest notes are first and distinct entries remain distinct", () => {
  const notes = newestPersonalNotes([note(), note({ id: "note-b", content: "Second save", created_at: "2026-09-20T18:32:00.000Z", updated_at: "2026-09-20T18:32:00.000Z" })]);
  assert.deepEqual(notes.map((item) => item.id), ["note-b", "note-a"]);
});

test("search matches content and title snapshots case-insensitively", () => {
  const notes = [note()];
  assert.equal(searchPersonalNotes(notes, "QUESTIONS").length, 1);
  assert.equal(searchPersonalNotes(notes, "listening well").length, 1);
  assert.equal(searchPersonalNotes(notes, "asking better").length, 1);
  assert.equal(searchPersonalNotes(notes, "another course").length, 0);
});

test("location display and snapshots preserve supplied curriculum values", () => {
  assert.equal(personalNoteLocation(note().curriculum_context), "Week 3 · Listening Well");
  assert.deepEqual(personalNoteContextSnapshot({ module_key: "week-3", module_title: "Week 3" }), { module_key: "week-3", module_title: "Week 3" });
});

test("edited state compares canonical timestamps", () => {
  assert.equal(noteWasEdited(note()), false);
  assert.equal(noteWasEdited(note({ updated_at: "2026-09-21T12:14:00.000Z" })), true);
});

test("missing source provenance does not hide a canonical note", () => {
  const withoutSource = note({ source_companion_module_id: null, source_experience_version_id: null });
  assert.equal(newestPersonalNotes([withoutSource]).length, 1);
  assert.equal(searchPersonalNotes([withoutSource], "questions")[0]?.id, withoutSource.id);
});

test("publish-forward does not copy or delete V2 Personal Notes", () => {
  const migration = readFileSync("supabase/migrations/20260917211108_atomic_publish_forward.sql", "utf8");
  assert.equal(migration.includes("participant_personal_notes"), false);
});
