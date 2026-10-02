import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ParticipantCourseCard } from "@/components/platform/ParticipantCourseCard";
import { listCompletedAssessmentResults } from "@/lib/assessment-results";
import { visibleCanonicalJourneyCompletion } from "@/lib/platform/journey-policy";
import { getWayfinderDashboard } from "@/lib/platform/dashboard";

import { resolveParticipantCourseEntries } from "@/lib/platform/participant-course-context";
import { activeJourneyCards } from "@/lib/platform/active-journey";

export const metadata: Metadata = { title: "My Journey" };

export default async function MyJourneyPage() {
  const data = await getWayfinderDashboard();
  if (!data) return <PlatformShell><PlatformAuthGate /></PlatformShell>;
  if ("error" in data) return <PlatformShell><main className="wayfinder-dashboard"><p>{data.error}</p></main></PlatformShell>;
  const activeCards = activeJourneyCards(data);
  const active = activeCards.length;
  const results = await listCompletedAssessmentResults(data.participant.id);
  const experienceById = new Map(data.experiences.map((item) => [item.id, item]));
  const records = data.completionRecords.flatMap((record) => {
    const experience = experienceById.get(record.experienceId);
    const card = data.trainingCards[record.id] ?? data.trainingCards[record.enrollmentId] ?? (experience ? { imageUrl: null, headline: experience.name, eyebrow: experience.experience_type, supportingText: experience.description } : null);
    if (!experience || !card || !visibleCanonicalJourneyCompletion(experience.slug, results.some((result) => result.kind === "life-mapping-u"))) return [];
    const entries = resolveParticipantCourseEntries({ enrollment: { id: record.enrollmentId, experience_id: record.experienceId, experience_version_id: record.versionId }, experience, memberships: data.cohortMemberships, cohorts: data.cohorts, offerings: data.cohortOfferings });
    const revisitHref = entries[0].href;
    const result = results.find((result) => result.kind === experience.slug && result.enrollmentId === record.enrollmentId && result.versionId === record.versionId && Date.parse(result.completedAt) === Date.parse(record.completedAt));
    return [{ id: record.id, card, completedAt: record.completedAt, href: result ? `/account/results/${result.kind}/${result.id}` : revisitHref, action: result ? "View results" : "Revisit", title: experience.name, revisitHref }];
  });
  for (const result of results.filter((item) => item.kind === "life-mapping-u")) {
    records.push({ id: result.id, card: data.lmuCard ?? { imageUrl: null, eyebrow: "Assessment", headline: result.name, supportingText: "Your completed Life Map." }, completedAt: result.completedAt, href: `/account/results/${result.kind}/${result.id}`, action: "View results", title: result.name, revisitHref: "/experiences/life-mapping-u/original/modules" });
  }
  records.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const complete = records.length;
  const communities = data.organizationMemberships.length + data.hubMemberships.length + data.cohortMemberships.length;
  return <PlatformShell><main className="wayfinder-dashboard purpose-detail-page"><p className="platform-eyebrow">My Journey</p><h1>The story of where you have been going.</h1><p className="purpose-detail-intro">Your enrolled experiences and completed journeys, all in one place.</p><div className="dashboard-summary"><div><span>Active experiences</span><strong>{active}</strong></div><div><span>Completed experiences</span><strong>{complete}</strong></div><div><span>Communities &amp; cohorts</span><strong>{communities}</strong></div></div><section className="dashboard-section"><h2>Active experiences ({active})</h2><div className="participant-course-card-list">{activeCards.map((item) => <div key={item.id}><ParticipantCourseCard card={item.card} href={item.href} actionLabel={item.action} meta={item.meta}/>{item.entries.length > 1 && <nav className="dashboard-cohort-contexts" aria-label={`${item.card.headline} cohorts`}>{item.entries.map((entry) => <Link key={entry.cohortId} href={entry.href}>{entry.cohortName} →</Link>)}</nav>}</div>)}{!active && <p className="dashboard-empty">You have no active experiences yet.</p>}</div></section><section className="dashboard-section"><h2>Completed experiences ({complete})</h2><div className="participant-course-card-list">{records.map((record) => <ParticipantCourseCard key={record.id} card={record.card} href={record.href} actionLabel={record.action} secondaryAction={record.action === "View results" ? { href: record.revisitHref, label: "Revisit" } : undefined} meta={`Completed ${new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(record.completedAt))}`}/>)}{!records.length && <p className="dashboard-empty">Experiences you complete will appear here.</p>}</div></section><Link className="dashboard-back-link" href="/dashboard">← Back to My Dashboard</Link></main></PlatformShell>;
}
