import type { ReactNode } from "react";

export type AssessmentLaunchStatus = "not_started" | "in_progress" | "completed";

export function assessmentLaunchLabel(status: AssessmentLaunchStatus) {
  return status === "completed" ? "Review Assessment" : status === "in_progress" ? "Continue Assessment" : "Start Assessment";
}

export function AssessmentLaunchCard({ title, description, status, action, eyebrow = "PurposeOS Assessment" }: { title: string; description: string; status: AssessmentLaunchStatus; action: ReactNode; eyebrow?: string }) {
  return <article className={`assessment-launch-card is-${status}`}>
    <div className="assessment-launch-copy"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
    <strong className="assessment-launch-status">{status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : "Not started"}</strong>
    <div className="assessment-launch-action">{action}</div>
  </article>;
}
