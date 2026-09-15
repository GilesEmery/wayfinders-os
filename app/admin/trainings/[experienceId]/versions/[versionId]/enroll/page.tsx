import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { canAdminExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enrollAction } from "./actions";

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
    db.from("participants").select("id,full_name,email").order("full_name").limit(250),
    db.from("experience_enrollments").select("id,participant_id,status,experience_version_id,enrolled_at").eq("experience_id", route.experienceId).eq("experience_version_id", route.versionId).order("enrolled_at", { ascending: false }),
  ]);
  if (!experience.data || !version.data || participants.error || enrollments.error) notFound();
  const names = new Map((participants.data ?? []).map((participant) => [participant.id, participant.full_name || participant.email || "Unnamed Wayfinder"]));
  return <AdminShell admin={admin}><AdminPageHeader eyebrow="Version enrollment" title={experience.data.name} description={`Version ${version.data.version_label} · ${version.data.title}`} action={<Link className="admin-secondary-link" href={`/admin/trainings/${route.experienceId}/versions/${route.versionId}`}>Back to Version</Link>}/>{notice.error && <p className="admin-form-message" role="alert">{notice.error}</p>}{notice.enrolled && <p className="admin-form-message is-success">Participant enrolled and pinned to this Version.</p>}{notice.reused && <p className="admin-form-message is-success">The existing active Version-pinned enrollment was reused.</p>}<section className="admin-panel"><p className="admin-kicker">Single enrollment</p><h2>Enroll a Wayfinder</h2>{version.data.status !== "published" ? <p>Enrollment becomes available after this Version is Published.</p> : <form action={enrollAction.bind(null, route.experienceId, route.versionId)} className="admin-inline-form"><label>Wayfinder<select name="participant_id" required defaultValue=""><option value="" disabled>Select a Wayfinder</option>{(participants.data ?? []).map((participant) => <option value={participant.id} key={participant.id}>{participant.full_name || participant.email || "Unnamed Wayfinder"}{participant.email ? ` · ${participant.email}` : ""}</option>)}</select></label><button className="admin-primary" type="submit">Enroll in Version {version.data.version_label}</button></form>}</section><section className="admin-panel"><p className="admin-kicker">Current state</p><h2>Version-pinned enrollments</h2><div className="admin-table-wrap"><table><thead><tr><th>Wayfinder</th><th>Status</th><th>Enrolled</th></tr></thead><tbody>{(enrollments.data ?? []).map((item) => <tr key={item.id}><td>{names.get(item.participant_id) ?? item.participant_id}</td><td>{item.status}</td><td>{new Date(item.enrolled_at).toLocaleDateString()}</td></tr>)}{!enrollments.data?.length && <tr><td colSpan={3}>No participants are pinned to this Version.</td></tr>}</tbody></table></div></section></AdminShell>;
}
