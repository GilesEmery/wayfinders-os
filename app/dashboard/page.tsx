import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { assessmentProgress, completedSectionCount } from "@/lib/experiences/lmu/completion";
import { SECTION_TO_MODULE } from "@/lib/experiences/lmu/persistence";
import { getWayfinderDashboard } from "@/lib/platform/dashboard";

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
  const recent = [
    ...data.lmuAssessments.map((item) => ({ date: item.updated_at, label: `Life Mapping U · ${titleCase(item.status)}` })),
    ...genericJourney.map(({ enrollment, experience }) => ({ date: enrollment.updated_at, label: `${experience?.name ?? "Purpose OS experience"} · ${titleCase(enrollment.status)}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const currentLmuModule = latestLmu?.current_module ? SECTION_TO_MODULE[latestLmu.current_module] : undefined;
  const continueLmuHref = latestLmu?.status === "completed" ? "/experiences/life-mapping-u/module/your-life-map" : currentLmuModule ? `/experiences/life-mapping-u/module/${currentLmuModule}` : "/experiences/life-mapping-u/original/modules";

  return <PlatformShell><main className="wayfinder-dashboard">
    <header className="dashboard-welcome"><p className="platform-eyebrow">My Dashboard</p><h1>Welcome back, {name}</h1><p>Your Purpose OS journey home—what is active, what you have completed, and where you can continue.</p></header>
    <section className="dashboard-summary" aria-label="Journey summary">
      <div><span>Active experiences</span><strong>{activeJourney.length + (latestLmu?.status === "in_progress" ? 1 : 0)}</strong></div>
      <div><span>Completed experiences</span><strong>{completedJourney.length + (latestLmu?.status === "completed" ? 1 : 0)}</strong></div>
      <div><span>Communities</span><strong>{data.organizationMemberships.length + data.hubMemberships.length + data.cohortMemberships.length}</strong></div>
    </section>

    <section className="dashboard-section dashboard-continue"><header><p>Journey first</p><h2>Continue Your Journey</h2></header>
      {latestLmu && <article className="dashboard-journey-card is-lmu"><div><span>Assessment · {titleCase(latestLmu.status)}</span><h3>Life Mapping U</h3><p>{latestLmu.status === "completed" ? "Your completed Life Map is ready to revisit." : `${completedSections} of 10 modules complete. Continue from ${titleCase(latestLmu.current_module)}.`}</p></div><Link href={continueLmuHref}>{latestLmu.status === "completed" ? "View Results" : "Continue"} →</Link></article>}
      {activeJourney.map(({ enrollment, experience }) => <article className="dashboard-journey-card" key={enrollment.id} style={{ "--journey-accent": experience?.accent_color ?? "#303534" } as React.CSSProperties}><div><span>{titleCase(experience?.experience_type)} · In Progress</span><h3>{experience?.name ?? "Purpose OS Experience"}</h3><p>Your enrollment and activity are saved.</p></div><Link href={`/experience/${experience?.slug ?? ""}`}>Continue →</Link></article>)}
      {!latestLmu && !activeJourney.length && <p className="dashboard-empty">Nothing is currently in progress. Experiences you begin will appear here.</p>}
    </section>

    <div className="dashboard-columns">
      <section className="dashboard-section"><header><h2>My Assessments</h2></header>{latestLmu ? <div className="dashboard-record"><div><strong>Life Mapping U</strong><span>{titleCase(latestLmu.status)} · {lmuProgress}% activity complete</span></div><Link href={continueLmuHref}>{latestLmu.status === "completed" ? "View Results" : "Continue"}</Link></div> : <p className="dashboard-empty">No assessments started yet.</p>}</section>
      <section className="dashboard-section"><header><h2>My Trainings</h2></header>{trainings.length ? trainings.map(({ enrollment, experience }) => <div className="dashboard-record" key={enrollment.id}><div><strong>{experience?.name ?? "Purpose OS Training"}</strong><span>{titleCase(enrollment.status)}</span></div></div>) : <p className="dashboard-empty">No trainings yet. Trainings appear here only after you enroll.</p>}</section>
      <section className="dashboard-section"><header><h2>My Certificates</h2></header><p className="dashboard-empty">No certificates yet. Certificates earned through eligible Purpose OS experiences will appear here.</p></section>
      <section className="dashboard-section"><header><h2>My Hubs &amp; Communities</h2></header>{data.organizationMemberships.map((item) => <div className="dashboard-record" key={`org-${item.organization_id}`}><div><strong>{organizations.get(item.organization_id) ?? "Organization"}</strong><span>Organization · {titleCase(item.membership_role)}</span></div></div>)}{data.hubMemberships.map((item) => <div className="dashboard-record" key={`hub-${item.hub_id}`}><div><strong>{hubs.get(item.hub_id) ?? "Hub"}</strong><span>Hub · {titleCase(item.membership_role)}</span></div></div>)}{data.cohortMemberships.map((item) => <div className="dashboard-record" key={`cohort-${item.cohort_id}`}><div><strong>{cohorts.get(item.cohort_id) ?? "Cohort"}</strong><span>Cohort · {titleCase(item.membership_role)}</span></div></div>)}{!data.organizationMemberships.length && !data.hubMemberships.length && !data.cohortMemberships.length && <p className="dashboard-empty">Your organizations, Hubs, and cohorts will appear here when you join them.</p>}</section>
      <section className="dashboard-section"><header><h2>My Events</h2></header><p className="dashboard-empty">No events yet. Registrations and attendance will appear here when Purpose OS events launch.</p></section>
      <section className="dashboard-section"><header><h2>My Progress</h2></header><p className="dashboard-empty">{latestLmu || genericJourney.length ? `${completedJourney.length + (latestLmu?.status === "completed" ? 1 : 0)} completed and ${activeJourney.length + (latestLmu?.status === "in_progress" ? 1 : 0)} active journey items. This reflects activity, not transformation.` : "Your activity across Purpose OS will gather here as your journey begins."}</p></section>
      <section className="dashboard-section"><header><h2>Recent Activity</h2></header>{recent.length ? <ul className="dashboard-activity">{recent.map((item, index) => <li key={`${item.date}-${index}`}><span>{item.label}</span><time dateTime={item.date}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.date))}</time></li>)}</ul> : <p className="dashboard-empty">Your recent Purpose OS activity will appear here.</p>}</section>
      <section className="dashboard-section"><header><h2>My Purpose Profile</h2></header><div className="dashboard-profile"><strong>{name}</strong><span>Wayfinder</span><span>{data.participant.email}</span>{data.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div><Link className="dashboard-text-link" href="/account">Manage Account →</Link></section>
    </div>
    <section className="dashboard-section dashboard-recommendations"><header><h2>Recommended Next Steps</h2></header><p className="dashboard-empty">Personalized pathway recommendations are being thoughtfully developed. Nothing will be recommended until Purpose OS has enough real journey context to make it useful.</p></section>
  </main></PlatformShell>;
}
