import type { ActivatePurposeAnswers } from "./activate-purpose-assessment";

export function projectAssessmentResponse<T>(prior: unknown, answers: T, finalize: boolean, now: string) {
  const previous = prior as { finished?: { completedAt: string; answers: T } } | null;
  if (previous?.finished) return { answers: previous.finished.answers, finished: previous.finished };
  return { answers, finished: finalize ? { completedAt: now, answers } : null };
}

export const projectActivatePurposeResponse = projectAssessmentResponse<ActivatePurposeAnswers>;
