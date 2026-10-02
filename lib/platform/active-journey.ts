import type { DashboardData } from "./dashboard";
import { activeCanonicalJourneyEnrollment } from "./journey-policy";
import { resolveParticipantCourseEntries } from "./participant-course-context";
import { completedSectionCount } from "../experiences/lmu/completion";
import { SECTION_TO_MODULE } from "../experiences/lmu/persistence";
import type { CourseCardDisplay } from "./course-card";

type ReadyDashboard = Extract<NonNullable<DashboardData>, { enrollments: unknown[] }>;
export function activeJourneyCards(data: ReadyDashboard) {
  const lmu = data.lmuAssessments.find((item) => item.status === "in_progress");
  const cards: { id: string; card: CourseCardDisplay; href: string; action: string; meta: string; accessedAt: string; entries: ReturnType<typeof resolveParticipantCourseEntries> }[] = [];
  for (const enrollment of data.enrollments) {
    const experience = data.experiences.find((item) => item.id === enrollment.experience_id);
    if (!experience || !activeCanonicalJourneyEnrollment(enrollment, experience.slug, Boolean(lmu))) continue;
    const progress = data.progress.find((item) => item.enrollment_id === enrollment.id);
    const entries = resolveParticipantCourseEntries({ enrollment, experience, memberships: data.cohortMemberships, cohorts: data.cohorts, offerings: data.cohortOfferings });
    const card = data.trainingCards[enrollment.id] ?? { imageUrl: null, headline: experience.name, eyebrow: experience.experience_type, supportingText: experience.description };
    cards.push({ id: enrollment.id, card, href: entries[0].href, action: enrollment.status === "enrolled" && !progress?.started_at ? "Start" : "Continue", meta: `${experience.experience_type.replaceAll("_", " ")} · ${enrollment.status.replaceAll("_", " ")}`, accessedAt: progress?.updated_at ?? enrollment.updated_at, entries });
  }
  if (lmu) {
    const count = completedSectionCount(data.lmuSectionProgress.filter((row) => row.assessment_id === lmu.id));
    const moduleKey = lmu.current_module ? SECTION_TO_MODULE[lmu.current_module] : undefined;
    cards.push({ id: lmu.id, card: { ...(data.lmuCard ?? { imageUrl: null, headline: "Life Mapping U", eyebrow: "Assessment", supportingText: null }), supportingText: `${count} of 10 modules complete.` }, href: moduleKey ? `/experiences/life-mapping-u/module/${moduleKey}` : "/experiences/life-mapping-u/original/modules", action: "Continue", meta: `Assessment · ${count} of 10 modules`, accessedAt: lmu.updated_at, entries: [] });
  }
  return cards.sort((a, b) => Date.parse(b.accessedAt) - Date.parse(a.accessedAt) || a.id.localeCompare(b.id));
}
