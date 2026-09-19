import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmDeleteButton, LocalNoteTime } from "@/components/experiences/builder/PersonalNotesExperience";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { deletePersonalNoteAction, editPersonalNoteAction } from "@/lib/experiences/builder/companion-actions";
import { newestPersonalNotes, noteWasEdited, personalNoteLocation, searchPersonalNotes } from "@/lib/experiences/builder/personal-notes";
import { participantSectionHref, resolveParticipantCourse } from "@/lib/experiences/builder/participant-runtime";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ cohort?: string; q?: string; note?: string; notesSaved?: string; notesError?: string }>;

export default async function PersonalNotesPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const { cohort, q = "", note: focusedNote, notesSaved, notesError } = await searchParams;
  const cohortId = typeof cohort === "string" ? cohort : null;
  const result = await resolveParticipantCourse(slug, cohortId);
  if (result.status === "not_found") notFound();
  if (result.status === "custom") redirect(result.route);
  if (result.status === "signed_out") return <PlatformShell><main className="course-notes-state"><h1>Personal Notes</h1><p>Sign in to open your private Course notebook.</p></main><PlatformAuthGate/></PlatformShell>;
  if (result.status !== "ready" || !result.enrollmentId) redirect(`/experiences/${encodeURIComponent(slug)}`);
  const personalNotesModule = result.companion.modules.find((module) => module.module_type === "personal_notes" && module.availability_context === "individual" && module.scope === "course" && module.audience === "personal");
  if (!personalNotesModule) redirect(`/experiences/${encodeURIComponent(slug)}`);
  const loaded = await createAdminSupabaseClient().from("participant_personal_notes").select("*").eq("enrollment_id", result.enrollmentId).eq("participant_id", result.participantId).eq("experience_id", result.structure.experience.id).eq("companion_module_key", personalNotesModule.module_key).order("created_at", { ascending: false });
  if (loaded.error) throw new Error(`Personal Notes could not be loaded: ${loaded.error.message}`);
  const notes = searchPersonalNotes(newestPersonalNotes(loaded.data ?? []), q);
  const first = result.structure.modules[0]?.lessons[0]?.sections[0];
  const backHref = first ? participantSectionHref(slug, result.structure.modules[0].module_key, result.structure.modules[0].lessons[0].lesson_key, first.section_key, result.cohortId) : `/experiences/${encodeURIComponent(slug)}`;
  return <PlatformShell contextTitle={result.structure.version.title || result.structure.experience.name}><main className="course-notes-page"><header><div><p>Private Course notebook</p><h1>Personal Notes</h1><span>{result.structure.version.title || result.structure.experience.name}</span></div><Link href={backHref}>Back to Course</Link></header>{notesSaved && <p className="course-notes-notice" role="status">{notesSaved}</p>}{notesError && <p className="course-notes-notice is-error" role="alert">{notesError}</p>}<form className="course-notes-search"><label><span className="sr-only">Search Personal Notes</span><input type="search" name="q" defaultValue={q} placeholder="Search notes and Course locations…"/></label>{cohortId && <input type="hidden" name="cohort" value={cohortId}/>}<button>Search</button>{q && <Link href={`/experiences/${encodeURIComponent(slug)}/notes${cohortId ? `?cohort=${encodeURIComponent(cohortId)}` : ""}`}>Clear</Link>}</form><div className="course-notes-list">{notes.map((item) => <article id={`note-${item.id}`} className={focusedNote === item.id ? "is-focused" : ""} key={item.id}><header><div><strong>{personalNoteLocation(item.curriculum_context)}</strong><span><LocalNoteTime value={item.created_at}/>{noteWasEdited(item) && <> · Edited <LocalNoteTime value={item.updated_at}/></>}</span></div><details open={focusedNote === item.id}><summary>Edit</summary><form action={editPersonalNoteAction.bind(null, slug, personalNotesModule.module_key, item.id, cohortId)}><textarea name="content" required maxLength={30000} rows={6} defaultValue={item.content}/><button>Save Changes</button></form></details></header><p>{item.content}</p><ConfirmDeleteButton action={deletePersonalNoteAction.bind(null, slug, personalNotesModule.module_key, item.id, cohortId)}/></article>)}{!notes.length && <div className="course-notes-empty"><strong>{q ? "No matching notes" : "Your notebook is ready"}</strong><p>{q ? "Try another word or Course location." : "Save a note from any Course page and it will appear here."}</p></div>}</div></main></PlatformShell>;
}
