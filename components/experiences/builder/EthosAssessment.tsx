"use client";

import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { AssessmentFocusFrame } from "./AssessmentFocusFrame";
import { AssessmentLaunchCard, assessmentLaunchLabel, type AssessmentLaunchStatus } from "./AssessmentLaunchCard";
import { saveEthosAssessmentAction } from "@/lib/experiences/builder/ethos-assessment-actions";
import { ETHOS_CATEGORIES, ethosComplete, ethosResults, normalizeEthosAnswers, type EthosAnswers } from "@/lib/experiences/builder/ethos-assessment";

type Route = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null }>;

function firstIncomplete(answers: EthosAnswers) {
  const index = ETHOS_CATEGORIES.findIndex((category) => category.questions.some((question) => !answers[question.key]));
  return index < 0 ? ETHOS_CATEGORIES.length - 1 : index;
}

function ResultDialog({ kind, items, onClose }: { kind: "strength" | "growth"; items: NonNullable<ReturnType<typeof ethosResults>>["strongest"]; onClose: () => void }) {
  const title = kind === "strength" ? "Current Strength" : "Growth Opportunity";
  return <div className="ethos-dialog-backdrop" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation"><section aria-label={`${title} details`} aria-modal="true" className="ethos-dialog" role="dialog"><header><p>{title}</p><button aria-label="Close result details" autoFocus onClick={onClose} type="button">×</button></header>{items.map(({ category, score }) => <article key={category.key}><h3>{category.title}</h3><strong>{score} / 15</strong><p>{category.description}</p><ul>{category.questions.map((question) => <li key={question.key}>{question.text}</li>)}</ul><p>{kind === "strength" ? "This appears to be an area where the Wayfinders Ethos is already showing up strongly in your current context." : "This may be an area where intentional practice, reflection, and experience could help you grow during the Hub Leader Cohort."}</p></article>)}</section></div>;
}

function ResultBox({ kind, items, onExplore }: { kind: "strength" | "growth"; items: NonNullable<ReturnType<typeof ethosResults>>["strongest"]; onExplore: () => void }) {
  const plural = items.length > 1;
  const heading = kind === "strength" ? `Current Strength${plural ? "s" : ""}` : `Growth Opportunit${plural ? "ies" : "y"}`;
  return <article className={`ethos-result-box is-${kind}`}><p>{heading}</p>{items.map(({ category, score }) => <div key={category.key}><h3>{category.title}</h3><strong>{score} / 15</strong><div className="ethos-print-result-details"><p>{category.description}</p><ul>{category.questions.map(question => <li key={question.key}>{question.text}</li>)}</ul><p>{kind === "strength" ? "This appears to be an area where the Wayfinders Ethos is already showing up strongly in your current context." : "This may be an area where intentional practice, reflection, and experience could help you grow during the Hub Leader Cohort."}</p></div></div>)}<span>{kind === "strength" ? "This appears to be an area of strength in your current context." : "This may be an area to intentionally develop as you continue through the Hub Leader Cohort."}</span><button aria-haspopup="dialog" onClick={onExplore} type="button">Explore +</button></article>;
}

export function EthosAssessment({ initialData, route, preview = false, standalone = false, autoStart = false, returnTo }: { initialData: unknown; route: Route; preview?: boolean; standalone?: boolean; autoStart?: boolean; returnTo?: string | null }) {
  const initialAnswers = normalizeEthosAnswers(initialData);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [step, setStep] = useState(() => firstIncomplete(initialAnswers));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [focused, setFocused] = useState(autoStart);
  const [dialog, setDialog] = useState<"strength" | "growth" | null>(null);
  const [finalized, setFinalized] = useState(() => Boolean((initialData as { finished?: unknown } | null)?.finished));
  const [reviewing, setReviewing] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | undefined>((initialData as { finished?: { completedAt?: string } })?.finished?.completedAt);
  const queue = useRef(Promise.resolve());
  const savingResponse = useRef(false);
  const retakeCompletedAt = useRef<string | undefined>(undefined);
  const category = ETHOS_CATEGORIES[step];
  const stepComplete = category.questions.every((question) => Boolean(answers[question.key]));
  const results = ethosResults(answers);

  function select(questionKey: string, score: number) {
    if (standalone && finalized) return;
    const next = { ...answers, [questionKey]: score };
    setAnswers(next);
    setFocused(true);
    if (preview) {
      return;
    }
    setSaveState("saving");
    queue.current = queue.current.then(async () => {
      try {
        await saveEthosAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, next);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    });
  }

  async function saveResponse() {
    if (savingResponse.current || !results) return;
    savingResponse.current = true;
    setSaveState("saving");
    try {
      await queue.current;
      if (!preview) { const saved = await saveEthosAssessmentAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, answers, true, retakeCompletedAt.current); setCompletedAt(saved.completedAt ?? undefined); } else setCompletedAt(new Date().toISOString());
      setFinalized(true);
      setReviewing(false);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      savingResponse.current = false;
    }
  }

  const answeredCount = Object.keys(answers).length;
  const launchStatus: AssessmentLaunchStatus = (standalone ? finalized : ethosComplete(answers)) ? "completed" : answeredCount ? "in_progress" : "not_started";

  if (!focused && !autoStart) return <AssessmentLaunchCard eyebrow="Wayfinders Assessment" title="Wayfinders Ethos Reflection" description="Reflect on how the Wayfinders Ethos is currently expressed in your leadership and identify your strongest opportunities for growth." status={launchStatus} action={<button aria-label="Open Wayfinders Ethos Assessment" type="button" onClick={() => setFocused(true)}>{preview ? "Preview Assessment" : assessmentLaunchLabel(launchStatus)}</button>}/>;

  const showingResults = standalone && finalized && !reviewing;

  return <AssessmentFocusFrame active={focused && !autoStart} label="Wayfinders Ethos Assessment in progress" onClose={() => setFocused(false)}><section className={`ethos-assessment${showingResults ? " ethos-saved-results" : ""}`} aria-label="Wayfinders Ethos Assessment">
    {showingResults && <header className="ethos-intro"><div className="ethos-intro-meta"><p>Wayfinders Ethos Reflection</p><span>Saved response</span></div><h2>Your leadership reflection</h2><span>A record of your responses, current strengths, and opportunities for growth.</span></header>}
    {!showingResults && <>
    <header className="ethos-intro">
      <div className="ethos-intro-meta"><p>Wayfinders Ethos</p><span>Guided assessment</span></div>
      <h2>Discover how you lead</h2>
      <span>Reflect on what is true in your current context. There are no right answers, and every selection saves automatically.</span>
      <div className="ethos-progress-summary"><strong>{answeredCount}</strong><span>of 15 reflections complete</span></div>
    </header>
    <nav aria-label="Assessment progress" className="ethos-progress">
      {ETHOS_CATEGORIES.map((item, index) => {
        const complete = item.questions.every((question) => Boolean(answers[question.key]));
        return <button aria-current={index === step ? "step" : undefined} className={`${index === step ? "is-current" : ""}${complete ? " is-complete" : ""}`} key={item.key} onClick={() => setStep(index)} type="button"><span>{complete ? "✓" : index + 1}</span><small>{item.title}</small></button>;
      })}
    </nav>
    <div className="ethos-scale" aria-label="Rating scale"><span><b>1</b>Not at all true</span><i aria-hidden="true"/><span><b>5</b>Consistently true</span></div>
    <div className="ethos-step">
      <div className="ethos-step-heading"><p>Reflection {step + 1} of 5</p><h3>{category.title}</h3><blockquote>{category.belief}</blockquote></div>
      <div className="ethos-questions">{category.questions.map((question, index) => {
        const questionLabelId = `ethos-question-${question.key}`;
        return <fieldset aria-labelledby={questionLabelId} className={answers[question.key] ? "is-answered" : ""} key={question.key}><div className="ethos-question-prompt" id={questionLabelId}><span>{String(step * 3 + index + 1).padStart(2, "0")}</span><strong>{question.text}</strong></div><div className="ethos-ratings">{[1, 2, 3, 4, 5].map((score) => <label className={answers[question.key] === score ? "is-selected" : ""} key={score}><input disabled={standalone && finalized} aria-label={`${score} out of 5`} checked={answers[question.key] === score} name={question.key} onChange={() => select(question.key, score)} type="radio" value={score}/><span>{score}</span></label>)}</div></fieldset>;
      })}</div>
      <footer><button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">← Back</button><span aria-live="polite">{preview ? "Preview only · responses are not saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save. Try again." : saveState === "saved" ? standalone && !finalized ? "Draft saved" : "Saved ✓" : ""}</span>{step < 4 ? <button className="is-primary" disabled={!stepComplete} onClick={() => setStep((value) => Math.min(4, value + 1))} type="button">Next section →</button> : <>{standalone ? finalized ? <button className="is-primary" type="button" onClick={() => setReviewing(false)}>View saved response</button> : <button className="is-primary" type="button" disabled={!results || saveState === "saving"} onClick={() => void saveResponse()}>{saveState === "saving" ? "Saving…" : "Save response"}</button> : <span className={`ethos-completion${ethosComplete(answers) ? " is-complete" : ""}`}>{ethosComplete(answers) ? "Assessment complete ✓" : "Answer all three to continue"}</span>}</>}</footer>
    </div>
    </>}
    {results && (!standalone || showingResults) && (results.allEqual ? <section className="ethos-balanced-result"><p>Balanced result</p><h3>Your scores are currently even across all five Wayfinders Ethos areas.</h3><ul>{results.scores.map(({ category: item, score }) => <li key={item.key}><span>{item.title}</span><strong>{score} / 15</strong></li>)}</ul></section> : <section className="ethos-results" aria-label="Ethos Assessment results"><ResultBox kind="strength" items={results.strongest} onExplore={() => setDialog("strength")}/><ResultBox kind="growth" items={results.growth} onExplore={() => setDialog("growth")}/></section>)}
    {showingResults && results && <section className="ethos-saved-responses"><h3>Your responses</h3>{results.scores.map(({ category: item, score }) => <article key={item.key}><h4>{item.title}<span>{score} / 15</span></h4><dl>{item.questions.map(question => <div key={question.key}><dt>{question.text}</dt><dd>{answers[question.key]} / 5</dd></div>)}</dl></article>)}</section>}
    {showingResults && <footer className="ethos-saved-actions"><button type="button" onClick={() => setReviewing(true)}>Review answers</button><button type="button" onClick={() => { retakeCompletedAt.current = completedAt; setAnswers({}); setFinalized(false); setReviewing(false); setStep(0); setDialog(null); setSaveState("idle"); }}>Retake assessment</button><button type="button" onClick={() => window.print()}><Printer aria-hidden="true"/> Print assessment</button><button className="is-primary" type="button" onClick={() => { if (preview) { setFocused(false); return; } window.location.assign(returnTo ?? "/dashboard"); }}>Save and close</button></footer>}
    {dialog && results && <ResultDialog kind={dialog} items={dialog === "strength" ? results.strongest : results.growth} onClose={() => setDialog(null)}/>} 
  </section></AssessmentFocusFrame>;
}
