"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { saveActivatePurposeAssessmentAction } from "@/lib/experiences/builder/activate-purpose-assessment-actions";
import { NativeAssessmentShell } from "./NativeAssessmentShell";
import { AssessmentFocusFrame } from "./AssessmentFocusFrame";
import { AssessmentLaunchCard, assessmentLaunchLabel, type AssessmentLaunchStatus } from "./AssessmentLaunchCard";
import {
  ACTIVATE_PURPOSE_AREAS,
  ACTIVATE_PURPOSE_QUESTIONS,
  activatePurposeComplete,
  activatePurposeResults,
  firstIncompleteActivatePurposeQuestion,
  normalizeActivatePurposeAnswers,
  type ActivatePurposeAnswer,
} from "@/lib/experiences/builder/activate-purpose-assessment";

type Route = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null }>;
type Result = NonNullable<ReturnType<typeof activatePurposeResults>>[number];

function AreaDialog({ answers, result, onClose }: { answers: Record<string, ActivatePurposeAnswer>; result: Result; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return createPortal(<div className="purpose-result-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-labelledby={`purpose-dialog-${result.area.key}`} aria-modal="true" className="purpose-result-dialog" role="dialog">
      <header><p>Growth Stage</p><button aria-label="Close result details" onClick={onClose} ref={closeRef} type="button">×</button></header>
      <h3 id={`purpose-dialog-${result.area.key}`}>{result.area.title}</h3>
      <strong>{result.score} / 20</strong>
      <div className="purpose-stage-line"><span>{result.stage.title}</span><small>{result.stage.range}</small></div>
      <p>{result.stage.description}</p>
      <p className="purpose-area-context">{result.area.description}</p>
      <div className="purpose-result-responses">
        <h4>Your responses</h4>
        <ol>{result.area.questions.map((question) => {
          const answer = answers[question.key];
          return <li key={question.key}><p>{question.prompt}</p><div><b>{answer}</b><span>{question.options[answer]}</span></div></li>;
        })}</ol>
      </div>
    </section>
  </div>, document.body);
}

function ResultCard({ result, onExplore }: { result: Result; onExplore: () => void }) {
  return <article className="purpose-result-card"><p>{result.area.title}</p><strong>{result.score} <span>/ 20</span></strong><h3>{result.stage.title}</h3><button aria-haspopup="dialog" onClick={onExplore} type="button">+ Explore</button></article>;
}

export function ActivatePurposeAssessment({ initialData, route, preview = false, standalone = false, autoStart = false, returnTo }: { initialData: unknown; route: Route; preview?: boolean; standalone?: boolean; autoStart?: boolean; returnTo?: string | null }) {
  const initialAnswers = normalizeActivatePurposeAnswers(initialData);
  const initiallyComplete = activatePurposeComplete(initialAnswers);
  const [answers, setAnswers] = useState<Record<string, ActivatePurposeAnswer>>(initialAnswers);
  const [questionIndex, setQuestionIndex] = useState(() => Math.min(firstIncompleteActivatePurposeQuestion(initialAnswers), ACTIVATE_PURPOSE_QUESTIONS.length - 1));
  const [showResults, setShowResults] = useState(initiallyComplete);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [finalized, setFinalized] = useState(() => Boolean((initialData as { finished?: unknown } | null)?.finished));
  const [focused, setFocused] = useState(autoStart);
  const [dialog, setDialog] = useState<Result | null>(null);
  const queue = useRef(Promise.resolve());
  const closing = useRef(false);

  const question = ACTIVATE_PURPOSE_QUESTIONS[questionIndex];
  const area = ACTIVATE_PURPOSE_AREAS.find((candidate) => candidate.questions.some((item) => item.key === question.key))!;
  const answeredCount = Object.keys(answers).length;
  const results = activatePurposeResults(answers);

  function select(answer: ActivatePurposeAnswer) {
    if (standalone && finalized) return;
    const next = { ...answers, [question.key]: answer };
    setAnswers(next);
    setFocused(true);
    setSaveState(preview ? "idle" : "saving");
    if (!preview) {
      queue.current = queue.current.then(async () => {
        try {
          await saveActivatePurposeAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, next);
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      });
    }
  }

  function back() {
    setQuestionIndex((current) => Math.max(0, current - 1));
  }

  function retake() {
    if (standalone) return;
    setAnswers({});
    setQuestionIndex(0);
    setShowResults(false);
    setSaveState("idle");
    setDialog(null);
  }

  async function saveAndClose() {
    if (closing.current) return;
    closing.current = true;
    setSaveState("saving");
    try {
      await queue.current;
      if (!preview) {
        await saveActivatePurposeAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, answers, standalone);
      }
      setFinalized(true);
      setSaveState("saved");
      if (preview || !standalone) { setFocused(false); setDialog(null); }
      else window.location.assign(returnTo ?? "/dashboard");
    } catch {
      setSaveState("error");
    } finally {
      closing.current = false;
    }
  }

  const launchStatus: AssessmentLaunchStatus = (standalone ? finalized : results) ? "completed" : answeredCount ? "in_progress" : "not_started";
  if (!focused && !autoStart) return <AssessmentLaunchCard eyebrow="PurposeOS Assessment" title="Activate Your Purpose" description="Discover your current growth stage across the three areas of purpose and identify the next step in your development." status={launchStatus} action={<button aria-label="Open Activate Your Purpose Assessment" type="button" onClick={() => setFocused(true)}>{preview ? "Preview Assessment" : assessmentLaunchLabel(launchStatus)}</button>}/>;

  if (showResults && results) return <AssessmentFocusFrame active={focused && !autoStart} label="Activate Your Purpose Assessment in progress" onClose={() => setFocused(false)}><NativeAssessmentShell returnTo={returnTo} showReturn={autoStart}><section aria-label="Activate Your Purpose Assessment results" className="purpose-assessment purpose-results-view">
    <header className="purpose-assessment-header"><div><p>Activate Your Purpose</p><span>{standalone && !finalized ? "Ready to finish" : "Assessment complete"}</span></div><h2>Your growth stages</h2><p>Each area reflects where you are today. Explore a result for its stage description and development context.</p></header>
    <div className="purpose-results-grid">{results.map((result) => <ResultCard key={result.area.key} result={result} onExplore={() => setDialog(result)}/>)}</div>
    <section className="purpose-print-details" aria-label="Full assessment results">{results.map(result => <article key={result.area.key}><h3>{result.area.title}</h3><strong>{result.score} / 20</strong><div className="purpose-stage-line"><span>{result.stage.title}</span><small>{result.stage.range}</small></div><p>{result.stage.description}</p><p>{result.area.description}</p><div className="purpose-result-responses"><h4>Your responses</h4><ol>{result.area.questions.map(question => { const answer = answers[question.key]; return <li key={question.key}><p>{question.prompt}</p><div><b>{answer}</b><span>{question.options[answer]}</span></div></li>; })}</ol></div></article>)}</section>
    <footer className="purpose-results-footer purpose-saved-actions"><button onClick={() => { setShowResults(false); setQuestionIndex(0); }} type="button">Review answers</button>{!standalone && <button onClick={retake} type="button">Retake assessment</button>}<button type="button" onClick={() => window.print()}><Printer aria-hidden="true"/> Print assessment</button><button className="is-primary" disabled={saveState === "saving"} onClick={() => void saveAndClose()} type="button">{saveState === "saving" ? "Saving…" : "Save and close"}</button><span aria-live="polite">{preview ? "Preview only · responses are not saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save. Retry Save and close." : standalone && !finalized ? "Draft saved" : "Assessment saved ✓"}</span></footer>
    {dialog && <AreaDialog answers={answers} result={dialog} onClose={() => setDialog(null)}/>} 
  </section></NativeAssessmentShell></AssessmentFocusFrame>;

  const selected = answers[question.key];
  const firstInArea = area.questions[0].key === question.key;
  const progress = Math.round((answeredCount / ACTIVATE_PURPOSE_QUESTIONS.length) * 100);
  return <AssessmentFocusFrame active={focused && !autoStart} label="Activate Your Purpose Assessment in progress" onClose={() => setFocused(false)}><NativeAssessmentShell returnTo={returnTo} showReturn={autoStart}><section aria-label="Activate Your Purpose Assessment" className="purpose-assessment">
    <header className="purpose-assessment-header"><div><p>Activate Your Purpose</p><span>Guided assessment</span></div><h2>Find your next step</h2><p>Choose the response that best describes where you are today. Every answer saves automatically.</p></header>
    <label className="native-assessment-mobile-sections"><span aria-hidden="true">{ACTIVATE_PURPOSE_AREAS.indexOf(area) + 1}</span><select aria-label="Assessment section" value={area.key} onChange={event => { const selectedArea = ACTIVATE_PURPOSE_AREAS.find(item => item.key === event.target.value); if (selectedArea) setQuestionIndex(ACTIVATE_PURPOSE_QUESTIONS.findIndex(item => item.key === selectedArea.questions[0].key)); }}>{ACTIVATE_PURPOSE_AREAS.map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select><small>of {ACTIVATE_PURPOSE_AREAS.length}</small></label>
    <div className="purpose-progress" aria-label={`${answeredCount} of 15 questions complete`}><div><span>Question {questionIndex + 1} of 15</span><strong>{answeredCount} / 15 complete</strong></div><i aria-hidden="true"><span style={{ width: `${progress}%` }}/></i></div>
    <div className="purpose-question-stage">
      <div className={`purpose-area-heading${firstInArea ? " is-entry" : ""}`}><p>{area.title}</p>{firstInArea && <span>{area.description}</span>}</div>
      <fieldset aria-describedby={`purpose-area-${area.key}`} aria-labelledby={`purpose-question-${question.key}`}>
        <legend className="sr-only">Question {questionIndex + 1} of 15</legend>
        <p className="sr-only" id={`purpose-area-${area.key}`}>{area.description}</p>
        <h3 id={`purpose-question-${question.key}`}>{question.prompt}</h3>
        <div className="purpose-options">{(["A", "B", "C", "D"] as const).map((answer) => <label className={selected === answer ? "is-selected" : ""} key={answer}><input disabled={standalone && finalized} checked={selected === answer} name={question.key} onChange={() => select(answer)} type="radio" value={answer}/><b aria-hidden="true">{answer}</b><span>{question.options[answer]}</span><i aria-hidden="true">✓</i></label>)}</div>
      </fieldset>
      <footer><button disabled={questionIndex === 0} onClick={back} type="button">← Back</button><span aria-live="polite">{preview ? "Preview only · responses are not saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save. Retry your save." : saveState === "saved" ? "Saved ✓" : "Select an answer to continue"}</span>{saveState === "error" && selected && <button onClick={() => select(selected)} type="button">Retry save</button>}<button className="is-primary" disabled={!selected || (questionIndex === ACTIVATE_PURPOSE_QUESTIONS.length - 1 && !results)} onClick={() => { if (questionIndex === ACTIVATE_PURPOSE_QUESTIONS.length - 1) setShowResults(true); else setQuestionIndex(current => Math.min(current + 1, ACTIVATE_PURPOSE_QUESTIONS.length - 1)); }} type="button">{questionIndex === ACTIVATE_PURPOSE_QUESTIONS.length - 1 ? "View results" : "Next question →"}</button></footer>
    </div>
  </section></NativeAssessmentShell></AssessmentFocusFrame>;
}
