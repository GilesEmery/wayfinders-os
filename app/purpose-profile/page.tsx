import { OwnSavedResponseLibrary } from "@/components/platform/OwnSavedResponseLibrary";
import { loadOwnResponseLibraryIndex } from "@/lib/platform/response-library";
import type { Metadata } from "next";
import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";

export const metadata: Metadata = { title: "Purpose Profile" };
const dimensions = ["Story", "Gifts", "Strengths", "Skills", "Passions", "Values", "Motivators", "Purpose / Calling", "Leadership", "Relationships", "Impact"];

export default async function PurposeProfilePage() {
  const user = await getPlatformUser();
  if (!user) return <PlatformShell><PlatformAuthGate /></PlatformShell>;
  const profile = await ensurePlatformProfile(user);
  if ("error" in profile) return <PlatformShell><main className="wayfinder-dashboard"><p>{profile.error}</p></main></PlatformShell>;
  const saved = await loadOwnResponseLibraryIndex();
  return <PlatformShell><main className="wayfinder-dashboard purpose-detail-page"><p className="platform-eyebrow">Purpose Profile</p><h1>What you are discovering about who you are.</h1><p className="purpose-detail-intro">Your Purpose Profile takes shape through trainings, assessments, and experiences. It is a place for discovery, not another form to complete.</p><div className="purpose-profile-dimensions">{dimensions.map((dimension) => <article key={dimension}><span>{dimension}</span><strong>Not explored yet</strong></article>)}</div><p className="dashboard-empty purpose-profile-note">Specific discoveries will appear here when PurposeOS has a compatible source for them. Nothing has been invented to fill this space.</p><section className="purpose-profile-saved-work"><h2>Your Experiences</h2><p>Open a course, training, or assessment to see your saved information.</p>{saved && <OwnSavedResponseLibrary data={saved} viewerAuthUserId={saved.viewerAuthUserId}/>}</section><Link className="dashboard-back-link" href="/dashboard">← Back to My Dashboard</Link></main></PlatformShell>;
}
