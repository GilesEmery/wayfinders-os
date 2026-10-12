import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { auditSecurityEvent, requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { assessmentProgress, completedSectionCount } from "@/lib/experiences/lmu/completion";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const identity = await requireAdmin();
  const { q = "", status = "all" } = await searchParams;
  const admin = createAdminSupabaseClient();
  const [assessmentRead, progressRead] = await Promise.all([
    admin.from("lmu_assessments").select("id,participant_id,status,current_module,started_at,completed_at,updated_at", { count: "exact" }).order("updated_at", { ascending: false }),
    admin.from("lmu_section_progress").select("assessment_id,section_key,status", { count: "exact" }),
  ]);
  if (assessmentRead.error || progressRead.error) throw new Error("Assessment progress is unavailable.");
  if ([assessmentRead, progressRead].some(result => !Array.isArray(result.data) || result.count !== result.data.length)) throw new Error("Assessment progress is incomplete. Please retry.");
  const assessmentData = assessmentRead.data, progressData = progressRead.data;
  const allAssessments = [...new Map((assessmentData ?? []).map((assessment) => [assessment.id, assessment])).values()];
  const progressByAssessment = new Map<string, Array<{ section_key: string; status: string }>>();
  for (const row of progressData ?? []) {
    const current = progressByAssessment.get(row.assessment_id) ?? [];
    current.push(row);
    progressByAssessment.set(row.assessment_id, current);
  }
  const completed = allAssessments.filter((row) => row.status === "completed").length;
  const inProgress = allAssessments.filter((row) => row.status === "in_progress").length;

  const search = q.trim().toLocaleLowerCase();
  const data = allAssessments.filter((row) => {
    const matchesStatus = status === "all" || row.status === status;
    const matchesSearch = !search || row.participant_id.toLocaleLowerCase().includes(search) || row.id.toLocaleLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });
  await auditSecurityEvent(identity, "lmu.operational_progress_viewed", "lmu_assessment", undefined, { recordCount: data.length });
  return <AdminShell admin={identity}>
    <p className="admin-kicker admin-lmu-kicker">Life Mapping U</p>
    <h1>Operational assessment progress</h1>
    <div className="admin-metrics">
      <div><span>Total assessments</span><strong>{allAssessments.length}</strong></div>
      <div><span>In progress</span><strong>{inProgress}</strong></div>
      <div><span>Completed</span><strong>{completed}</strong></div>

    </div>
    <form className="admin-filter">
      <label>Search<input name="q" defaultValue={q} placeholder="Participant or assessment ID" /></label>
      <label>Status<select name="status" defaultValue={status}><option value="all">All</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></label>
      <button className="admin-primary">APPLY</button>
    </form>
    <div className="admin-table-wrap"><table><thead><tr><th>Participant</th><th>Progress</th><th>Status</th><th>Current module</th><th>Started</th><th>Last updated</th><th>Completed</th><th>Actions</th></tr></thead><tbody>
      {data.map((row) => {
        const completedCount = completedSectionCount(progressByAssessment.get(row.id) ?? []);
        const progress = assessmentProgress(row.status, completedCount);
        return <tr key={row.id}><td>{row.participant_id}</td><td><strong>{progress}%</strong><small className="admin-progress-detail">{completedCount} of 10 sections</small></td><td><span className={`admin-status is-${row.status}`}>{humanize(row.status)}</span></td><td>{row.status === "completed" ? "—" : humanize(row.current_module)}</td><td>{formatDate(row.started_at)}</td><td>{formatDate(row.updated_at)}</td><td>{formatDate(row.completed_at)}</td><td><Link href={`/admin/assessments/life-mapping-u/${row.id}`}>View progress</Link></td></tr>;
      })}
      {!data.length && <tr><td colSpan={8}>No assessments match this view.</td></tr>}
    </tbody></table></div>
  </AdminShell>;
}
