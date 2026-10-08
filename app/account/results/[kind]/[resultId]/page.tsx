import { notFound } from "next/navigation";
import { CompletedAssessmentResult } from "@/components/assessment-results/CompletedAssessmentResult";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { loadCompletedAssessmentResult, type AssessmentResultKind } from "@/lib/assessment-results";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";

const KINDS = new Set<AssessmentResultKind>(["circle-of-influence", "life-mapping-u", "personal-impact-statement", "start-something", "activate-your-purpose", "wayfinders-ethos", "launching-your-wayfinders-hub"]);

export default async function AccountResultPage({ params }: { params: Promise<{ kind: string; resultId: string }> }) {
  const user = await getPlatformUser();
  if (!user) return <PlatformShell><PlatformAuthGate/></PlatformShell>;
  const profile = await ensurePlatformProfile(user);
  if ("error" in profile) notFound();
  const { kind, resultId } = await params;
  if (!KINDS.has(kind as AssessmentResultKind)) notFound();
  const result = await loadCompletedAssessmentResult(profile.participant.id, kind as AssessmentResultKind, resultId);
  if (!result) notFound();
  return <PlatformShell><main className="assessment-result-page"><CompletedAssessmentResult result={result}/></main></PlatformShell>;
}
