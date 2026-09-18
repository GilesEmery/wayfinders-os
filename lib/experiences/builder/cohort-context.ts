export type CohortOfferingLike = Readonly<{
  cohort_id: string | null;
  experience_version_id: string | null;
}>;

export type CohortOfferingSelection<T extends CohortOfferingLike> =
  | { ok: true; offering: T }
  | { ok: false; reason: "invalid" | "ambiguous_delivery" };

export function selectExplicitCohortOffering<T extends CohortOfferingLike>(offerings: readonly T[], cohortId: string): CohortOfferingSelection<T> {
  const matches = offerings.filter((offering) => offering.cohort_id === cohortId);
  if (matches.length === 0) return { ok: false, reason: "invalid" };
  if (matches.length !== 1) return { ok: false, reason: "ambiguous_delivery" };
  return { ok: true, offering: matches[0] };
}

export function cohortVersionMatchesCanonicalEnrollment(enrollmentVersionId: string | null, offering: CohortOfferingLike) {
  return Boolean(enrollmentVersionId && (offering.experience_version_id === null || offering.experience_version_id === enrollmentVersionId));
}

export function participantCourseHref(slug: string, cohortId?: string | null) {
  const base = `/experiences/${encodeURIComponent(slug)}`;
  return cohortId ? `${base}?cohort=${encodeURIComponent(cohortId)}` : base;
}
