import Link from "next/link";
import type { RefObject } from "react";

interface LMUSectionNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  canGoBack?: boolean;
  canGoNext?: boolean;
  isFinalStep?: boolean;
  onRedo?: () => void;
  onBackToSections?: () => void;
  redoLabel?: string;
  redoButtonRef?: RefObject<HTMLButtonElement | null>;
}

export function LMUSectionNavigation({ currentStep, totalSteps, onBack, onNext, backLabel, nextLabel, canGoBack = true, canGoNext = true, isFinalStep = false, onRedo, onBackToSections, redoLabel, redoButtonRef }: LMUSectionNavigationProps) {
  const step = Math.min(Math.max(currentStep, 1), totalSteps);
  const percentage = Math.round((step / totalSteps) * 100);
  return <nav className="lmu-section-navigation" aria-label="Module progress and navigation">
    <div className="lmu-section-progress-copy"><span>Step {step} of {totalSteps}</span><span>{percentage}%</span></div>
    <div className="lmu-section-progress" role="progressbar" aria-label={`Module progress: step ${step} of ${totalSteps}`} aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={step}><span style={{ width: `${percentage}%` }} /></div>
    <div className="lmu-section-navigation-actions">
      <div className="lmu-section-back-redo">{step > 1 && onBack && <button className="lmu-compact-action" type="button" onClick={onBack} disabled={!canGoBack}>← {backLabel ?? "Back"}</button>}<Link className="lmu-compact-action" href="/experiences/life-mapping-u/original" onClick={onBackToSections}>Back to Modules</Link>{onRedo && redoLabel && <button className="lmu-section-redo lmu-compact-action" ref={redoButtonRef} type="button" onClick={onRedo}>{redoLabel}</button>}</div>
      {onNext ? <button className="lmu-section-next" type="button" onClick={onNext} disabled={!canGoNext}>{nextLabel ?? (isFinalStep ? "Finish Module" : "Continue")} <span aria-hidden="true">→</span></button> : <span>Continue with the primary action above <span aria-hidden="true">↑</span></span>}
    </div>
  </nav>;
}
