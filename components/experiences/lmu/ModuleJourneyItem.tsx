import type { LMUModuleDefinition, ModuleProgressStatus } from "@/lib/experiences/lmu/types";
import Link from "next/link";

interface ModuleJourneyItemProps {
  module: LMUModuleDefinition;
  index: number;
  status: ModuleProgressStatus;
}

export function ModuleJourneyItem({ module, index, status }: ModuleJourneyItemProps) {
  const isAvailable = status === "available" || status === "in-progress";

  return (
    <li className={`journey-item journey-${status}`}>
      <span className="journey-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="journey-copy">
        <p className="journey-state">{status.replace("-", " ")}</p>
        <h3>{module.title}</h3>
        <p>{module.description}</p>
      </div>
      <div className="journey-meta">
        <span>{module.estimatedMinutes} min</span>
        {isAvailable ? (
          <Link href={`/experiences/life-mapping-u/module/${module.slug}`}>
            {status === "in-progress" ? "Continue" : "Begin"} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span>{status === "completed" ? "Complete" : "Up next"}</span>
        )}
      </div>
    </li>
  );
}
