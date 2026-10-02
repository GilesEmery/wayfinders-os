"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResponseLibraryData } from "@/lib/platform/response-library-policy";
import { SavedResponseLibrary } from "./SavedResponseLibrary";

function MemberResponsesDialog({ cohortId, participantId, name, onClose }: { cohortId: string; participantId: string; name: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<ResponseLibraryData | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setError("Saved responses are taking too long to load. Please try again.");
      abort.abort();
    }, 30000);
    fetch(`/api/cohorts/${encodeURIComponent(cohortId)}/members/${encodeURIComponent(participantId)}/responses?view=outline`, { cache: "no-store", signal: abort.signal }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 403 ? "You do not have access to these responses, or the course needs to be unlocked." : "Unable to load saved responses.");
      return response.json() as Promise<ResponseLibraryData>;
    }).then((result) => { if (active && !abort.signal.aborted) setData(result); }).catch((failure: unknown) => { if (active && !abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to load saved responses."); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); abort.abort(); };
  }, [cohortId, participantId, retry]);
  return createPortal(<dialog ref={dialog} className="cohort-response-dialog" aria-label={`${name} · Saved course responses`} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="cohort-response-dialog-content"><header><div><p>Purpose Profile · Cohort work</p><h2>{data?.name ?? name}</h2></div><button autoFocus className="cohort-response-close" aria-label="Close saved responses" type="button" onClick={onClose}>×</button></header><div className="cohort-response-dialog-body">{error ? <div role="alert"><p>{error}</p><button className="button button-primary" type="button" onClick={() => { setError(""); setData(null); setRetry((value) => value + 1); }}>Try again</button></div> : data ? <SavedResponseLibrary data={data} responseEndpoint={`/api/cohorts/${encodeURIComponent(cohortId)}/members/${encodeURIComponent(participantId)}/responses`}/> : <p role="status">Loading saved responses…</p>}</div></div></dialog>, document.body);
}
export function CohortMemberResponsesButton({ cohortId, participantId, name }: { cohortId: string; participantId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const previouslyOpen = useRef(false);
  useEffect(() => {
    if (previouslyOpen.current && !open) trigger.current?.focus();
    previouslyOpen.current = open;
  }, [open]);
  return <><button ref={trigger} className="cohort-member-response-name" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>{name}</button>{open && <MemberResponsesDialog key={`${cohortId}:${participantId}`} cohortId={cohortId} participantId={participantId} name={name} onClose={() => setOpen(false)}/>}</>;
}
