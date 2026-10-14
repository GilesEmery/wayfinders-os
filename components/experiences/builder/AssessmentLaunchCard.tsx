import type { ReactNode } from "react";

export type AssessmentLaunchStatus = "not_started" | "in_progress" | "completed";

export function assessmentLaunchLabel(status: AssessmentLaunchStatus) {
  return status === "completed" ? "Review Assessment" : status === "in_progress" ? "Continue Assessment" : "Start Assessment";
}

export function AssessmentLaunchCard({ title, description, status, action, eyebrow = "PurposeOS Assessment",richTitle,richDescription }: { title: string; description: string; status: AssessmentLaunchStatus; action: ReactNode; eyebrow?: string;richTitle?:ReactNode;richDescription?:ReactNode }) {
  return <article className={`assessment-launch-card is-${status}`}>
    <div className="assessment-launch-copy"><span>{eyebrow}</span>{richTitle !== undefined ? richTitle : <h2>{title}</h2>}{richDescription !== undefined ? richDescription : <p>{description}</p>}</div>
    <strong className="assessment-launch-status">{status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : "Not started"}</strong>
    <div className="assessment-launch-action">{action}</div>
  </article>;
}
