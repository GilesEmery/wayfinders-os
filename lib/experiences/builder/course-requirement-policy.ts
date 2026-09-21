export type CourseRequirementRoleInput = Readonly<{
  globalRole: string | null;
  cohortId: string | null;
  cohortMembershipRole: string | null;
  assignments: ReadonlyArray<Readonly<{ role: string; scope_type: string; scope_id: string | null }>>;
}>;

/** Privileged live access never changes completion by itself; it only removes gates. */
export function canBypassCourseRequirements(input: CourseRequirementRoleInput): boolean {
  if (input.globalRole === "admin" || input.globalRole === "super_admin") return true;
  if (!input.cohortId) return false;
  if (input.cohortMembershipRole === "facilitator") return true;
  return input.assignments.some((assignment) => assignment.role === "facilitator" && assignment.scope_type === "cohort" && assignment.scope_id === input.cohortId);
}
