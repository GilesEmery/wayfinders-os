import Link from "next/link";

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
}

export function LMUSectionNavigation({ currentStep, totalSteps, onBack, onNext, backLabel, nextLabel, canGoBack = true, canGoNext = true, isFinalStep = false }: LMUSectionNavigationProps) {
  const step = Math.min(Math.max(currentStep, 1), totalSteps);
  const percentage = Math.round((step / totalSteps) * 100);
  return <nav className="lmu-section-navigation" aria-label="Section progress and navigation">
    <div className="lmu-section-progress-copy"><span>Step {step} of {totalSteps}</span><span>{percentage}%</span></div>
    <div className="lmu-section-progress" role="progressbar" aria-label={`Section progress: step ${step} of ${totalSteps}`} aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={step}><span style={{ width: `${percentage}%` }} /></div>
    <div className="lmu-section-navigation-actions">
      {step === 1 ? <Link href="/experiences/life-mapping-u/original">← Back to Sections</Link> : onBack ? <button type="button" onClick={onBack} disabled={!canGoBack}>← {backLabel ?? "Back"}</button> : <span aria-hidden="true" />}
      {onNext ? <button className="lmu-section-next" type="button" onClick={onNext} disabled={!canGoNext}>{nextLabel ?? (isFinalStep ? "Finish Section" : "Continue")} <span aria-hidden="true">→</span></button> : <span>Continue with the primary action above <span aria-hidden="true">↑</span></span>}
    </div>
  </nav>;
}
