import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ParticipantCourseCard } from "@/components/platform/ParticipantCourseCard";
import { activeJourneyCards } from "@/lib/platform/active-journey";
import { visibleCanonicalJourneyCompletion } from "@/lib/platform/journey-policy";
import { getWayfinderDashboard } from "@/lib/platform/dashboard";

export const metadata: Metadata = { title: "My Dashboard" };

function titleCase(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not started";
}

function hubLocation(location: unknown) {
  if (!location || typeof location !== "object" || Array.isArray(location)) return null;
  const record = location as Record<string, unknown>;
  return [record.city, record.region ?? record.state, record.country].filter((value): value is string => typeof value === "string" && Boolean(value.trim())).join(", ") || null;
}

export default async function DashboardPage() {
  const data = await getWayfinderDashboard();
  if (!data) return <PlatformShell><PlatformAuthGate /></PlatformShell>;
  if ("error" in data) return <PlatformShell><main className="wayfinder-dashboard"><p>{data.error}</p></main></PlatformShell>;

  const name = data.participant.first_name || data.participant.full_name || "Wayfinder";
  const experienceById = new Map(data.experiences.map((item) => [item.id, item]));
  const canonicalJourney = data.enrollments.map((enrollment) => ({ enrollment, experience: experienceById.get(enrollment.experience_id) }));
  const activeCards = activeJourneyCards(data);
  const memberships = [
    ...data.cohortMemberships.map((item) => ({ key: `cohort-${item.cohort_id}`, name: data.cohorts.find((cohort) => cohort.id === item.cohort_id)?.name ?? "Cohort", kind: "Cohort", role: item.membership_role })),
    ...data.organizationMemberships.map((item) => ({ key: `org-${item.organization_id}`, name: data.organizations.find((organization) => organization.id === item.organization_id)?.name ?? "Community", kind: "Community", role: item.membership_role })),
  ];
  const hubContexts = data.hubMemberships.flatMap((membership) => {
    const hub = data.hubs.find((item) => item.id === membership.hub_id);
    return hub ? [{ ...hub, role: membership.membership_role, memberCount: data.hubMemberCatalog.filter((item) => item.hub_id === hub.id).length }] : [];
  });
  const primaryHub = hubContexts.find((hub) => hub.id === data.defaultHubId) ?? (hubContexts.length === 1 ? hubContexts[0] : null);
  const recent = [
    ...data.lmuAssessments.map((item) => ({ date: item.updated_at, label: `Life Mapping U · ${titleCase(item.status)}` })),
    ...canonicalJourney.map(({ enrollment, experience }) => ({ date: enrollment.updated_at, label: `${experience?.name ?? "PurposeOS experience"} · ${titleCase(enrollment.status)}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const activeCount = activeCards.length;
  const completedCount = data.completionRecords.filter((item) => visibleCanonicalJourneyCompletion(experienceById.get(item.experienceId)?.slug, data.lmuAssessments.some((assessment) => assessment.status === "completed"))).length + data.lmuAssessments.filter((item) => item.status === "completed").length;

  return <PlatformShell><main className="wayfinder-dashboard purpose-home" id="overview">
    <header className="dashboard-welcome"><p className="platform-eyebrow">My Dashboard</p><h1>Welcome back, {name}</h1><p>Continue your journey, see what is taking shape, and pick up where you left off.</p></header>
    <section className="dashboard-my-hub" aria-labelledby="my-hub-heading">
      {primaryHub ? <><div className="dashboard-my-hub-copy"><p className="platform-eyebrow">My Hub</p><h2 id="my-hub-heading">{primaryHub.name}</h2>{primaryHub.description && <p>{primaryHub.description}</p>}</div><div className="dashboard-my-hub-context">{hubLocation(primaryHub.location) && <span>{hubLocation(primaryHub.location)}</span>}<span>{titleCase(primaryHub.role)}</span>{primaryHub.memberCount > 0 && <span>{primaryHub.memberCount} {primaryHub.memberCount === 1 ? "member" : "members"}</span>}</div><Link href={`/hubs/${primaryHub.slug}`}>View Hub →</Link></> : hubContexts.length > 1 ? <><div className="dashboard-my-hub-copy"><p className="platform-eyebrow">My Hubs</p><h2 id="my-hub-heading">You belong to {hubContexts.length} Wayfinder Hubs</h2><p>Choose a default Hub from a Hub page to make it your primary context here.</p></div><div className="dashboard-my-hub-list">{hubContexts.map((hub) => <Link href={`/hubs/${hub.slug}`} key={hub.id}>{hub.name} →</Link>)}</div></> : <div className="dashboard-my-hub-copy"><p className="platform-eyebrow">My Hub</p><h2 id="my-hub-heading">You are not connected to a Wayfinder Hub yet.</h2><p>Hubs are local communities where Wayfinders connect, learn, grow, and pursue impact together.</p></div>}
    </section>
    <section className="dashboard-section dashboard-continue" id="trainings" aria-labelledby="continue-heading">
      <header className="dashboard-section-heading"><div><p>What matters now</p><h2 id="continue-heading">Continue Your Journey</h2></div><Link href="/my-journey">View all →</Link></header>
      {[false, true].map(isAssessment => {
        const categoryCards = activeCards.filter(item => item.isAssessment === isAssessment);
        return <section className="experience-category" key={String(isAssessment)}><h3>{isAssessment ? "Assessments" : "Trainings"}</h3><div className="dashboard-continue-cards">
        {categoryCards.slice(0, 3).map((item) => <div key={item.id}><ParticipantCourseCard card={item.card} href={item.href} actionLabel={item.action} meta={item.meta} variant="horizontal"/>{item.entries.length > 1 && <nav className="dashboard-cohort-contexts" aria-label={`${item.card.headline} cohorts`}>{item.entries.map((entry) => <Link key={entry.cohortId} href={entry.href}>{entry.cohortName} · {titleCase(entry.role)} →</Link>)}</nav>}</div>)}
        {!categoryCards.length && <p className="dashboard-empty dashboard-empty-large">No {isAssessment ? "assessments" : "trainings"} are currently in progress. Those you begin will appear here.</p>}
      </div></section>;
      })}
    </section>
    <div className="dashboard-priority-grid">
      <section className="dashboard-section dashboard-purpose-profile"><header><p>Discovering who I am</p><h2>Purpose Profile</h2></header><p>Your Purpose Profile will take shape as you move through PurposeOS.</p><div className="dashboard-profile-states"><div><span>Story</span><strong>Still to explore</strong></div><div><span>Values</span><strong>Not explored yet</strong></div><div><span>Skills</span><strong>Still to explore</strong></div><div><span>Purpose</span><strong>Still taking shape</strong></div></div><Link className="dashboard-text-link" href="/purpose-profile">View profile →</Link></section>
      <section className="dashboard-section dashboard-journey-preview"><header><p>The story so far</p><h2>My Journey</h2></header><div className="dashboard-journey-counts"><div><strong>{activeCount}</strong><span>Active experiences</span></div><div><strong>{completedCount}</strong><span>Completed experiences</span></div><div><strong>{memberships.length}</strong><span>Communities &amp; cohorts</span></div></div><Link className="dashboard-text-link" href="/my-journey">View full journey →</Link></section>
      <section className="dashboard-section dashboard-upcoming"><header><p>Looking ahead</p><h2>Upcoming</h2></header><p className="dashboard-empty">Nothing scheduled yet.</p><p className="dashboard-supporting-copy">Events, cohort gatherings, and other upcoming experiences will appear here.</p></section>
    </div>
    <div className="dashboard-secondary-grid">
      <section className="dashboard-section" id="community"><header className="dashboard-section-heading"><div><p>Who I journey with</p><h2>My Communities</h2></div><Link href="/dashboard#community">View all →</Link></header>{memberships.slice(0, 3).map((item) => <div className="dashboard-record" key={item.key}><div><strong>{item.name}</strong><span>{item.kind} · {titleCase(item.role)}</span></div></div>)}{!memberships.length && <p className="dashboard-empty">Your cohorts, Hubs, and communities will appear here when you join them.</p>}</section>
      <section className="dashboard-section"><header><p>What has been happening</p><h2>Recent Activity</h2></header>{recent.length ? <ul className="dashboard-activity">{recent.map((item, index) => <li key={`${item.date}-${index}`}><span>{item.label}</span><time dateTime={item.date}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(item.date))}</time></li>)}</ul> : <p className="dashboard-empty">Your recent PurposeOS activity will appear here.</p>}</section>
      <section className="dashboard-section dashboard-recommendations"><header><p>When the time is right</p><h2>Recommended Next Steps</h2></header><p className="dashboard-empty">As you complete trainings, assessments, and experiences, PurposeOS will begin surfacing meaningful next steps.</p></section>
    </div>
    <div className="dashboard-anchor-targets" aria-hidden="true"><span id="assessments"/></div>
  </main></PlatformShell>;
}
