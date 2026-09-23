import Link from "next/link";
import { notFound } from "next/navigation";
import { LearnerPicker } from "@/components/admin/LearnerPicker";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { canAdminExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enrollAction, removeEnrollmentAction } from "./actions";

export default async function EnrollmentPage({ params, searchParams }: { params: Promise<{ experienceId: string; versionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const route = await params;
  const notice = await searchParams;
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canAdminExperienceById(authorization, route.experienceId)) notFound();
  const db = createAdminSupabaseClient();
  const [experience, version, participants, enrollments] = await Promise.all([
    db.from("experiences").select("id,name").eq("id", route.experienceId).maybeSingle(),
    db.from("experience_versions").select("id,title,version_label,status").eq("id", route.versionId).eq("experience_id", route.experienceId).maybeSingle(),
    db.from("participants").select("id,full_name,email,auth_user_id").order("full_name").limit(100),
    db.from("experience_enrollments").select("id,participant_id,status,experience_version_id,enrolled_at").eq("experience_id", route.experienceId).eq("experience_version_id", route.versionId).in("status", ["invited", "enrolled", "in_progress", "completed"]).order("enrolled_at", { ascending: false }),
  ]);
  if (!experience.data || !version.data || participants.error || enrollments.error) notFound();
  const enrollmentParticipantIds = [...new Set((enrollments.data ?? []).map((item) => item.participant_id))];
  const enrolledPeople = enrollmentParticipantIds.length
    ? await db.from("participants").select("id,full_name,email,auth_user_id").in("id", enrollmentParticipantIds)
    : { data: [], error: null };
  if (enrolledPeople.error) notFound();
  const people = new Map([...(participants.data ?? []), ...(enrolledPeople.data ?? [])].map((participant) => [participant.id, participant]));

  return <AdminShell admin={admin}>
    <AdminPageHeader eyebrow="Manage Learners" title={experience.data.name} description="Enroll existing Wayfinders in the current Published Course. Draft curriculum is never assigned." action={<Link className="admin-secondary-link" href={`/admin/trainings/${route.experienceId}`}>Back to Course Overview</Link>}/>
    {notice.error && <p className="admin-form-message" role="alert">{notice.error}</p>}
    {notice.enrolled && <p className="admin-form-message is-success">Learner enrolled in the Published Course.</p>}
    {notice.reused && <p className="admin-form-message is-success">This learner already has an active enrollment in this Published Course.</p>}
    {notice.removed && <p className="admin-form-message is-success">Learner removed from this Course. Their historical progress was retained.</p>}
    <section className="admin-panel">
      <p className="admin-kicker">Add one learner</p><h2>Search existing Wayfinders</h2>
      <p className="admin-field-note">Search checks all Wayfinders by name or email. People without an activated account may be enrolled, but they must activate their account before signing in.</p>
      {version.data.status !== "published" ? <p>Enrollment becomes available after this Course is Published.</p> : <form action={enrollAction.bind(null, route.experienceId, route.versionId)} className="admin-inline-form"><LearnerPicker experienceId={route.experienceId} learners={participants.data ?? []}/><button className="admin-primary" type="submit">Add Learner</button></form>}
    </section>
    <section className="admin-panel"><p className="admin-kicker">Current learners</p><h2>Published Course enrollments</h2><div className="admin-table-wrap"><table><thead><tr><th>Wayfinder</th><th>Account</th><th>Enrollment</th><th>Enrolled</th><th>Actions</th></tr></thead><tbody>{(enrollments.data ?? []).map((item) => { const person = people.get(item.participant_id); const name = person?.full_name || person?.email || item.participant_id; return <tr key={item.id}><td>{name}</td><td>{person?.auth_user_id ? "Account active" : "Not activated"}</td><td>{item.status}</td><td>{new Date(item.enrolled_at).toLocaleDateString()}</td><td><details className="enrollment-remove"><summary>Remove</summary><form action={removeEnrollmentAction.bind(null, route.experienceId, route.versionId, item.id)}><p>Remove {name} from this Course? Their historical progress will be retained.</p><button name="confirm_remove" value="yes" type="submit">Confirm removal</button></form></details></td></tr>; })}{!enrollments.data?.length && <tr><td colSpan={5}>No learners are enrolled in this Published Course yet.</td></tr>}</tbody></table></div></section>
  </AdminShell>;
}
