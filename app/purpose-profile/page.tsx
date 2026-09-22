import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getWayfinderDashboard } from "@/lib/platform/dashboard";

export const metadata: Metadata = { title: "Purpose Profile" };
const dimensions = ["Story", "Gifts", "Strengths", "Skills", "Passions", "Values", "Motivators", "Purpose / Calling", "Leadership", "Relationships", "Impact"];

export default async function PurposeProfilePage() {
  const data = await getWayfinderDashboard();
  if (!data) return <PlatformShell><PlatformAuthGate /></PlatformShell>;
  if ("error" in data) return <PlatformShell><main className="wayfinder-dashboard"><p>{data.error}</p></main></PlatformShell>;
  return <PlatformShell><main className="wayfinder-dashboard purpose-detail-page"><p className="platform-eyebrow">Purpose Profile</p><h1>What you are discovering about who you are.</h1><p className="purpose-detail-intro">Your Purpose Profile takes shape through trainings, assessments, and experiences. It is a place for discovery, not another form to complete.</p><div className="purpose-profile-dimensions">{dimensions.map((dimension) => <article key={dimension}><span>{dimension}</span><strong>Not explored yet</strong></article>)}</div><p className="dashboard-empty purpose-profile-note">Specific discoveries will appear here when PurposeOS has a compatible source for them. Nothing has been invented to fill this space.</p><Link className="dashboard-back-link" href="/dashboard">← Back to My Dashboard</Link></main></PlatformShell>;
}
