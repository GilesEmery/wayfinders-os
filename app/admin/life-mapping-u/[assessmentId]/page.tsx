import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import {loadAdminLmuReview} from "@/lib/admin/lmu-review";
import {readableResponseFields} from "@/lib/platform/response-library-policy";
import { LMUAdminResult } from "@/components/admin/LMUAdminResult";
import { formatDate, humanize } from "@/lib/admin/format";
import { assessmentProgress, completedSectionCount, LMU_SECTION_LABELS } from "@/lib/experiences/lmu/completion";
import { LMU_SECTION_KEYS } from "@/lib/experiences/lmu/server/constants";

export default async function Page({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  const review=await loadAdminLmuReview(assessmentId);
  if(!review)notFound();
  const {identity,assessment,progress:progressRows,responses,results}=review;
  const completedCount = completedSectionCount(progressRows);
  const percentage = assessmentProgress(assessment.status, completedCount);
  const isCompleted = assessment.status === "completed";
  return <AdminShell admin={identity}>
    <p className="admin-kicker admin-lmu-kicker">Life Mapping U / Assessment</p>
    <div className="admin-assessment-heading"><div><h1>Assessment progress</h1><p className="admin-lede">{isCompleted ? "Saved Life Mapping U work and results" : "Saved responses and assessment progress"}</p></div><div className={`admin-completion-panel ${isCompleted ? "is-completed" : "is-in-progress"}`}><span>{isCompleted ? "Completed" : "In progress"}</span><strong>{percentage}%</strong><small>{completedCount} of 10 required sections</small></div></div>
    <div className="admin-detail-meta">
      <div><span>Status</span><strong>{isCompleted ? "Completed" : "In progress"}</strong></div>
      <div><span>Current module</span><strong>{isCompleted ? "—" : humanize(assessment.current_module)}</strong></div>
      <div><span>Started</span><strong>{formatDate(assessment.started_at)}</strong></div>
      <div><span>Completed</span><strong>{formatDate(assessment.completed_at)}</strong></div>
    </div>
    {!isCompleted && <aside className="admin-progress-notice"><strong>Assessment in progress</strong><p>Final Life Map results are not available until all ten required sections are completed. Section completion is shown below.</p></aside>}
    <section className="admin-sections"><h2>{isCompleted ? "Saved section work" : "Section progress"}</h2>
      {LMU_SECTION_KEYS.map((section) => {
        const state = progressRows.find((row) => row.section_key === section);
        const result = results.find((row) => row.section_key === section);
        const response=responses.find(row=>row.section_key===section);
        const answers=response?readableResponseFields(response.response_data):[];
        return <details key={section} open={isCompleted && Boolean(result)}><summary><strong>{LMU_SECTION_LABELS[section]}</strong><span className={`admin-section-status is-${state?.status ?? "not_started"}`}>{humanize(state?.status ?? "not_started")}</span></summary>{result ? <><p className="admin-finalized-date">Finalized {formatDate(result.finalized_at)}</p><LMUAdminResult value={result.result_data} /></> : <p>No finalized result yet.</p>}{state?.current_step&&<p>Saved step: {humanize(state.current_step)}</p>}{response&&<section><h3>Saved responses / draft</h3><p>Last saved {formatDate(response.updated_at)}</p><dl className="admin-structured-data">{answers.map((answer,index)=><div key={index}><dt>{answer.question}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{answer.response}</dd></div>)}</dl></section>}</details>;
      })}
    </section>
    {isCompleted && <aside className="admin-followup-note"><strong>Life Map and PDF</strong><p>The current participant Life Map and PDF require finalized response structures held by the participant experience. Saved responses and finalized section results are available above.</p></aside>}
  </AdminShell>;
}
