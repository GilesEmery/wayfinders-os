import type { ProgressSummary } from "@/lib/experiences/lmu/types";

export function ModuleProgress({ progress }: { progress: ProgressSummary }) {
  return (
    <div className="progress-block" aria-label={`${progress.completed} of ${progress.total} modules complete`}>
      <div className="progress-copy">
        <span>Experience progress</span>
        <span>{progress.completed} / {progress.total}</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
    </div>
  );
}
