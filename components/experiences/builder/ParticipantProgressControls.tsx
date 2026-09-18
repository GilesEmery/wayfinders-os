"use client";

import { startTransition, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { markSectionCompleteAction, recordSectionVisitAction } from "@/lib/experiences/builder/progress-actions";

type RouteKeys = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null }>;

export function SectionVisitRecorder({ slug, moduleKey, lessonKey, sectionKey, cohortId, enabled }: RouteKeys & { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    startTransition(() => { void recordSectionVisitAction(slug, moduleKey, lessonKey, sectionKey, cohortId).catch(() => undefined); });
  }, [cohortId, enabled, lessonKey, moduleKey, sectionKey, slug]);
  return null;
}

function CompletionButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit">{pending ? "Recording completion…" : "Mark complete"}</button>;
}

export function SectionCompletionControl({ slug, moduleKey, lessonKey, sectionKey, cohortId, completionRule, status, enabled }: RouteKeys & { completionRule: string; status: string; enabled: boolean }) {
  if (!enabled) return <p className="participant-completion-note">Progress is not recorded here.</p>;
  if (status === "completed") return <p className="participant-section-complete" role="status">Complete · you can continue</p>;
  if (completionRule === "manual") return <form action={markSectionCompleteAction.bind(null, slug, moduleKey, lessonKey, sectionKey, cohortId)} className="participant-completion-control"><CompletionButton/></form>;
  if (completionRule !== "view") return <p className="participant-completion-note">Completion is recorded when this activity is finished.</p>;
  return <p className="participant-completion-note">Completion is recorded when you continue forward.</p>;
}
