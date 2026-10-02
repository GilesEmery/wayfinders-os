"use client";
import { useEffect, useRef, useState } from "react";
import type { ResponseCourse, ResponseLibraryData, SavedActivity } from "@/lib/platform/response-library-policy";

function Activity({ activity, inline = false }: { activity: SavedActivity; inline?: boolean }) {
  const tracked = activity.items.filter((item) => item.answered !== undefined);
  const body = <>{activity.location && <p className="saved-response-location">{activity.location}</p>}<p className="saved-response-meta">{activity.status.replaceAll("_", " ")}{activity.updatedAt && ` · ${new Date(activity.updatedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`}</p>{!activity.locked && tracked.length > 0 && <p className="saved-response-progress">{tracked.filter((item) => item.answered).length} / {tracked.length} questions answered</p>}{activity.locked ? <p>Open this Experience to unlock its saved responses. {activity.href && <a href={activity.href}>Open Experience →</a>}</p> : <>{Boolean(activity.results?.length) && <section className="saved-response-results"><h4>Assessment results</h4><dl className="saved-response-answers">{activity.results?.map((item, index) => <div key={index}><dt>{item.question}</dt><dd>{item.response}</dd></div>)}</dl></section>}{activity.assessment && activity.items.length > 0 && <h4>Individual responses</h4>}<dl className="saved-response-answers">{activity.items.map((item, index) => <div key={index}><dt>{item.question}</dt><dd className={item.answered === false ? "saved-response-unanswered" : undefined}>{item.response}</dd></div>)}</dl></>}</>;
  return activity.assessment && !inline ? <details className="saved-response-assessment"><summary><strong>{activity.title}</strong><span>View assessment results and responses →</span></summary>{body}</details> : <article className="saved-response-question"><h4>{activity.title}</h4>{body}</article>;
}
function LazyResponseBox({ title, assessment, loadKey, endpoint }: { title: string; assessment: boolean; loadKey: string; endpoint: string }) {
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  async function load() {
    if (activities || request.current) return;
    const abort = new AbortController();
    request.current = abort;
    setError(""); setLoading(true);
    const timeout = window.setTimeout(() => abort.abort(), 30000);
    try {
      const response = await fetch(`${endpoint}?box=${encodeURIComponent(loadKey)}`, { cache: "no-store", signal: abort.signal });
      if (!response.ok) throw new Error(response.status === 403 ? "Access is unavailable. You may need to unlock this Experience." : "Unable to load responses.");
      const result = await response.json() as SavedActivity[];
      if (mounted.current && !abort.signal.aborted) setActivities(result);
    } catch (failure) {
      if (mounted.current) setError(abort.signal.aborted ? "Responses took too long to load. Please try again." : failure instanceof Error ? failure.message : "Unable to load responses.");
    } finally {
      window.clearTimeout(timeout); request.current = null; if (mounted.current) setLoading(false);
    }
  }
  return <details className={assessment ? "saved-response-assessment" : "saved-response-questions"} onToggle={(event) => { if (event.currentTarget.open) void load(); }}><summary><strong>{title}</strong><span>{assessment ? "View assessment results and responses →" : "View questions and responses →"}</span></summary>{loading ? <p role="status">Loading responses…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></div> : activities ? activities.length ? activities.map((activity) => <Activity key={activity.id} activity={activity} inline/>) : <p>No saved responses yet.</p> : null}</details>;
}
function WeekActivities({ activities, responseEndpoint }: { activities: SavedActivity[]; responseEndpoint?: string }) {
  const questions = activities.filter((activity) => !activity.assessment);
  return <>{questions.length > 0 && (responseEndpoint && questions[0].loadKey ? <LazyResponseBox title="Questions" assessment={false} loadKey={questions[0].loadKey} endpoint={responseEndpoint}/> : <details className="saved-response-questions"><summary><strong>Questions</strong><span>View questions and responses →</span></summary>{questions.map((activity) => <Activity activity={activity} key={activity.id}/>)}</details>)}{activities.filter((activity) => activity.assessment).map((activity) => responseEndpoint && activity.loadKey ? <LazyResponseBox key={activity.id} title={activity.title} assessment loadKey={activity.loadKey} endpoint={responseEndpoint}/> : <Activity activity={activity} key={activity.id}/>)}</>;
}

export function SavedResponseLibrary({ data, collapseExperiences = false, responseEndpoint }: { data: ResponseLibraryData; collapseExperiences?: boolean; responseEndpoint?: string }) {
  if (collapseExperiences && data.courses.length) {
    const experiences = new Map<string, ResponseCourse[]>();
    for (const course of data.courses) {
      const key = course.id.split(":")[0];
      const versions = experiences.get(key) ?? [];
      // The loader puts the current enrollment version first. Purpose Profile
      // shows that version once rather than listing historical course drafts.
      if (!versions.length) versions.push(course);
      experiences.set(key, versions);
    }
    return <div className="purpose-profile-experience-list">{[...experiences.entries()].map(([id, courses]) => <details className="purpose-profile-experience" key={id}><summary><strong>{courses[0].title}</strong><span>View your information</span></summary><div className="purpose-profile-experience-content"><SavedResponseLibrary data={{ name: data.name, courses }}/></div></details>)}</div>;
  }
  return <div className="saved-response-library">{!data.courses.length && <p className="dashboard-empty">No saved course or assessment responses yet.</p>}{data.courses.map((course) => <section className="saved-response-course" key={course.id}><header><h3>{course.title}</h3><p>{course.version}</p></header>{course.locked ? <p>Unlock this Experience to view saved responses. <a href={course.href}>Open Experience →</a></p> : course.weeks.length ? course.weeks.map((week) => <details className="saved-response-week" key={week.id} open><summary><strong>{week.title}</strong><span>{week.activities.length} {week.activities.length === 1 ? "activity" : "activities"}</span></summary>{week.activities.length ? <WeekActivities activities={week.activities} responseEndpoint={responseEndpoint}/> : <p className="saved-response-empty">No saved responses for this week yet.</p>}</details>) : <p>No saved responses yet.</p>}</section>)}</div>;
}
