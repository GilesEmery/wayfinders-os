import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { LMUAdminResult } from "@/components/admin/LMUAdminResult";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { assessmentProgress, completedSectionCount, LMU_SECTION_LABELS } from "@/lib/experiences/lmu/completion";
import { LMU_SECTION_KEYS } from "@/lib/experiences/lmu/server/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page({ params }: { params: Promise<{ assessmentId: string }> }) {
  const identity = await requireAdmin();
  const { assessmentId } = await params;
  const admin = createAdminSupabaseClient();
  const [{ data: assessment }, { data: progressData }, { data: resultsData }] = await Promise.all([
    admin.from("lmu_assessments").select("id,status,current_module,started_at,completed_at,updated_at,participants!inner(first_name,email)").eq("id", assessmentId).maybeSingle(),
    admin.from("lmu_section_progress").select("section_key,status,current_step,updated_at,completed_at").eq("assessment_id", assessmentId),
    admin.from("lmu_results").select("section_key,result_data,finalized_at").eq("assessment_id", assessmentId),
  ]);
  if (!assessment) notFound();
  await audit(identity, "viewed_assessment_detail", "lmu_assessment", assessmentId);
  const progressRows = progressData ?? [];
  const results = resultsData ?? [];
  const completedCount = completedSectionCount(progressRows);
  const percentage = assessmentProgress(assessment.status, completedCount);
  const isCompleted = assessment.status === "completed";
  const person = Array.isArray(assessment.participants) ? assessment.participants[0] : assessment.participants;
  return <AdminShell admin={identity}>
    <p className="admin-kicker admin-lmu-kicker">Life Mapping U / Assessment</p>
    <div className="admin-assessment-heading"><div><h1>{person?.first_name}</h1><p className="admin-lede">{isCompleted ? "Finalized Life Mapping U results" : "Assessment in progress"}</p></div><div className={`admin-completion-panel ${isCompleted ? "is-completed" : "is-in-progress"}`}><span>{isCompleted ? "Completed" : "In progress"}</span><strong>{percentage}%</strong><small>{completedCount} of 10 required sections</small></div></div>
    <div className="admin-detail-meta">
      <div><span>Email</span><strong>{person?.email}</strong></div>
      <div><span>Status</span><strong>{isCompleted ? "Completed" : "In progress"}</strong></div>
      <div><span>Current module</span><strong>{isCompleted ? "—" : humanize(assessment.current_module)}</strong></div>
      <div><span>Started</span><strong>{formatDate(assessment.started_at)}</strong></div>
      <div><span>Completed</span><strong>{formatDate(assessment.completed_at)}</strong></div>
    </div>
    {!isCompleted && <aside className="admin-progress-notice"><strong>Assessment in progress</strong><p>Final Life Map results are not available until all ten required sections are completed. Finalized section results already available are shown below.</p></aside>}
    <section className="admin-sections"><h2>{isCompleted ? "Finalized results" : "Section progress"}</h2>
      {LMU_SECTION_KEYS.map((section) => {
        const state = progressRows.find((row) => row.section_key === section);
        const result = results.find((row) => row.section_key === section);
        return <details key={section} open={isCompleted && Boolean(result)}><summary><strong>{LMU_SECTION_LABELS[section]}</strong><span className={`admin-section-status is-${state?.status ?? "not_started"}`}>{humanize(state?.status ?? "not_started")}</span></summary>{result ? <><p className="admin-finalized-date">Finalized {formatDate(result.finalized_at)}</p><LMUAdminResult value={result.result_data} /></> : <p>No finalized result yet.</p>}</details>;
      })}
    </section>
    {isCompleted && <aside className="admin-followup-note"><strong>Life Map and PDF</strong><p>The current participant Life Map and PDF require finalized response structures held by the participant experience. They are not exposed here until a dedicated persisted-result adapter is reviewed.</p></aside>}
  </AdminShell>;
}
