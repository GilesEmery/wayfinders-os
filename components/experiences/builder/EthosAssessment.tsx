"use client";

import { useRef, useState } from "react";
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
  return <article className={`ethos-result-box is-${kind}`}><p>{heading}</p>{items.map(({ category, score }) => <div key={category.key}><h3>{category.title}</h3><strong>{score} / 15</strong></div>)}<span>{kind === "strength" ? "This appears to be an area of strength in your current context." : "This may be an area to intentionally develop as you continue through the Hub Leader Cohort."}</span><button aria-haspopup="dialog" onClick={onExplore} type="button">Explore +</button></article>;
}

export function EthosAssessment({ initialData, route, preview = false }: { initialData: unknown; route: Route; preview?: boolean }) {
  const initialAnswers = normalizeEthosAnswers(initialData);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [step, setStep] = useState(() => firstIncomplete(initialAnswers));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dialog, setDialog] = useState<"strength" | "growth" | null>(null);
  const queue = useRef(Promise.resolve());
  const category = ETHOS_CATEGORIES[step];
  const stepComplete = category.questions.every((question) => Boolean(answers[question.key]));
  const results = ethosResults(answers);

  function select(questionKey: string, score: number) {
    const next = { ...answers, [questionKey]: score };
    setAnswers(next);
    if (preview) return;
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

  const answeredCount = Object.keys(answers).length;

  return <section className="ethos-assessment" aria-label="Wayfinders Ethos Assessment">
    <header className="ethos-intro">
      <div className="ethos-intro-meta"><p>Wayfinders Ethos</p><span>Required assessment</span></div>
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
        return <fieldset aria-labelledby={questionLabelId} className={answers[question.key] ? "is-answered" : ""} key={question.key}><div className="ethos-question-prompt" id={questionLabelId}><span>{String(step * 3 + index + 1).padStart(2, "0")}</span><strong>{question.text}</strong></div><div className="ethos-ratings">{[1, 2, 3, 4, 5].map((score) => <label className={answers[question.key] === score ? "is-selected" : ""} key={score}><input aria-label={`${score} out of 5`} checked={answers[question.key] === score} disabled={preview} name={question.key} onChange={() => select(question.key, score)} type="radio" value={score}/><span>{score}</span></label>)}</div></fieldset>;
      })}</div>
      <footer><button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">← Back</button><span aria-live="polite">{preview ? "Preview only · responses are not saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save. Try again." : saveState === "saved" ? "Saved ✓" : ""}</span>{step < 4 ? <button className="is-primary" disabled={!stepComplete} onClick={() => setStep((value) => Math.min(4, value + 1))} type="button">Continue →</button> : <span className={`ethos-completion${ethosComplete(answers) ? " is-complete" : ""}`}>{ethosComplete(answers) ? "Assessment complete ✓" : "Answer all three to complete"}</span>}</footer>
    </div>
    {results && (results.allEqual ? <section className="ethos-balanced-result"><p>Balanced result</p><h3>Your scores are currently even across all five Wayfinders Ethos areas.</h3><ul>{results.scores.map(({ category: item, score }) => <li key={item.key}><span>{item.title}</span><strong>{score} / 15</strong></li>)}</ul></section> : <section className="ethos-results" aria-label="Ethos Assessment results"><ResultBox kind="strength" items={results.strongest} onExplore={() => setDialog("strength")}/><ResultBox kind="growth" items={results.growth} onExplore={() => setDialog("growth")}/></section>)}
    {dialog && results && <ResultDialog kind={dialog} items={dialog === "strength" ? results.strongest : results.growth} onClose={() => setDialog(null)}/>} 
  </section>;
}
