"use client";

import Link from "next/link";
import { AssessmentAnswerChoices } from "./AssessmentAnswerChoices";
import { useRef, useState } from "react";
import { FIVE_VOICES_QUESTIONS, FIVE_VOICES_SCALE, fiveVoicesResults, fiveVoicesComplete, normalizeFiveVoicesEnvelope, normalizeFiveVoicesOrder, shuffleFiveVoicesQuestions } from "@/lib/experiences/builder/five-voices";
import { saveFiveVoicesAssessmentAction } from "@/lib/experiences/builder/five-voices-actions";
import { AssessmentLaunchCard, assessmentLaunchLabel } from "./AssessmentLaunchCard";
import { AssessmentFocusFrame } from "./AssessmentFocusFrame";
import { NativeAssessmentShell } from "./NativeAssessmentShell";
import { FiveVoicesResults } from "./FiveVoicesResults";
import { FiveVoicesIntroduction } from "./FiveVoicesIntroduction";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null };
export function FiveVoicesAssessment({ initialData, route, preview = false, autoStart = false, initialOrder, returnTo }: { initialData: unknown; route: Route; preview?: boolean; autoStart?: boolean; initialOrder?: string[]; returnTo?: string | null }) {
  const initial = normalizeFiveVoicesEnvelope(initialData);
  const [answers, setAnswers] = useState(initial.answers);
  const [order, setOrder] = useState(() => Object.keys(initial.answers).length ? initial.order : normalizeFiveVoicesOrder(initialOrder));
  const [finished, setFinished] = useState(initial.finished);
  const [history, setHistory] = useState(initial.history);
  const [submitting, setSubmitting] = useState(false);
  const [retakeOf, setRetakeOf] = useState(initial.retakeOf);
  const [focused, setFocused] = useState(autoStart);
  const [page, setPage] = useState(0);
  const [started, setStarted] = useState(() => Object.keys(initial.answers).length > 0);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const busy = useRef(false);
  const queue = useRef(Promise.resolve());
  const heading = useRef<HTMLHeadingElement>(null);
  const showingResults = Boolean(finished && !retakeOf);
  const count = Object.keys(answers).length;
  const status = finished ? "completed" : count ? "in_progress" : "not_started";
  const questions = order.slice(page * 5, page * 5 + 5).map(key => FIVE_VOICES_QUESTIONS.find(q => q.key === key)!);

  const missingSections = [0, 1, 2, 3, 4].map(index => ({ index, missing: order.slice(index * 5, index * 5 + 5).filter(key => answers[key] === undefined) })).filter(section => section.missing.length);
  function open() {
    if (!count && !finished) setOrder(shuffleFiveVoicesQuestions());
    setFocused(true);
  }
  function change(key: string, value: number) {
    if (busy.current) return;
    const next = { ...answers, [key]: value };
    setPageError("");
    setAnswers(next);
    if (preview) return;
    setState("saving");
    queue.current = queue.current.then(async () => {
      try {
        await saveFiveVoicesAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, { answers: next, order }, false, retakeOf ?? undefined);
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
      const saved = preview ? { completedAt: new Date().toISOString() } : await saveFiveVoicesAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, { answers, order }, finalize, retakeOf ?? undefined);
      if (finalize) {
        const snapshot = normalizeFiveVoicesEnvelope({ finished: { completedAt: saved.completedAt, answers, order } }).finished;
        if (!snapshot) throw new Error("We couldn’t save your results. Please try again.");
        if (finished) setHistory(previous => [...previous, finished]);
        setFinished(snapshot); setRetakeOf(null);
      }
      setState("saved");
    } catch { setState("error"); setMessage("We couldn’t save your answers. Please try again."); }
    finally { busy.current = false; setSubmitting(false); }
  }
  function navigate(next: number) {
    if (busy.current || next === page) return;
    const missing = order.slice(page * 5, page * 5 + 5).filter(key => answers[key] === undefined);
    if (missing.length) {
      setPageError(`Answer all five questions on this page before moving on. ${missing.length} ${missing.length === 1 ? 'answer is' : 'answers are'} still missing.`);
      document.getElementById(`five-voices-${route.blockKey}-${missing[0]}-1`)?.focus();
      return;
    }
    setPageError(""); setPage(next); heading.current?.focus();
  }
  if (!focused) return <AssessmentLaunchCard eyebrow="PurposeOS Assessment" title="Five Voices Assessment" description="Explore how you communicate, collaborate, and contribute in a group." status={status} action={<button type="button" onClick={open}>{assessmentLaunchLabel(status)}</button>}/>;

  return <AssessmentFocusFrame active={!autoStart} label="Five Voices Assessment" onClose={() => setFocused(false)}><NativeAssessmentShell showReturn={autoStart} returnTo={returnTo}><section className="apest-assessment ethos-assessment" aria-label="Five Voices Assessment">
    <header className="ethos-intro"><div className="ethos-intro-meta"><p>Five Voices Assessment</p><span>{showingResults ? "Your results" : "25 statements"}</span></div><h2 ref={heading} tabIndex={-1}>{showingResults ? "Your voice profile" : started ? "How do you naturally communicate?" : "Discover your voice"}</h2><p>{showingResults ? "Explore how your voices work together." : started ? "Choose how often each statement describes you." : "Nurturer · Creative · Guardian · Connector · Pioneer"}</p></header>
    {showingResults && finished ? <><FiveVoicesResults answers={finished.answers}/>{history.length > 0 && <details><summary>Previous results ({history.length})</summary>{history.map(snapshot => <article key={snapshot.completedAt}><h3>{new Date(snapshot.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</h3><p>{fiveVoicesResults(snapshot.answers)?.ranked.map(({ domain, label }) => `${label}: ${domain.title}`).join(" · ")}</p></article>)}</details>}<footer className="ethos-saved-actions"><Link className="button" href="/my-journey">My Journey</Link><button type="button" onClick={() => { setRetakeOf(finished.completedAt); setAnswers({}); setOrder(shuffleFiveVoicesQuestions()); setPage(0); setStarted(false); setState("idle"); }}>Retake assessment</button><button type="button" onClick={() => window.print()}>Print results</button></footer></> : !started ? <FiveVoicesIntroduction onBegin={() => { setStarted(true); heading.current?.focus(); }}/> : <>
      <div className="apest-progress"><span>{count} of 25 answered</span><progress aria-label="Answered statements" max={25} value={count}/></div>
      <section className={`assessment-completion-notice ${count === 25 ? 'is-ready' : ''}`} aria-label="Assessment completion">
        <p role="status" aria-live="polite"><strong>{count === 25 ? "All 25 questions answered — ready to complete." : `${25-count} ${25-count === 1 ? 'question still needs' : 'questions still need'} an answer.`}</strong></p>
        <p>{count === 25 ? "Choose Complete assessment & see results to finish and save your profile." : "Your assessment is not complete yet. Answer all 25 questions to receive your results. Saving for later saves a draft; it does not complete the assessment."}</p>
        {missingSections.length > 0 && <div className="assessment-missing-sections" aria-label="Sections with unanswered questions">{missingSections.map(section => <button type="button" key={section.index} disabled={submitting} onClick={() => navigate(section.index)}>Section {section.index+1}: {section.missing.length} unanswered</button>)}</div>}
      </section>
      <nav className="apest-pages" aria-label="Assessment progress">{[0, 1, 2, 3, 4].map(index => {
        const complete = order.slice(index * 5, index * 5 + 5).every(key => Boolean(answers[key]));
        return <button key={index} type="button" className={complete ? "is-complete" : ""} aria-label={`Section ${index + 1}, ${order.slice(index * 5, index * 5 + 5).filter(key => answers[key] !== undefined).length} of 5 answered${complete ? ", complete" : ""}`} aria-current={page === index ? "step" : undefined} onClick={() => navigate(index)}><span className="apest-progress-dot" aria-hidden="true">{complete ? "✓" : ""}</span><span className="apest-progress-label">Section {index + 1}</span></button>;
      })}</nav>
      <p className="assessment-page-requirement">Answer all five questions on this page before moving to another section.</p>
      {pageError && <p className="assessment-page-error" role="alert">{pageError}</p>}
      <div className="ethos-questions">{questions.map((question, index) => {
        const value = answers[question.key];
        return <fieldset className={value ? "is-answered" : ""} key={question.key}><legend>{page * 5 + index + 1}. {question.text}</legend><p className="assessment-answer-status">{value ? FIVE_VOICES_SCALE.find(option => option.value === value)?.label : "Not answered — choose one response"}</p><AssessmentAnswerChoices id={`five-voices-${route.blockKey}-${question.key}`} value={value} options={FIVE_VOICES_SCALE} disabled={submitting} onChange={choice => change(question.key, choice)}/></fieldset>;
      })}</div>
      <footer className="apest-actions"><button type="button" disabled={page === 0 || (submitting)} onClick={() => navigate(page - 1)}>← Back</button><button type="button" disabled={submitting} onClick={() => void save(false)}>Save for later</button>{page < 4 ? <button type="button" className="is-primary" disabled={submitting} onClick={() => navigate(page + 1)}>Next →</button> : <button type="button" className="is-primary" disabled={!fiveVoicesComplete(answers) || submitting} onClick={() => void save(true)}>{submitting ? "Completing…" : "Complete assessment & see results"}</button>}</footer>
      {page < 4 && fiveVoicesComplete(answers) && <div className="apest-actions"><button type="button" className="is-primary" disabled={submitting} onClick={() => void save(true)}>{submitting ? "Completing…" : "Complete assessment & see results"}</button></div>}
      {!preview && <p role="status" aria-live="polite">{state === "saving" ? "Saving your answers…" : state === "saved" ? "Your answers are saved." : ""}</p>}{state === "error" && <p role="alert">{message}</p>}
    </>}
  </section></NativeAssessmentShell></AssessmentFocusFrame>;
}
