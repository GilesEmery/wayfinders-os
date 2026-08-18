import type { LMUModuleDefinition, ModuleProgressStatus } from "@/lib/experiences/lmu/types";
import Link from "next/link";
import { LMULogo } from "./LMULogo";
import { LifeMapContourProgress } from "./LifeMapContourProgress";

interface ModuleJourneyItemProps {
  module: LMUModuleDefinition;
  index: number;
  status: ModuleProgressStatus;
  allowLockedNavigation?: boolean;
  futureDistance?: number;
  completed?: number;
  total?: number;
  started?: boolean;
}

export function ModuleJourneyItem({ module, index, status, allowLockedNavigation = false, futureDistance, completed = 0, total = 10, started = false }: ModuleJourneyItemProps) {
  const isAvailable = status === "available" || status === "in-progress";
  const isNavigable = isAvailable || status === "completed" || allowLockedNavigation;
  const isResult = module.kind === "result";

  if (isResult) {
    return (
      <li className="journey-item journey-result">
        <div className="journey-copy journey-result-copy">
          <h3>{module.title}</h3>
          <p>{completed === total ? "Your Life Map is ready." : "Your map is taking shape."}</p>
          {isNavigable ? (
            <Link className="journey-result-action" href={`/experiences/life-mapping-u/module/${module.slug}`}>
              {completed === total ? "View My Life Map" : "Preview My Life Map"} <span aria-hidden="true">→</span>
            </Link>
          ) : <span className="journey-result-action" aria-hidden="true">Complete your journey to continue →</span>}
        </div>
        <div className="journey-result-visual">
          <LMULogo variant="mark" />
          <LifeMapContourProgress completed={completed} total={total} />
        </div>
      </li>
    );
  }

  return (
    <li className={`journey-item journey-${status}`} style={futureDistance ? { "--future-distance": Math.min(futureDistance, 4) } as React.CSSProperties : undefined}>
      <span className="journey-number">
        <span>{String(index + 1).padStart(2, "0")}</span>
      </span>
      <div className="journey-copy">
        <p className="journey-state">{status === "available" ? "Current" : status}</p>
        <h3>{module.title}</h3>
        <p>{module.description}</p>
      </div>
      <div className="journey-meta">
        <span>{module.estimatedMinutes} min</span>
        {isNavigable ? <Link href={`/experiences/life-mapping-u/module/${module.slug}`}>{status === "completed" ? "Reopen" : started ? "Resume" : "Begin"} <span aria-hidden="true">→</span></Link> : <span aria-hidden="true">→</span>}
      </div>
    </li>
  );
}
