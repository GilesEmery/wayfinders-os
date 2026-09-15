"use client";

import { startTransition, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { markSectionCompleteAction, recordSectionVisitAction } from "@/lib/experiences/builder/progress-actions";

type RouteKeys = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string }>;

export function SectionVisitRecorder({ slug, moduleKey, lessonKey, sectionKey, enabled }: RouteKeys & { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    startTransition(() => { void recordSectionVisitAction(slug, moduleKey, lessonKey, sectionKey).catch(() => undefined); });
  }, [enabled, lessonKey, moduleKey, sectionKey, slug]);
  return null;
}

function CompletionButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit">{pending ? "Recording completion…" : "Mark section complete"}</button>;
}

export function SectionCompletionControl({ slug, moduleKey, lessonKey, sectionKey, completionRule, status, enabled }: RouteKeys & { completionRule: string; status: string; enabled: boolean }) {
  if (!enabled) return <p className="participant-completion-note">Progress is not recorded for this Section.</p>;
  if (status === "completed") return <p className="participant-section-complete" role="status">Section complete</p>;
  if (completionRule === "manual") return <form action={markSectionCompleteAction.bind(null, slug, moduleKey, lessonKey, sectionKey)} className="participant-completion-control"><CompletionButton/></form>;
  if (completionRule !== "view") return <p className="participant-completion-note">Completion is recorded when this activity is finished.</p>;
  return <p className="participant-completion-note">Completion is recorded when this Section is opened.</p>;
}
