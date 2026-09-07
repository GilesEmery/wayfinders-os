import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { assessmentProgress, completedSectionCount } from "@/lib/experiences/lmu/completion";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const identity = await requireAdmin();
  const { q = "", status = "all" } = await searchParams;
  const admin = createAdminSupabaseClient();
  const [{ data: assessmentData }, { data: participantData }, { data: progressData }] = await Promise.all([
    admin.from("lmu_assessments").select("id,participant_id,status,current_module,started_at,completed_at,updated_at").order("updated_at", { ascending: false }),
    admin.from("participants").select("id,first_name,email"),
    admin.from("lmu_section_progress").select("assessment_id,section_key,status"),
  ]);
  const allAssessments = [...new Map((assessmentData ?? []).map((assessment) => [assessment.id, assessment])).values()];
  const participantsById = new Map((participantData ?? []).map((participant) => [participant.id, participant]));
  const progressByAssessment = new Map<string, Array<{ section_key: string; status: string }>>();
  for (const row of progressData ?? []) {
    const current = progressByAssessment.get(row.assessment_id) ?? [];
    current.push(row);
    progressByAssessment.set(row.assessment_id, current);
  }
  const completed = allAssessments.filter((row) => row.status === "completed").length;
  const inProgress = allAssessments.filter((row) => row.status === "in_progress").length;
  const completionRate = allAssessments.length ? Math.round((completed / allAssessments.length) * 100) : 0;
  const search = q.trim().toLocaleLowerCase();
  const data = allAssessments.filter((row) => {
    const person = participantsById.get(row.participant_id);
    const matchesStatus = status === "all" || row.status === status;
    const matchesSearch = !search || person?.first_name.toLocaleLowerCase().includes(search) || person?.email.toLocaleLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });
  return <AdminShell admin={identity}>
    <p className="admin-kicker admin-lmu-kicker">Life Mapping U</p>
    <h1>Participant results</h1>
    <div className="admin-metrics">
      <div><span>Total participants</span><strong>{allAssessments.length}</strong></div>
      <div><span>In progress</span><strong>{inProgress}</strong></div>
      <div><span>Completed</span><strong>{completed}</strong></div>
      <div><span>Completion rate</span><strong>{completionRate}%</strong></div>
    </div>
    <form className="admin-filter">
      <label>Search<input name="q" defaultValue={q} placeholder="Name or email" /></label>
      <label>Status<select name="status" defaultValue={status}><option value="all">All</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></label>
      <button className="admin-primary">APPLY</button>
    </form>
    <div className="admin-table-wrap"><table><thead><tr><th>Participant</th><th>Email</th><th>Progress</th><th>Status</th><th>Current module</th><th>Started</th><th>Last updated</th><th>Completed</th><th>Actions</th></tr></thead><tbody>
      {data.map((row) => {
        const person = participantsById.get(row.participant_id);
        const completedCount = completedSectionCount(progressByAssessment.get(row.id) ?? []);
        const progress = assessmentProgress(row.status, completedCount);
        return <tr key={row.id}><td>{person?.first_name}</td><td>{person?.email}</td><td><strong>{progress}%</strong><small className="admin-progress-detail">{completedCount} of 10 sections</small></td><td><span className={`admin-status is-${row.status}`}>{humanize(row.status)}</span></td><td>{row.status === "completed" ? "—" : humanize(row.current_module)}</td><td>{formatDate(row.started_at)}</td><td>{formatDate(row.updated_at)}</td><td>{formatDate(row.completed_at)}</td><td><Link href={`/admin/assessments/life-mapping-u/${row.id}`}>{row.status === "completed" ? "View results" : "View progress"}</Link></td></tr>;
      })}
      {!data.length && <tr><td colSpan={9}>No assessments match this view.</td></tr>}
    </tbody></table></div>
  </AdminShell>;
}
