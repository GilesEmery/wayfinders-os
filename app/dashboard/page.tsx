import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ParticipantCourseCard } from "@/components/platform/ParticipantCourseCard";
import { assessmentProgress, completedSectionCount } from "@/lib/experiences/lmu/completion";
import { SECTION_TO_MODULE } from "@/lib/experiences/lmu/persistence";
import { getWayfinderDashboard } from "@/lib/platform/dashboard";
import { featuredParticipantCourseEntry, resolveParticipantCourseEntries } from "@/lib/platform/participant-course-context";

export const metadata: Metadata = { title: "My Dashboard" };

function titleCase(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not started";
}

export default async function DashboardPage() {
  const data = await getWayfinderDashboard();
  if (!data) return <PlatformShell><PlatformAuthGate /></PlatformShell>;
  if ("error" in data) return <PlatformShell><main className="wayfinder-dashboard"><p>{data.error}</p></main></PlatformShell>;

  const name = data.participant.full_name || data.participant.first_name;
  const latestLmu = data.lmuAssessments[0];
  const completedSections = latestLmu ? completedSectionCount(data.lmuSectionProgress.filter((row) => row.assessment_id === latestLmu.id)) : 0;
  const lmuProgress = latestLmu ? assessmentProgress(latestLmu.status, completedSections) : 0;
  const experienceById = new Map(data.experiences.map((item) => [item.id, item]));
  const progressByEnrollment = new Map(data.progress.map((item) => [item.enrollment_id, item]));
  const genericJourney = data.enrollments.map((enrollment) => ({ enrollment, experience: experienceById.get(enrollment.experience_id), progress: progressByEnrollment.get(enrollment.id) }));
  const activeJourney = genericJourney.filter(({ enrollment, progress }) => progress?.status === "in_progress" || enrollment.status === "in_progress");
  const completedJourney = genericJourney.filter(({ enrollment, progress }) => progress?.status === "completed" || enrollment.status === "completed");
  const trainings = genericJourney.filter(({ experience }) => experience?.experience_type !== "assessment");
  const organizations = new Map(data.organizations.map((item) => [item.id, item.name]));
  const hubs = new Map(data.hubs.map((item) => [item.id, item.name]));
  const cohorts = new Map(data.cohorts.map((item) => [item.id, item.name]));
  const courseEntriesByEnrollment = new Map(genericJourney.flatMap(({ enrollment, experience }) => experience?.slug ? [[enrollment.id, resolveParticipantCourseEntries({ enrollment, experience, memberships: data.cohortMemberships, cohorts: data.cohorts, offerings: data.cohortOfferings })] as const] : []));
  const visibleTrainingEntries = trainings.flatMap(({ enrollment, experience }) => (courseEntriesByEnrollment.get(enrollment.id) ?? []).map((entry) => ({ entry, enrollment, experience })));
  const recent = [
    ...data.lmuAssessments.map((item) => ({ date: item.updated_at, label: `Life Mapping U · ${titleCase(item.status)}` })),
    ...genericJourney.map(({ enrollment, experience }) => ({ date: enrollment.updated_at, label: `${experience?.name ?? "Purpose OS experience"} · ${titleCase(enrollment.status)}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const currentLmuModule = latestLmu?.current_module ? SECTION_TO_MODULE[latestLmu.current_module] : undefined;
  const continueLmuHref = latestLmu?.status === "completed" ? "/experiences/life-mapping-u/module/your-life-map" : currentLmuModule ? `/experiences/life-mapping-u/module/${currentLmuModule}` : "/experiences/life-mapping-u/original/modules";
  const lmuCard = { ...(data.lmuCard ?? { imageUrl: null, eyebrow: "Assessment", headline: "Life Mapping U", supportingText: "Understand your story, strengths, values, and direction." }), supportingText: latestLmu?.status === "completed" ? "Your completed Life Map is ready to revisit." : latestLmu ? `${completedSections} of 10 modules complete. Continue from ${titleCase(latestLmu.current_module)}.` : data.lmuCard?.supportingText ?? "Understand your story, strengths, values, and direction." };
  const adminRole = data.capabilities.globalRole;

  return <PlatformShell><div className="purpose-dashboard-layout"><div className="wayfinder-dashboard" id="overview">
    <header className="dashboard-welcome"><p className="platform-eyebrow">My Journey</p><h1>Welcome back, {name}</h1><p>Your Purpose OS journey home—what is active, what you have completed, and where you can continue.</p></header>
    <section className="dashboard-summary" aria-label="Journey summary">
      <div><span>Active experiences</span><strong>{activeJourney.length + (latestLmu?.status === "in_progress" ? 1 : 0)}</strong></div>
      <div><span>Completed experiences</span><strong>{completedJourney.length + (latestLmu?.status === "completed" ? 1 : 0)}</strong></div>
      <div><span>Communities</span><strong>{data.organizationMemberships.length + data.hubMemberships.length + data.cohortMemberships.length}</strong></div>
    </section>

    <section className="dashboard-section dashboard-continue"><header><p>Journey first</p><h2>Continue Your Journey</h2></header><div className="dashboard-continue-cards">
      {latestLmu && <ParticipantCourseCard card={lmuCard} href={continueLmuHref} actionLabel={latestLmu.status === "completed" ? "View Results" : "Continue"} meta={`Assessment · ${titleCase(latestLmu.status)}`} variant="horizontal"/>}
      {activeJourney.map(({ enrollment, experience }) => { const entry = featuredParticipantCourseEntry(courseEntriesByEnrollment.get(enrollment.id) ?? []); return experience?.slug && entry && data.trainingCards[enrollment.id] ? <ParticipantCourseCard key={enrollment.id} card={data.trainingCards[enrollment.id]!} href={entry.href} actionLabel="Continue Course" meta={entry.type === "cohort" ? `${entry.cohortName} · ${titleCase(entry.role)}` : `${titleCase(experience.experience_type)} · In Progress`} variant="horizontal"/> : null; })}
      {!latestLmu && !activeJourney.length && <p className="dashboard-empty">Nothing is currently in progress. Experiences you begin will appear here.</p>}
    </div></section>

    <div className="dashboard-columns">
      <section className="dashboard-section dashboard-assessment-list" id="assessments"><header><h2>My Assessments</h2></header>{latestLmu ? <div className="participant-course-card-list"><ParticipantCourseCard card={lmuCard} href={continueLmuHref} actionLabel={latestLmu.status === "completed" ? "View Results" : "Continue Assessment"} meta={`${titleCase(latestLmu.status)} · ${lmuProgress}% activity complete`}/></div> : <p className="dashboard-empty">No assessments started yet.</p>}</section>
      <section className="dashboard-section dashboard-training-list" id="trainings"><header><h2>My Trainings</h2></header>{visibleTrainingEntries.length ? <div className="participant-course-card-list">{visibleTrainingEntries.map(({ entry, enrollment }) => data.trainingCards[enrollment.id] ? <ParticipantCourseCard key={`${enrollment.id}-${entry.cohortId ?? "personal"}`} card={data.trainingCards[enrollment.id]!} href={entry.href} actionLabel={enrollment.status === "in_progress" ? "Continue Course" : "Open Course"} meta={entry.type === "cohort" ? `${entry.cohortName} · ${titleCase(entry.role)}` : `${titleCase(enrollment.status)} · Personal journey`}/> : null)}</div> : <p className="dashboard-empty">No trainings yet. Trainings appear here only after you enroll.</p>}</section>
      <section className="dashboard-section" id="certificates"><header><h2>My Certificates</h2></header><p className="dashboard-empty">No certificates yet. Certificates earned through eligible Purpose OS experiences will appear here.</p></section>
      <section className="dashboard-section" id="community"><header><h2>My Hubs &amp; Communities</h2></header>{data.organizationMemberships.map((item) => <div className="dashboard-record" key={`org-${item.organization_id}`}><div><strong>{organizations.get(item.organization_id) ?? "Organization"}</strong><span>Organization · {titleCase(item.membership_role)}</span></div></div>)}{data.hubMemberships.map((item) => <div className="dashboard-record" key={`hub-${item.hub_id}`}><div><strong>{hubs.get(item.hub_id) ?? "Hub"}</strong><span>Hub · {titleCase(item.membership_role)}</span></div></div>)}{data.cohortMemberships.map((item) => <div className="dashboard-record" key={`cohort-${item.cohort_id}`}><div><strong>{cohorts.get(item.cohort_id) ?? "Cohort"}</strong><span>Cohort · {titleCase(item.membership_role)}</span></div></div>)}{!data.organizationMemberships.length && !data.hubMemberships.length && !data.cohortMemberships.length && <p className="dashboard-empty">Your organizations, Hubs, and cohorts will appear here when you join them.</p>}</section>
      <section className="dashboard-section"><header><h2>My Events</h2></header><p className="dashboard-empty">No events yet. Registrations and attendance will appear here when Purpose OS events launch.</p></section>
      <section className="dashboard-section"><header><h2>My Progress</h2></header><p className="dashboard-empty">{latestLmu || genericJourney.length ? `${completedJourney.length + (latestLmu?.status === "completed" ? 1 : 0)} completed and ${activeJourney.length + (latestLmu?.status === "in_progress" ? 1 : 0)} active journey items. This reflects activity, not transformation.` : "Your activity across Purpose OS will gather here as your journey begins."}</p></section>
      <section className="dashboard-section"><header><h2>Recent Activity</h2></header>{recent.length ? <ul className="dashboard-activity">{recent.map((item, index) => <li key={`${item.date}-${index}`}><span>{item.label}</span><time dateTime={item.date}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.date))}</time></li>)}</ul> : <p className="dashboard-empty">Your recent Purpose OS activity will appear here.</p>}</section>
      <section className="dashboard-section"><header><h2>My Purpose Profile</h2></header><div className="dashboard-profile"><strong>{name}</strong><span>Wayfinder</span><span>{data.participant.email}</span>{data.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div><Link className="dashboard-text-link" href="/account">Manage Account →</Link></section>
    </div>
    <section className="dashboard-section dashboard-recommendations"><header><h2>Recommended Next Steps</h2></header><p className="dashboard-empty">Personalized pathway recommendations are being thoughtfully developed. Nothing will be recommended until Purpose OS has enough real journey context to make it useful.</p></section>
    {adminRole && data.networkOverview && <section className="dashboard-section dashboard-workspaces"><header><p>What I am responsible for</p><h2>Network Overview</h2></header><div className="dashboard-network-summary"><Link href="/admin/users"><span>Wayfinders</span><strong>{data.networkOverview.wayfinders}</strong></Link><Link href="/admin/hubs"><span>Active Hubs</span><strong>{data.networkOverview.activeHubs}</strong></Link><Link href="/admin/partners"><span>Partners</span><strong>{data.networkOverview.partners}</strong></Link></div>{data.networkOverview.recentActivity.length > 0 && <div className="dashboard-operational-activity"><h3>Recent operational activity</h3><ul className="dashboard-activity">{data.networkOverview.recentActivity.map((item) => <li key={item.id}><span>{titleCase(item.action)}</span><time dateTime={item.created_at}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.created_at))}</time></li>)}</ul></div>}<article className="dashboard-access-card"><div><span>{adminRole === "super_admin" ? "Super Admin" : "Admin"}</span><h3>Purpose OS Operations</h3><p>Open the secure operational workspaces linked in your sidebar. Your personal journey remains your dashboard’s first priority.</p></div><Link href="/admin">Open Operations →</Link></article></section>}
  </div></div></PlatformShell>;
}
