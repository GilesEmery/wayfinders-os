import { notFound } from "next/navigation";
import { CompletedAssessmentResult } from "@/components/assessment-results/CompletedAssessmentResult";
import { AdminShell } from "@/components/admin/AdminShell";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { loadCompletedAssessmentResult, type AssessmentResultKind } from "@/lib/assessment-results";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const KINDS = new Set<AssessmentResultKind>(["circle-of-influence", "life-mapping-u", "personal-impact-statement", "start-something", "activate-your-purpose", "wayfinders-ethos", "launching-your-wayfinders-hub"]);

export default async function AdminResultPage({ params }: { params: Promise<{ userId: string; kind: string; resultId: string }> }) {
  const identity = await requireAdmin();
  const { userId, kind, resultId } = await params;
  if (!KINDS.has(kind as AssessmentResultKind)) notFound();
  const participant = await createAdminSupabaseClient().from("participants").select("id,full_name,first_name").eq("id", userId).maybeSingle();
  if (participant.error || !participant.data) notFound();
  const result = await loadCompletedAssessmentResult(userId, kind as AssessmentResultKind, resultId);
  if (!result) notFound();
  await audit(identity, "viewed_completed_assessment_result", "participant", userId, { kind, resultId });
  return <AdminShell admin={identity}><main className="assessment-result-page is-admin"><p className="admin-kicker">Wayfinder / Completed result / {participant.data.full_name ?? participant.data.first_name}</p><CompletedAssessmentResult result={result}/></main></AdminShell>;
}
