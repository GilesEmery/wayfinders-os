import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ParticipantCourseCard } from "@/components/platform/ParticipantCourseCard";
import { completedSectionCount } from "@/lib/experiences/lmu/completion";
import { SECTION_TO_MODULE } from "@/lib/experiences/lmu/persistence";
import { getWayfinderDashboard } from "@/lib/platform/dashboard";
import { resolveParticipantCourseEntries } from "@/lib/platform/participant-course-context";

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
  const latestLmu = data.lmuAssessments[0];
  const completedSections = latestLmu ? completedSectionCount(data.lmuSectionProgress.filter((row) => row.assessment_id === latestLmu.id)) : 0;
  const experienceById = new Map(data.experiences.map((item) => [item.id, item]));
  const progressByEnrollment = new Map(data.progress.map((item) => [item.enrollment_id, item]));
  const journey = data.enrollments.map((enrollment) => ({ enrollment, experience: experienceById.get(enrollment.experience_id), progress: progressByEnrollment.get(enrollment.id) }));
  const active = journey.filter(({ enrollment, progress }) => progress?.status === "in_progress" || enrollment.status === "in_progress");
  const completed = journey.filter(({ enrollment, progress }) => progress?.status === "completed" || enrollment.status === "completed");
  const memberships = [
    ...data.cohortMemberships.map((item) => ({ key: `cohort-${item.cohort_id}`, name: data.cohorts.find((cohort) => cohort.id === item.cohort_id)?.name ?? "Cohort", kind: "Cohort", role: item.membership_role })),
    ...data.organizationMemberships.map((item) => ({ key: `org-${item.organization_id}`, name: data.organizations.find((organization) => organization.id === item.organization_id)?.name ?? "Community", kind: "Community", role: item.membership_role })),
  ];
  const hubContexts = data.hubMemberships.flatMap((membership) => {
    const hub = data.hubs.find((item) => item.id === membership.hub_id);
    return hub ? [{ ...hub, role: membership.membership_role, memberCount: data.hubMemberCatalog.filter((item) => item.hub_id === hub.id).length }] : [];
  });
  const primaryHub = hubContexts.find((hub) => hub.id === data.defaultHubId) ?? (hubContexts.length === 1 ? hubContexts[0] : null);
  const courseEntries = active.flatMap(({ enrollment, experience }) => experience?.slug ? resolveParticipantCourseEntries({ enrollment, experience, memberships: data.cohortMemberships, cohorts: data.cohorts, offerings: data.cohortOfferings }).map((entry) => ({ entry, enrollment, experience })) : []);
  const recent = [
    ...data.lmuAssessments.map((item) => ({ date: item.updated_at, label: `Life Mapping U · ${titleCase(item.status)}` })),
    ...journey.map(({ enrollment, experience }) => ({ date: enrollment.updated_at, label: `${experience?.name ?? "PurposeOS experience"} · ${titleCase(enrollment.status)}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const currentLmuModule = latestLmu?.current_module ? SECTION_TO_MODULE[latestLmu.current_module] : undefined;
  const continueLmuHref = latestLmu?.status === "completed" ? "/experiences/life-mapping-u/module/your-life-map" : currentLmuModule ? `/experiences/life-mapping-u/module/${currentLmuModule}` : "/experiences/life-mapping-u/original/modules";
  const lmuCard = { ...(data.lmuCard ?? { imageUrl: null, eyebrow: "Assessment", headline: "Life Mapping U", supportingText: "Understand your story, strengths, values, and direction." }), supportingText: latestLmu?.status === "completed" ? "Your completed Life Map is ready to revisit." : latestLmu ? `${completedSections} of 10 modules complete${latestLmu.current_module ? ` · Continue with ${titleCase(latestLmu.current_module)}` : ""}.` : data.lmuCard?.supportingText ?? "Understand your story, strengths, values, and direction." };
  const activeCount = active.length + (latestLmu?.status === "in_progress" ? 1 : 0);
  const completedCount = completed.length + (latestLmu?.status === "completed" ? 1 : 0);

  return <PlatformShell><main className="wayfinder-dashboard purpose-home" id="overview">
    <header className="dashboard-welcome"><p className="platform-eyebrow">My Dashboard</p><h1>Welcome back, {name}</h1><p>Continue your journey, see what is taking shape, and pick up where you left off.</p></header>
    <section className="dashboard-my-hub" aria-labelledby="my-hub-heading">
      {primaryHub ? <><div className="dashboard-my-hub-copy"><p className="platform-eyebrow">My Hub</p><h2 id="my-hub-heading">{primaryHub.name}</h2>{primaryHub.description && <p>{primaryHub.description}</p>}</div><div className="dashboard-my-hub-context">{hubLocation(primaryHub.location) && <span>{hubLocation(primaryHub.location)}</span>}<span>{titleCase(primaryHub.role)}</span>{primaryHub.memberCount > 0 && <span>{primaryHub.memberCount} {primaryHub.memberCount === 1 ? "member" : "members"}</span>}</div><Link href={`/hubs/${primaryHub.slug}`}>View Hub →</Link></> : hubContexts.length > 1 ? <><div className="dashboard-my-hub-copy"><p className="platform-eyebrow">My Hubs</p><h2 id="my-hub-heading">You belong to {hubContexts.length} Wayfinder Hubs</h2><p>Choose a default Hub from a Hub page to make it your primary context here.</p></div><div className="dashboard-my-hub-list">{hubContexts.map((hub) => <Link href={`/hubs/${hub.slug}`} key={hub.id}>{hub.name} →</Link>)}</div></> : <div className="dashboard-my-hub-copy"><p className="platform-eyebrow">My Hub</p><h2 id="my-hub-heading">You are not connected to a Wayfinder Hub yet.</h2><p>Hubs are local communities where Wayfinders connect, learn, grow, and pursue impact together.</p></div>}
    </section>
    <section className="dashboard-section dashboard-continue" aria-labelledby="continue-heading">
      <header className="dashboard-section-heading"><div><p>What matters now</p><h2 id="continue-heading">Continue Your Journey</h2></div><Link href="/trainings">View all →</Link></header>
      <div className="dashboard-continue-cards">
        {latestLmu?.status === "in_progress" && <ParticipantCourseCard card={lmuCard} href={continueLmuHref} actionLabel="Continue" meta={`Assessment · ${completedSections} of 10 modules`} variant="horizontal"/>}
        {courseEntries.slice(0, latestLmu?.status === "in_progress" ? 2 : 3).map(({ entry, enrollment, experience }) => data.trainingCards[enrollment.id] ? <ParticipantCourseCard key={`${enrollment.id}-${entry.cohortId ?? "personal"}`} card={data.trainingCards[enrollment.id]!} href={entry.href} actionLabel="Continue" meta={entry.type === "cohort" ? `${entry.cohortName} · ${titleCase(entry.role)}` : `${titleCase(experience?.experience_type)} · In progress`} variant="horizontal"/> : null)}
        {latestLmu?.status !== "in_progress" && !courseEntries.length && <p className="dashboard-empty dashboard-empty-large">Nothing is currently in progress. Experiences you begin will appear here.</p>}
      </div>
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
    <div className="dashboard-anchor-targets" aria-hidden="true"><span id="trainings"/><span id="assessments"/></div>
  </main></PlatformShell>;
}
