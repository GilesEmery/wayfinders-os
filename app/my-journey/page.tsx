import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getWayfinderDashboard } from "@/lib/platform/dashboard";

export const metadata: Metadata = { title: "My Journey" };

export default async function MyJourneyPage() {
  const data = await getWayfinderDashboard();
  if (!data) return <PlatformShell><PlatformAuthGate /></PlatformShell>;
  if ("error" in data) return <PlatformShell><main className="wayfinder-dashboard"><p>{data.error}</p></main></PlatformShell>;
  const active = data.enrollments.filter((item) => item.status === "in_progress").length + data.lmuAssessments.filter((item) => item.status === "in_progress").length;
  const complete = data.enrollments.filter((item) => item.status === "completed").length + data.lmuAssessments.filter((item) => item.status === "completed").length;
  const communities = data.organizationMemberships.length + data.hubMemberships.length + data.cohortMemberships.length;
  return <PlatformShell><main className="wayfinder-dashboard purpose-detail-page"><p className="platform-eyebrow">My Journey</p><h1>The story of where you have been going.</h1><p className="purpose-detail-intro">Your experiences, accomplishments, and communities will gather here over time.</p><div className="dashboard-summary"><div><span>Active experiences</span><strong>{active}</strong></div><div><span>Completed experiences</span><strong>{complete}</strong></div><div><span>Communities &amp; cohorts</span><strong>{communities}</strong></div></div><section className="dashboard-section"><h2>Journey timeline</h2><p className="dashboard-empty">A richer timeline of trainings, assessments, milestones, badges, and certificates will grow here as those records become available.</p></section><Link className="dashboard-back-link" href="/dashboard">← Back to My Dashboard</Link></main></PlatformShell>;
}
