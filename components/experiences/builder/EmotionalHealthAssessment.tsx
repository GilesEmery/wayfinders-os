"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { EMOTIONAL_HEALTH_QUESTIONS, EMOTIONAL_HEALTH_SCALE, emotionalHealthResults, emotionalHealthComplete, normalizeEmotionalHealthEnvelope, normalizeEmotionalHealthOrder, shuffleEmotionalHealthQuestions } from "@/lib/experiences/builder/emotional-health";
import { saveEmotionalHealthAssessmentAction } from "@/lib/experiences/builder/emotional-health-actions";
import { AssessmentLaunchCard, assessmentLaunchLabel } from "./AssessmentLaunchCard";
import { AssessmentFocusFrame } from "./AssessmentFocusFrame";
import { NativeAssessmentShell } from "./NativeAssessmentShell";
import { EmotionalHealthResults } from "./EmotionalHealthResults";
import { EmotionalHealthIntroduction } from "./EmotionalHealthIntroduction";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null };
export function EmotionalHealthAssessment({ initialData, route, preview = false, autoStart = false, initialOrder, returnTo }: { initialData: unknown; route: Route; preview?: boolean; autoStart?: boolean; initialOrder?: string[]; returnTo?: string | null }) {
  const initial = normalizeEmotionalHealthEnvelope(initialData);
  const [answers, setAnswers] = useState(initial.answers);
  const [order, setOrder] = useState(() => Object.keys(initial.answers).length ? initial.order : normalizeEmotionalHealthOrder(initialOrder));
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
  const revision = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const showingResults = Boolean(finished && !retakeOf);
  const count = Object.keys(answers).length;
  const status = finished ? "completed" : count ? "in_progress" : "not_started";
  const questions = order.slice(page * 5, page * 5 + 5).map(key => EMOTIONAL_HEALTH_QUESTIONS.find(q => q.key === key)!);

  function open() {
    if (!count && !finished) setOrder(shuffleEmotionalHealthQuestions());
    setFocused(true);
  }
  function change(key: string, value: number) {
    if (busy.current) return;
    const next = { ...answers, [key]: value };
    const editRevision = ++revision.current;
    setAnswers(next);
    if (preview) return;
    setState("saving");
    queue.current = queue.current.then(async () => {
      try {
        await saveEmotionalHealthAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, { answers: next, order }, false, retakeOf ?? undefined);
        if (editRevision === revision.current) setState("saved");
      } catch {
        if (editRevision === revision.current) { setState("error"); setMessage("We couldn’t save your answers. Please try again."); }
      }
    });
  }
  async function save(finalize: boolean) {
    if (busy.current) return;
    busy.current = true; setSubmitting(true); setState("saving"); setMessage("");
    try {
      await queue.current;
      const saved = preview ? { completedAt: new Date().toISOString() } : await saveEmotionalHealthAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, { answers, order }, finalize, retakeOf ?? undefined);
      if (finalize) {
        const snapshot = normalizeEmotionalHealthEnvelope({ finished: { completedAt: saved.completedAt, answers, order } }).finished;
        if (!snapshot) throw new Error("We couldn’t save your results. Please try again.");
        if (finished) setHistory(previous => [...previous, finished]);
        setFinished(snapshot); setRetakeOf(null);
      }
      setState("saved");
    } catch { setState("error"); setMessage("We couldn’t save your answers. Please try again."); }
    finally { busy.current = false; setSubmitting(false); }
  }
  function navigate(next: number) { if (busy.current) return; setPage(next); heading.current?.focus(); }
  if (!focused) return <AssessmentLaunchCard eyebrow="PurposeOS Assessment" title="Emotional Health Assessment" description="Reflect on self-awareness, self-management, social awareness, and relationship management." status={status} action={<button type="button" onClick={open}>{assessmentLaunchLabel(status)}</button>}/>;

  return <AssessmentFocusFrame active={!autoStart} label="Emotional Health Assessment" onClose={() => setFocused(false)}><NativeAssessmentShell showReturn={autoStart} returnTo={returnTo}><section className="emotional-health-assessment apest-assessment ethos-assessment" aria-label="Emotional Health Assessment">
    <header className="ethos-intro"><div className="ethos-intro-meta"><p>Emotional Health Assessment</p><span>{showingResults ? "Your results" : "40 statements"}</span></div><h2 ref={heading} tabIndex={-1}>{showingResults ? "Your emotional health profile" : started ? "Reflect on your everyday experience" : "Grow in awareness and connection"}</h2><p>{showingResults ? "Notice strengths and invitations for growth." : started ? "Choose how strongly you agree with each statement." : "Self-Awareness · Self-Management · Social Awareness · Relationship Management"}</p></header>
    {showingResults && finished ? <><EmotionalHealthResults answers={finished.answers}/>{history.length > 0 && <details><summary>Previous results ({history.length})</summary>{history.map(snapshot => <article key={snapshot.completedAt}><h3>{new Date(snapshot.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</h3><p>{emotionalHealthResults(snapshot.answers)?.scores.map(({ domain, score, band }) => `${domain.title}: ${score}/50 · ${band.title}`).join(" · ")}</p></article>)}</details>}<footer className="ethos-saved-actions"><Link className="button" href="/my-journey">My Journey</Link><button type="button" onClick={() => { setRetakeOf(finished.completedAt); setAnswers({}); setOrder(shuffleEmotionalHealthQuestions()); setPage(0); setStarted(false); setState("idle"); }}>Retake assessment</button><button type="button" onClick={() => window.print()}>Print results</button></footer></> : !started ? <EmotionalHealthIntroduction onBegin={() => { setStarted(true); heading.current?.focus(); }}/> : <>
      <div className="apest-progress"><span>{count} of 40 answered</span><progress aria-label="Answered statements" max={40} value={count}/></div>
      <nav className="apest-pages" aria-label="Assessment progress">{[0, 1, 2, 3, 4, 5, 6, 7].map(index => {
        const complete = order.slice(index * 5, index * 5 + 5).every(key => Boolean(answers[key]));
        return <button key={index} type="button" disabled={submitting} className={complete ? "is-complete" : ""} aria-label={`Page ${index + 1}${complete ? ", complete" : ""}`} aria-current={page === index ? "step" : undefined} onClick={() => navigate(index)}><span className="apest-progress-dot" aria-hidden="true">{complete ? "✓" : ""}</span><span className="apest-progress-label">Page {index + 1}</span></button>;
      })}</nav>
      <div className="ethos-questions">{questions.map((question, index) => {
        const value = answers[question.key];
        return <fieldset className={value ? "is-answered" : ""} key={question.key}><legend>{page * 5 + index + 1}. {question.text}</legend><label className="apest-slider-label" htmlFor={`emotional-health-${question.key}`}>{value ? EMOTIONAL_HEALTH_SCALE.find(option => option.value === value)?.label : "Choose a response"}</label><input id={`emotional-health-${question.key}`} type="range" min={1} max={5} step={1} value={value ?? 3} disabled={submitting} aria-label={question.text} aria-valuetext={value ? EMOTIONAL_HEALTH_SCALE.find(option => option.value === value)?.label : "Not answered; choose a response"} onChange={event => change(question.key, Number(event.target.value))}/><div className="apest-stops">{EMOTIONAL_HEALTH_SCALE.map(option => <button key={option.value} type="button" aria-label={option.label} aria-pressed={value === option.value} disabled={submitting} onClick={() => change(question.key, option.value)}><span aria-hidden="true" className="apest-stop-dot"/><small>{option.label}</small></button>)}</div></fieldset>;
      })}</div>
      <footer className="apest-actions"><button type="button" disabled={page === 0 || (submitting)} onClick={() => navigate(page - 1)}>← Back</button><button type="button" disabled={submitting} onClick={() => void save(false)}>Save for later</button>{page < 7 ? <button type="button" className="is-primary" disabled={submitting} onClick={() => navigate(page + 1)}>Next →</button> : <button type="button" className="is-primary" disabled={!emotionalHealthComplete(answers) || submitting} onClick={() => void save(true)}>See my results</button>}</footer>
      {!preview && <p role="status" aria-live="polite">{state === "saving" ? "Saving your answers…" : state === "saved" ? "Your answers are saved." : ""}</p>}{state === "error" && <p role="alert">{message}</p>}
    </>}
  </section></NativeAssessmentShell></AssessmentFocusFrame>;
}
