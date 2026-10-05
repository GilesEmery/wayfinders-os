"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SavedResponseLibrary } from "@/components/platform/SavedResponseLibrary";
import type { ResponseLibraryData } from "@/lib/platform/response-library-policy";
import type { JourneyRecord, WayfinderJourneyData } from "@/lib/admin/wayfinders/journey-types";

function useJourneyRequest<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const loaded = useRef(false);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);
  const load = useCallback(async () => {
    if (loaded.current || controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true); setError("");
    const timeout = window.setTimeout(() => abort.abort(), 30000);
    try {
      const response = await fetch(url, { cache: "no-store", signal: abort.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load Journey records.");
      if (!abort.signal.aborted) { loaded.current = true; setData(body as T); }
    } catch (failure) {
      if (controller.current === abort) setError(abort.signal.aborted ? "Loading took too long. Please try again." : failure instanceof Error ? failure.message : "Unable to load Journey records.");
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === abort) { controller.current = null; setLoading(false); }
    }
  }, [url]);
  return { data, error, loading, load };
}
function RequestState({ error, loading, retry }: { error: string; loading: boolean; retry: () => void }) {
  return loading ? <p role="status">Loading Journey records…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="admin-secondary-link" onClick={retry}>Try again</button></div> : null;
}
function date(value: string) { return new Date(value).toLocaleDateString("en-US", { timeZone: "UTC" }); }
function JourneyEntry({ record, endpoint }: { record: JourneyRecord; endpoint: string }) {
  const params = new URLSearchParams(record.enrollmentId ? { enrollmentId: record.enrollmentId, ...(record.versionId ? { versionId: record.versionId } : {}) } : { assessmentId: record.id });
  const request = useJourneyRequest<ResponseLibraryData>(`${endpoint}?${params}`);
  return <details className="crm-journey-record" onToggle={event => { if (event.currentTarget.open) void request.load(); }}>
    <summary><div><strong>{record.title}</strong><span>{record.status.replaceAll("_", " ")}{record.historical ? " · Previous completion" : ""}{record.cohort ? ` · ${record.cohort}` : ""}</span><span>{record.completedAt ? `Completed ${date(record.completedAt)}` : `Started / enrolled ${date(record.enrolledAt)}`}</span></div><span>View results &amp; responses</span></summary>
    <div className="crm-journey-record-content"><RequestState error={request.error} loading={request.loading} retry={() => void request.load()}/>{request.data && <SavedResponseLibrary data={request.data}/>}</div>
  </details>;
}
export function WayfinderJourney({ participantId }: { participantId: string }) {
  const endpoint = `/api/admin/wayfinders/${encodeURIComponent(participantId)}/journey`;
  const request = useJourneyRequest<WayfinderJourneyData>(endpoint);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const { load } = request;
  useEffect(() => {
    const open = () => { if (disclosure.current) disclosure.current.open = true; void load(); };
    const hash = () => { if (window.location.hash === "#journey") open(); };
    const click = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest('a[href="#journey"]')) open(); };
    hash();
    window.addEventListener("hashchange", hash);
    document.addEventListener("click", click);
    return () => { window.removeEventListener("hashchange", hash); document.removeEventListener("click", click); };
  }, [load]);
  const groups = [
    { title: "Courses in progress", records: request.data?.records.filter(record => record.kind === "course" && ["enrolled", "in_progress"].includes(record.status)) ?? [] },
    { title: "Completed courses", records: request.data?.records.filter(record => record.kind === "course" && record.status === "completed") ?? [] },
    { title: "Assessments & guided experiences", records: request.data?.records.filter(record => record.kind === "assessment") ?? [] },
    { title: "Other course records", records: request.data?.records.filter(record => record.kind === "course" && !["enrolled", "in_progress", "completed"].includes(record.status)) ?? [] },
  ];
  return <section className="crm-workspace-section" id="journey"><header><p className="admin-kicker">Journey</p><h2>Courses, assessments, and responses</h2><p>View this person’s enrolled and completed courses, assessment results, and saved responses.</p></header>
    <details className="crm-journey-disclosure" ref={disclosure} onToggle={event => { if (event.currentTarget.open) void load(); }}><summary>Open Journey records</summary><RequestState error={request.error} loading={request.loading} retry={() => void load()}/>{request.data && (request.data.records.length ? groups.filter(group => group.records.length).map(group => <section key={group.title}><h3>{group.title}</h3>{group.records.map(record => <JourneyEntry key={record.id} record={record} endpoint={endpoint}/>)}</section>) : <p>No courses or assessments have been started yet.</p>)}</details>
  </section>;
}
