"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveLaunchingWayfindersHubAssessmentAction } from "@/lib/experiences/builder/launching-wayfinders-hub-assessment-actions";
import { AssessmentLaunchCard, assessmentLaunchLabel, type AssessmentLaunchStatus } from "./AssessmentLaunchCard";
import { AssessmentFocusFrame } from "./AssessmentFocusFrame";
import { LAUNCHING_HUB_QUESTIONS, LAUNCHING_HUB_SCALE, firstIncompleteLaunchingHubQuestion, launchingHubComplete, launchingHubResult, normalizeLaunchingHubAnswers, type LaunchingHubAnswer } from "@/lib/experiences/builder/launching-wayfinders-hub-assessment";

type Route = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null }>;
type Result = NonNullable<ReturnType<typeof launchingHubResult>>;

function ResultDialog({ answers, result, onClose }: { answers: Record<string, LaunchingHubAnswer>; result: Result; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", keydown); return () => document.removeEventListener("keydown", keydown); }, [onClose]);
  return createPortal(<div className="purpose-result-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-labelledby="launching-hub-result-title" aria-modal="true" className="purpose-result-dialog" role="dialog">
      <header><p>Readiness result</p><button aria-label="Close result details" onClick={onClose} ref={closeRef} type="button">×</button></header>
      <h3 id="launching-hub-result-title">{result.readiness.label}</h3><strong>{result.score} / 50</strong>
      <div className="purpose-stage-line"><span>Readiness Description</span><small>{result.readiness.range}</small></div><p>{result.readiness.description}</p>
      <div className="purpose-stage-line"><span>Focus</span></div><p>{result.readiness.focus}</p>
      <div className="purpose-result-responses"><h4>Your responses</h4><ol>{LAUNCHING_HUB_QUESTIONS.map((question) => { const answer = answers[question.key]; const label = LAUNCHING_HUB_SCALE.find((option) => option.value === answer)?.label; return <li key={question.key}><p>{question.prompt}</p><div><b>{answer}</b><span>{label}</span></div></li>; })}</ol></div>
    </section>
  </div>, document.body);
}

export function LaunchingWayfindersHubAssessment({ initialData, route, preview = false, standalone = false, autoStart = false }: { initialData: unknown; route: Route; preview?: boolean; standalone?: boolean; autoStart?: boolean }) {
  const initialAnswers = normalizeLaunchingHubAnswers(initialData);
  const [answers, setAnswers] = useState<Record<string, LaunchingHubAnswer>>(initialAnswers);
  const [questionIndex, setQuestionIndex] = useState(() => Math.min(firstIncompleteLaunchingHubQuestion(initialAnswers), 9));
  const [showResults, setShowResults] = useState(launchingHubComplete(initialAnswers));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [focused, setFocused] = useState(autoStart);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [finalized, setFinalized] = useState(() => Boolean((initialData as { finished?: unknown } | null)?.finished));
  const queue = useRef(Promise.resolve());
  const question = LAUNCHING_HUB_QUESTIONS[questionIndex];
  const answeredCount = Object.keys(answers).length;
  const result = launchingHubResult(answers);

  function select(answer: LaunchingHubAnswer) {
    if (standalone && finalized) return;
    const next = { ...answers, [question.key]: answer };
    setAnswers(next); setFocused(true); setSaveState(preview ? "idle" : "saving");
    if (!preview) queue.current = queue.current.then(async () => { try { await saveLaunchingWayfindersHubAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, next); setSaveState("saved"); } catch { setSaveState("error"); } });

  }

  const launchStatus: AssessmentLaunchStatus = (standalone ? finalized : result) ? "completed" : answeredCount ? "in_progress" : "not_started";
  if (!focused && !autoStart) return <AssessmentLaunchCard eyebrow="Wayfinders Assessment" title="Launching Your Wayfinders Hub" description="Explore your readiness to launch and multiply a Wayfinders Hub, and identify your next step." status={launchStatus} action={<button aria-label="Open Launching Your Wayfinders Hub Assessment" type="button" onClick={() => setFocused(true)}>{preview ? "Preview Assessment" : assessmentLaunchLabel(launchStatus)}</button>}/>;

  if (showResults && result) return <AssessmentFocusFrame active={focused && !autoStart} label="Launching Your Wayfinders Hub Assessment in progress" onClose={() => setFocused(false)}><section aria-label="Launching Your Wayfinders Hub Assessment results" className="purpose-assessment purpose-results-view">
    <header className="purpose-assessment-header"><div><p>Launching Your Wayfinders Hub</p><span>{standalone && !finalized ? "Ready to finish" : "Assessment complete"}</span></div><h2>Your readiness result</h2><p>Your score reflects your current readiness to launch and multiply a Wayfinders Hub.</p></header>
    <div className="purpose-results-grid is-single"><article className="purpose-result-card"><p>Your readiness score</p><strong>{result.score} <span>/ 50</span></strong><h3>{result.readiness.label}</h3><button aria-haspopup="dialog" onClick={() => setDialogOpen(true)} type="button">+ Explore</button></article></div>
    <footer className="purpose-results-footer">{standalone && !finalized && <button disabled={saveState === "saving"} onClick={async () => { setSaveState("saving"); try { await queue.current; if (!preview) await saveLaunchingWayfindersHubAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, answers, true); setFinalized(true); setSaveState("saved"); } catch { setSaveState("error"); } }} type="button">Finish assessment</button>}<button onClick={() => { setShowResults(false); setQuestionIndex(0); }} type="button">Review answers</button><span aria-live="polite">{preview ? "Preview only · responses are not saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save. Retry your save." : standalone && !finalized ? "Draft saved · Finish to complete" : "Assessment saved ✓"}</span></footer>
    {dialogOpen && <ResultDialog answers={answers} result={result} onClose={() => setDialogOpen(false)}/>} 
  </section></AssessmentFocusFrame>;

  const selected = answers[question.key];
  return <AssessmentFocusFrame active={focused && !autoStart} label="Launching Your Wayfinders Hub Assessment in progress" onClose={() => setFocused(false)}><section aria-label="Launching Your Wayfinders Hub Assessment" className="purpose-assessment">
    <header className="purpose-assessment-header"><div><p>Launching Your Wayfinders Hub</p><span>Guided assessment</span></div><h2>Assess your readiness</h2><p>For each statement below, rate yourself on a scale from 1 to 5 where:</p><div className="launching-hub-scale">{LAUNCHING_HUB_SCALE.map((option) => <span key={option.value}><b>{option.value}</b> = {option.label}</span>)}</div></header>
    <div className="purpose-progress" aria-label={`${answeredCount} of 10 questions complete`}><div><span>Question {questionIndex + 1} of 10</span><strong>{answeredCount} / 10 complete</strong></div><i aria-hidden="true"><span style={{ width: `${answeredCount * 10}%` }}/></i></div>
    <div className="purpose-question-stage"><fieldset aria-labelledby={`launching-hub-question-${question.key}`}><legend className="sr-only">Question {questionIndex + 1} of 10</legend><h3 id={`launching-hub-question-${question.key}`}>{question.prompt}</h3><div className="purpose-options launching-hub-options">{LAUNCHING_HUB_SCALE.map(({ value, label }) => <label className={selected === value ? "is-selected" : ""} key={value}><input disabled={standalone && finalized} checked={selected === value} name={question.key} onChange={() => select(value)} type="radio" value={value}/><b aria-hidden="true">{value}</b><span>{label}</span><i aria-hidden="true">✓</i></label>)}</div></fieldset>
      <footer><button disabled={questionIndex === 0} onClick={() => { setQuestionIndex((current) => Math.max(0, current - 1)); }} type="button">← Back</button><span aria-live="polite">{preview ? "Preview only · responses are not saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save. Retry your save." : saveState === "saved" ? "Saved ✓" : "Select an answer to continue"}</span>{saveState === "error" && selected && <button onClick={() => select(selected)} type="button">Retry save</button>}<button className="is-primary" disabled={!selected || (questionIndex === 9 && !result)} onClick={() => { if (questionIndex === 9) setShowResults(true); else setQuestionIndex(current => Math.min(current + 1, 9)); }} type="button">{questionIndex === 9 ? "View results" : "Next question →"}</button></footer>
    </div>
  </section></AssessmentFocusFrame>;
}
