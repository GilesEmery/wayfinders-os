"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { APEST_QUESTIONS, APEST_SCALE, apestResults, apestComplete, normalizeApestEnvelope, normalizeApestOrder, shuffleApestQuestions } from "@/lib/experiences/builder/apest";
import { saveApestAssessmentAction } from "@/lib/experiences/builder/apest-actions";
import { AssessmentLaunchCard, assessmentLaunchLabel } from "./AssessmentLaunchCard";
import { AssessmentFocusFrame } from "./AssessmentFocusFrame";
import { NativeAssessmentShell } from "./NativeAssessmentShell";
import { ApestResults } from "./ApestResults";
import { ApestIntroduction } from "./ApestIntroduction";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null };
export function ApestAssessment({ initialData, route, preview = false, autoStart = false, initialOrder, returnTo }: { initialData: unknown; route: Route; preview?: boolean; autoStart?: boolean; initialOrder?: string[]; returnTo?: string | null }) {
  const initial = normalizeApestEnvelope(initialData);
  const [answers, setAnswers] = useState(initial.answers);
  const [order, setOrder] = useState(() => Object.keys(initial.answers).length ? initial.order : normalizeApestOrder(initialOrder));
  const [finished, setFinished] = useState(initial.finished);
  const [history, setHistory] = useState(initial.history);
  const [submitting, setSubmitting] = useState(false);
  const [retakeOf, setRetakeOf] = useState(initial.retakeOf);
  const [focused, setFocused] = useState(autoStart);
  const [page, setPage] = useState(0);
  const [started, setStarted] = useState(() => Object.keys(initial.answers).length > 0);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const queue = useRef(Promise.resolve());
  const heading = useRef<HTMLHeadingElement>(null);
  const showingResults = Boolean(finished && !retakeOf);
  const count = Object.keys(answers).length;
  const status = finished ? "completed" : count ? "in_progress" : "not_started";
  const questions = order.slice(page * 5, page * 5 + 5).map(key => APEST_QUESTIONS.find(q => q.key === key)!);

  function open() {
    if (!count && !finished) setOrder(shuffleApestQuestions());
    setFocused(true);
  }
  function change(key: string, value: number) {
    if (busy.current) return;
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (preview) return;
    setState("saving");
    queue.current = queue.current.then(async () => {
      try {
        await saveApestAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, { answers: next, order }, false, retakeOf ?? undefined);
        setState("saved");
      } catch {
        setState("error"); setMessage("We couldn’t save your answers. Please try again.");
      }
    });
  }
  async function save(finalize: boolean) {
    if (busy.current) return;
    busy.current = true; setSubmitting(true); setState("saving"); setMessage("");
    try {
      await queue.current;
      const saved = preview ? { completedAt: new Date().toISOString() } : await saveApestAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, { answers, order }, finalize, retakeOf ?? undefined);
      if (finalize) {
        const snapshot = normalizeApestEnvelope({ finished: { completedAt: saved.completedAt, answers, order } }).finished;
        if (!snapshot) throw new Error("We couldn’t save your results. Please try again.");
        if (finished) setHistory(previous => [...previous, finished]);
        setFinished(snapshot); setRetakeOf(null);
      }
      setState("saved");
    } catch { setState("error"); setMessage("We couldn’t save your answers. Please try again."); }
    finally { busy.current = false; setSubmitting(false); }
  }
  function navigate(next: number) { setPage(next); heading.current?.focus(); }
  if (!focused) return <AssessmentLaunchCard eyebrow="PurposeOS Assessment" title="APEST Assessment" description="Explore five ways you contribute: Apostle, Prophet, Evangelist, Shepherd, and Teacher." status={status} action={<button type="button" onClick={open}>{assessmentLaunchLabel(status)}</button>}/>;

  return <AssessmentFocusFrame active={!autoStart} label="APEST Assessment" onClose={() => setFocused(false)}><NativeAssessmentShell showReturn={autoStart} returnTo={returnTo}><section className="apest-assessment ethos-assessment" aria-label="APEST Assessment">
    <header className="ethos-intro"><div className="ethos-intro-meta"><p>APEST Assessment</p><span>{showingResults ? "Your results" : "25 statements"}</span></div><h2 ref={heading} tabIndex={-1}>{showingResults ? "Your APEST profile" : started ? "How do you naturally contribute?" : "Discover how you’re gifted to contribute"}</h2><p>{showingResults ? "Discover how your gifts work together." : started ? "Choose how often each statement describes you." : "Apostle · Prophet · Evangelist · Shepherd · Teacher"}</p></header>
    {showingResults && finished ? <><ApestResults answers={finished.answers}/>{history.length > 0 && <details><summary>Previous results ({history.length})</summary>{history.map(snapshot => <article key={snapshot.completedAt}><h3>{new Date(snapshot.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</h3><p>{apestResults(snapshot.answers)?.ranked.map(({ domain, label }) => `${label}: ${domain.title}`).join(" · ")}</p></article>)}</details>}<footer className="ethos-saved-actions"><Link className="button" href="/my-journey">My Journey</Link><button type="button" onClick={() => { setRetakeOf(finished.completedAt); setAnswers({}); setOrder(shuffleApestQuestions()); setPage(0); setStarted(false); setState("idle"); }}>Retake assessment</button><button type="button" onClick={() => window.print()}>Print results</button></footer></> : !started ? <ApestIntroduction onBegin={() => { setStarted(true); heading.current?.focus(); }}/> : <>
      <div className="apest-progress"><span>{count} of 25 answered</span><progress aria-label="Answered statements" max={25} value={count}/></div>
      <nav className="apest-pages" aria-label="Assessment progress">{[0, 1, 2, 3, 4].map(index => {
        const complete = order.slice(index * 5, index * 5 + 5).every(key => Boolean(answers[key]));
        return <button key={index} type="button" className={complete ? "is-complete" : ""} aria-label={`Section ${index + 1}${complete ? ", complete" : ""}`} aria-current={page === index ? "step" : undefined} onClick={() => navigate(index)}><span className="apest-progress-dot" aria-hidden="true">{complete ? "✓" : ""}</span><span className="apest-progress-label">Section {index + 1}</span></button>;
      })}</nav>
      <div className="ethos-questions">{questions.map((question, index) => {
        const value = answers[question.key];
        return <fieldset className={value ? "is-answered" : ""} key={question.key}><legend>{page * 5 + index + 1}. {question.text}</legend><label className="apest-slider-label" htmlFor={`apest-${question.key}`}>{value ? APEST_SCALE.find(option => option.value === value)?.label : "Choose a response"}</label><input id={`apest-${question.key}`} type="range" min={1} max={3} step={0.5} value={value ?? 2} disabled={submitting} aria-label={question.text} aria-valuetext={value ? APEST_SCALE.find(option => option.value === value)?.label : "Not answered; choose a response"} onChange={event => change(question.key, Number(event.target.value))}/><div className="apest-stops">{APEST_SCALE.map(option => <button key={option.value} type="button" aria-label={option.label} aria-pressed={value === option.value} disabled={submitting} onClick={() => change(question.key, option.value)}><span aria-hidden="true" className="apest-stop-dot"/><small>{option.label}</small></button>)}</div></fieldset>;
      })}</div>
      <footer className="apest-actions"><button type="button" disabled={page === 0 || (submitting)} onClick={() => navigate(page - 1)}>← Back</button><button type="button" disabled={submitting} onClick={() => void save(false)}>Save for later</button>{page < 4 ? <button type="button" className="is-primary" onClick={() => navigate(page + 1)}>Next →</button> : <button type="button" className="is-primary" disabled={!apestComplete(answers) || submitting} onClick={() => void save(true)}>See my results</button>}</footer>
      {!preview && <p role="status" aria-live="polite">{state === "saving" ? "Saving your answers…" : state === "saved" ? "Your answers are saved." : ""}</p>}{state === "error" && <p role="alert">{message}</p>}
    </>}
  </section></NativeAssessmentShell></AssessmentFocusFrame>;
}
