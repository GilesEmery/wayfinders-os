"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { markSectionCompleteAction, recordSectionVisitAction } from "@/lib/experiences/builder/progress-actions";

type RouteKeys = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null }>;

export function SectionVisitRecorder({ slug, moduleKey, lessonKey, sectionKey, cohortId, enabled }: RouteKeys & { enabled: boolean }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void recordSectionVisitAction(slug, moduleKey, lessonKey, sectionKey, cohortId)
      .then((result) => { if (active) setFailed(!result.ok); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt, cohortId, enabled, lessonKey, moduleKey, sectionKey, slug]);
  return failed ? <p role="alert">Progress could not be confirmed. <button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Retry</button></p> : null;
}

function ManualCompletionForm({ slug, moduleKey, lessonKey, sectionKey, cohortId }: RouteKeys) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true); setMessage("");
    try {
      await markSectionCompleteAction(slug, moduleKey, lessonKey, sectionKey, cohortId);
      setMessage("Completion recorded.");
    } catch { setMessage("Completion could not be confirmed. Try Mark complete again or reload to verify progress."); }
    finally { busy.current = false; setPending(false); }
  }
  return <form onSubmit={submit} className="participant-completion-control"><button disabled={pending} type="submit">{pending ? "Recording completion…" : "Mark complete"}</button>{message && <p role="status">{message}</p>}</form>;
}

export function SectionCompletionControl({ slug, moduleKey, lessonKey, sectionKey, cohortId, completionRule, status, enabled }: RouteKeys & { completionRule: string; status: string; enabled: boolean }) {
  if (!enabled) return <p className="participant-completion-note">Progress is not recorded here.</p>;
  if (status === "completed") return <p className="participant-section-complete" role="status">Complete · you can continue</p>;
  if (completionRule === "manual") return <ManualCompletionForm slug={slug} moduleKey={moduleKey} lessonKey={lessonKey} sectionKey={sectionKey} cohortId={cohortId}/>;
  if (completionRule !== "view") return <p className="participant-completion-note">Completion is recorded when this activity is finished.</p>;
  return <p className="participant-completion-note">Completion is recorded when you continue forward.</p>;
}
