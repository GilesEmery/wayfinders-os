export type ParticipantCourseEntry = Readonly<{
  type: "personal" | "cohort";
  experienceId: string;
  enrollmentId: string;
  href: string;
  cohortId: string | null;
  cohortName: string | null;
  role: string | null;
}>;

type Enrollment = Readonly<{ id: string; experience_id: string; experience_version_id: string | null }>;
type Experience = Readonly<{ id: string; slug: string }>;
type Membership = Readonly<{ cohort_id: string; membership_role: string; status: string }>;
type Cohort = Readonly<{ id: string; name: string; experience_id: string; status?: string }>;
type Offering = Readonly<{ cohort_id: string | null; experience_id: string; experience_version_id: string | null; status?: string }>;

function courseHref(slug: string, cohortId?: string) {
  const base = `/experiences/${encodeURIComponent(slug)}`;
  return cohortId ? `${base}?cohort=${encodeURIComponent(cohortId)}` : base;
}

export function resolveParticipantCourseEntries(input: { enrollment: Enrollment; experience: Experience; memberships: readonly Membership[]; cohorts: readonly Cohort[]; offerings: readonly Offering[] }): ParticipantCourseEntry[] {
  const { enrollment, experience } = input;
  const contexts = input.memberships.flatMap((membership) => {
    if (membership.status !== "active") return [];
    const cohort = input.cohorts.find((item) => item.id === membership.cohort_id && item.experience_id === experience.id && (!item.status || item.status === "active"));
    if (!cohort) return [];
    const offerings = input.offerings.filter((item) => item.cohort_id === cohort.id && item.experience_id === experience.id && (!item.status || item.status === "active") && (item.experience_version_id === null || item.experience_version_id === enrollment.experience_version_id));
    if (offerings.length !== 1) return [];
    return [{ type: "cohort" as const, experienceId: experience.id, enrollmentId: enrollment.id, cohortId: cohort.id, cohortName: cohort.name, role: membership.membership_role, href: courseHref(experience.slug, cohort.id) }];
  });
  if (contexts.length) return contexts.toSorted((left, right) => left.cohortId.localeCompare(right.cohortId));
  return [{ type: "personal", experienceId: experience.id, enrollmentId: enrollment.id, cohortId: null, cohortName: null, role: null, href: courseHref(experience.slug) }];
}

export function featuredParticipantCourseEntry(entries: readonly ParticipantCourseEntry[]) {
  if (entries.length === 1) return entries[0];
  return entries.find((entry) => entry.type === "cohort") ?? entries[0] ?? null;
}

export function catalogParticipantCourseHref(defaultHref: string, entries: readonly ParticipantCourseEntry[]) {
  if (!entries.length) return defaultHref;
  if (entries.length === 1) return entries[0].href;
  return "/dashboard#trainings";
}
