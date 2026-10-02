import type { Metadata } from "next";
import { AssessmentResultsList } from "@/components/assessment-results/AssessmentResultsList";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { listCompletedAssessmentResults } from "@/lib/assessment-results";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";

export const metadata: Metadata = { title: "My Results" };

export default async function AccountResultsPage() {
  const user = await getPlatformUser();
  if (!user) return <PlatformShell><PlatformAuthGate/></PlatformShell>;
  const profile = await ensurePlatformProfile(user);
  if ("error" in profile) return <PlatformShell><main className="assessment-results-page"><p>{profile.error}</p></main></PlatformShell>;
  const results = await listCompletedAssessmentResults(profile.participant.id);
  return <PlatformShell><main className="assessment-results-page"><header><p className="platform-eyebrow">My Profile</p><h1>My Guided Experience Results</h1><p>Return to your completed results and print or save a polished copy. Private drafts and unfinished work are never listed here.</p></header><AssessmentResultsList results={results} href={(result) => `/account/results/${result.kind}/${result.id}`}/></main></PlatformShell>;
}
