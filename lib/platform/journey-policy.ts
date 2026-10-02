export type JourneyEnrollment = { id: string; experience_id: string; experience_version_id: string | null; status: string; completed_at: string | null };
export type JourneyHistory = { id: string; enrollment_id: string; experience_id: string; experience_version_id: string; artifact_snapshot: unknown };
export function isActiveJourneyEnrollment(enrollment: { status: string }) {
  return enrollment.status === "enrolled" || enrollment.status === "in_progress";
}
export function activeJourneyEnrollments<T extends JourneyEnrollment>(enrollments: readonly T[]) {
  return enrollments.filter(isActiveJourneyEnrollment);
}
export function completedJourneyRecords(enrollments: readonly JourneyEnrollment[], history: readonly JourneyHistory[]) {
  const records: { id: string; enrollmentId: string; experienceId: string; versionId: string | null; completedAt: string }[] = history.flatMap((item) => {
    const root = item.artifact_snapshot as { completion?: { completed_at?: unknown } } | null;
    const date = root?.completion?.completed_at;
    return typeof date === "string" && Number.isFinite(Date.parse(date)) ? [{ id: item.id, enrollmentId: item.enrollment_id, experienceId: item.experience_id, versionId: item.experience_version_id, completedAt: date }] : [];
  });
  for (const item of enrollments) {
    if (item.status !== "completed" || !item.completed_at) continue;
    if (!records.some((record) => record.enrollmentId === item.id && record.versionId === item.experience_version_id && Date.parse(record.completedAt) === Date.parse(item.completed_at!))) records.push({ id: `enrollment-${item.id}`, enrollmentId: item.id, experienceId: item.experience_id, versionId: item.experience_version_id, completedAt: item.completed_at });
  }
  return records.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function activeCanonicalJourneyEnrollment(enrollment: { status: string }, experienceSlug: string | undefined, hasActiveLmu: boolean) {
  return isActiveJourneyEnrollment(enrollment) && !(experienceSlug === "life-mapping-u" && hasActiveLmu);
}
export function visibleCanonicalJourneyCompletion(experienceSlug: string | undefined, hasCompletedLmu: boolean) {
  return !(experienceSlug === "life-mapping-u" && hasCompletedLmu);
}
