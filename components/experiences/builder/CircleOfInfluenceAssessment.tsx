"use client";

import { useRef, useState } from "react";
import { BriefcaseBusiness, Church, GraduationCap, Heart, House, Plus, Printer, Users, Volleyball } from "lucide-react";
import { AssessmentFocusFrame } from "./AssessmentFocusFrame";
import { AssessmentLaunchCard } from "./AssessmentLaunchCard";
import { CircleOfInfluenceGuidance, CircleOfInfluenceResults } from "./CircleOfInfluenceResults";
import { saveCircleOfInfluenceDraftAction, finishCircleOfInfluenceAction } from "@/lib/experiences/builder/circle-of-influence-actions";
import { CIRCLE_AREAS, CIRCLE_REFLECTIONS, circleSaveError, normalizeCircleData, normalizeCircleEnvelope, type CircleData } from "@/lib/experiences/builder/circle-of-influence";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null };
const icons = [Heart, Users, BriefcaseBusiness, Church, Volleyball, House, GraduationCap, Plus];
export function CircleOfInfluenceAssessment({ initialData, route, preview = false, autoStart = false, returnTo }: { initialData: unknown; route: Route; preview?: boolean; autoStart?: boolean; returnTo?: string | null }) {
  const [initial] = useState(() => normalizeCircleEnvelope(initialData));
  const [data, setData] = useState<CircleData>(initial.finished?.participantMaterial ?? initial.draft);
  const [finished, setFinished] = useState(initial.finished);
  const [focused, setFocused] = useState(autoStart);
  const [view, setView] = useState<"instructions" | "editing" | "results">(initial.finished ? "results" : "instructions");
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const queue = useRef(Promise.resolve());
  const saving = useRef(false);
  const retake = useRef<string | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const area = CIRCLE_AREAS[step];
  const Icon = icons[step] ?? Users;
  const readOnly = Boolean(finished);
  const saveError = circleSaveError(data);

  function change(next: CircleData) { setData(next); setStatus("idle"); setMessage(""); }
  function draftSave(snapshot = data) {
    if (preview || finished) return queue.current;
    setStatus("saving");
    queue.current = queue.current.catch(() => {}).then(async () => {
      try { await saveCircleOfInfluenceDraftAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, snapshot); setStatus("saved"); }
      catch { setStatus("error"); setMessage("Could not save your draft. Your names remain here; please retry."); throw new Error("Draft save failed"); }
    });
    return queue.current;
  }
  function go(next: number) { if (!readOnly) void draftSave().catch(() => {}); setStep(next); setView("editing"); requestAnimationFrame(() => heading.current?.focus()); }
  async function finish() {
    if (saving.current || saveError) return;
    saving.current = true; setStatus("saving"); setMessage("");
    try {
      await queue.current.catch(() => {});
      const saved = preview ? { completedAt: new Date().toISOString() } : await finishCircleOfInfluenceAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, data, retake.current);
      setFinished({ completedAt: saved.completedAt!, sourceVersion: "circle-of-influence.v1", participantMaterial: normalizeCircleData(data) });
      setView("results"); setStatus("saved");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Could not save. Please retry."); }
    finally { saving.current = false; }
  }
  async function close() {
    if (preview) { setFocused(false); return; }
    if (!finished) { try { await draftSave(); } catch { return; } }
    window.location.assign(returnTo ?? "/dashboard");
  }
  if (!focused && !autoStart) return <AssessmentLaunchCard eyebrow="Wayfinders Assessment" title="Circle of Influence" description="Recognize the people in your everyday communities and discern how to shepherd them with care." status={finished ? "completed" : Object.values(data.people).some(names => names.some(Boolean)) ? "in_progress" : "not_started"} action={<button type="button" onClick={() => setFocused(true)}>{finished ? "View results" : "Open assessment"}</button>}/>;
  return <AssessmentFocusFrame active={focused && !autoStart} label="Circle of Influence assessment" onClose={() => { void close(); }}><section className={`circle-assessment${view === "results" ? " circle-saved-results" : ""}`}>
    {autoStart && <a className="circle-dashboard-link" href={returnTo ?? "/dashboard"}>{returnTo ? "← Back to course" : "← My dashboard"}</a>}
    <header className="circle-heading"><p>Wayfinders · Circle of Influence</p><h2 ref={heading} tabIndex={-1}>{view === "results" ? "Your circle of influence" : view === "instructions" ? "Who is your flock?" : step === 8 ? "Reflect on your influence" : area.title === "Other" ? data.otherLabel || "Other" : area.title}</h2><span>{view === "results" ? "A record of your relationships and the steps ahead." : "Know your people. Listen with care. Lead with purpose."}</span></header>
    {view === "instructions" ? <><CircleOfInfluenceGuidance/><button className="circle-primary" type="button" onClick={() => go(0)}>Begin reflection →</button></> : view === "results" && finished ? <><CircleOfInfluenceResults data={finished.participantMaterial}/><footer className="circle-actions"><button type="button" onClick={() => go(0)}>Review answers</button><button type="button" onClick={() => { retake.current = finished.completedAt; setFinished(null); setView("editing"); setStep(0); setStatus("idle"); }}>Retake assessment</button><button type="button" onClick={() => window.print()}><Printer aria-hidden="true"/> Print assessment</button><button className="circle-primary" type="button" onClick={() => void close()}>Save and close</button></footer></> : <>
      <label className="circle-mobile-progress"><span>{step + 1}</span><select aria-label="Assessment section" value={step} onChange={event => event.target.value === "instructions" ? setView("instructions") : go(Number(event.target.value))}><option value="instructions">Instructions</option>{CIRCLE_AREAS.map((item, index) => <option key={item.key} value={index}>{item.key === "other" ? data.otherLabel || "Other" : item.title}</option>)}<option value={8}>Reflect on your influence</option></select><small>of 9</small></label>
      <nav className="circle-progress" aria-label="Assessment sections"><button type="button" onClick={() => setView("instructions")}>Instructions</button>{[...CIRCLE_AREAS.map(item => item.title), "Reflection"].map((title, index) => <button key={title} type="button" aria-current={step === index ? "step" : undefined} onClick={() => go(index)}><span>{index + 1}</span>{title}</button>)}</nav>
      {step < 8 ? <section className="circle-people"><div className="circle-area-intro"><Icon aria-hidden="true"/><p>{area.description} Aim for 4–15 people where applicable. You may leave this area blank.</p></div>{area.key === "other" && <label className="circle-other-label">Name this area<input disabled={readOnly} maxLength={80} value={data.otherLabel} onChange={event => change({ ...data, otherLabel: event.target.value })} onBlur={() => { void draftSave().catch(() => {}); }}/></label>}<p>{data.people[area.key].filter(name => name.trim()).length} of 15 people added</p><div className="circle-name-grid">{Array.from({ length: Math.min(15, Math.max(4, data.people[area.key].length)) }, (_, index) => <label key={index}><span>{String(index + 1).padStart(2, "0")}</span><input aria-label={`${area.title} person ${index + 1}`} disabled={readOnly} autoComplete="off" maxLength={120} placeholder="Person’s name" value={data.people[area.key][index] ?? ""} onChange={event => { const names = [...data.people[area.key]]; while (names.length <= index) names.push(""); names[index] = event.target.value; change({ ...data, people: { ...data.people, [area.key]: names } }); }} onBlur={() => { void draftSave().catch(() => {}); }}/></label>)}</div>{!readOnly && data.people[area.key].length < 15 && <button type="button" onClick={() => { const names = [...data.people[area.key]]; while (names.length < 4) names.push(""); if (names.length < 15) names.push(""); change({ ...data, people: { ...data.people, [area.key]: names } }); }}>+ Add another person</button>}</section> : <section className="circle-reflections"><p>Think about your everyday relationships, the influence you already have, and the people God is bringing to your attention.</p>{CIRCLE_REFLECTIONS.map(({ key, label }) => <label key={key}>{label}<textarea disabled={readOnly} rows={4} maxLength={2000} value={data[key]} onChange={event => change({ ...data, [key]: event.target.value })} onBlur={() => { void draftSave().catch(() => {}); }}/></label>)}{saveError && <p>{saveError}</p>}</section>}
      <footer className="circle-edit-actions"><button type="button" disabled={step === 0} onClick={() => go(step - 1)}>← Back</button><button type="button" disabled={status === "saving"} onClick={() => void close()}>Save and close</button>{step < 8 ? <button className="circle-primary" type="button" onClick={() => go(step + 1)}>Next section →</button> : <button className="circle-primary" disabled={!readOnly && (Boolean(saveError) || status === "saving")} type="button" onClick={() => readOnly ? setView("results") : void finish()}>{readOnly ? "View results" : "Save response"}</button>}</footer>
    </>}
    <p className="circle-save-status" role={status === "error" ? "alert" : "status"}>{preview ? "Preview · nothing is saved" : message || (status === "saving" ? "Saving…" : status === "saved" ? "Assessment saved ✓" : "")}</p>
  </section></AssessmentFocusFrame>;
}
