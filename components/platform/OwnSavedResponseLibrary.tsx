"use client";
import { useEffect, useRef, useState } from "react";
import type { ResponseCourse, ResponseLibraryData } from "@/lib/platform/response-library-policy";
import { SavedResponseLibrary } from "./SavedResponseLibrary";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

function Experience({ course }: { course: ResponseCourse }) {
  const [data, setData] = useState<ResponseLibraryData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  async function load() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setData(null); setError(""); setLoading(true);
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`/api/account/responses?enrollment=${encodeURIComponent(course.id)}&view=outline`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load your saved work. Please retry.");
      const next = await response.json() as ResponseLibraryData;
      if (!controller.signal.aborted) setData(next);
    } catch {
      if (request.current === controller) setError("Unable to load your saved work. Please retry.");
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }
  function close() { request.current?.abort(); request.current = null; }
  return <details className="purpose-profile-experience" onToggle={event => { if (event.target !== event.currentTarget) return; if (event.currentTarget.open) void load(); else close(); }}>
    <summary><strong>{course.title}</strong><span>View your information</span></summary>
    <div className="purpose-profile-experience-content">
      {loading && <p role="status">Loading your saved work…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => void load()}>Retry</button></p>}
      {data && <SavedResponseLibrary data={data} responseEndpoint={`/api/account/responses?enrollment=${encodeURIComponent(course.id)}`}/>}
    </div>
  </details>;
}

export function OwnSavedResponseLibrary({ data, viewerAuthUserId }: { data: ResponseLibraryData; viewerAuthUserId: string }) {
  const { authUserId, ready } = useWayfindersAuth();
  if (!ready) return <p role="status">Loading your account…</p>;
  // Display isolation only. The API independently verifies the owner every time.
  if (authUserId !== viewerAuthUserId) return <p>Reload this page to view your saved work.</p>;
  return <div className="purpose-profile-experience-list">{data.courses.length ? data.courses.map(course => <Experience course={course} key={course.id}/>) : <p className="dashboard-empty">No saved Experiences yet.</p>}</div>;
}
