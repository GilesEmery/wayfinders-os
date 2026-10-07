/** Only an explicit finish of the selected prior attempt can replace its saved result. */
export function isAssessmentRetake(prior: unknown, completedAt: string | undefined, finishing: boolean) {
  if (!finishing || !completedAt || typeof prior !== "object" || prior === null) return false;
  return (prior as { finished?: { completedAt?: string } }).finished?.completedAt === completedAt;
}
