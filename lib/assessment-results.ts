import { CIRCLE_RESPONSE_KEY } from "@/lib/experiences/builder/circle-of-influence";
import "server-only";
import { requireExperiencePasswordBySlug } from "@/lib/experiences/access/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PERSONAL_IMPACT_RESPONSE_KEY } from "@/lib/experiences/builder/personal-impact-statement";
import { START_SOMETHING_RESPONSE_KEY } from "@/lib/experiences/builder/start-something";
import { completedJourneyRecords } from "@/lib/platform/journey-policy";
import { NATIVE_ASSESSMENT_RESULTS, completedGenericResult, completedLegacyActivatePurpose } from "@/lib/assessment-results-policy";

export type AssessmentResultKind = "circle-of-influence" | "life-mapping-u" | "personal-impact-statement" | "start-something" | "activate-your-purpose" | "wayfinders-ethos" | "launching-your-wayfinders-hub";
export type AssessmentResultSummary = { kind: AssessmentResultKind; id: string; name: string; completedAt: string; enrollmentId?: string; versionId?: string };

async function canonicalGenericCompletions(participantId: string) {
  const db = createAdminSupabaseClient();
  const [enrollments, history] = await Promise.all([
    db.from("experience_enrollments").select("id,experience_id,experience_version_id,status,completed_at").eq("participant_id", participantId),
    db.from("experience_enrollment_version_history").select("id,enrollment_id,experience_id,experience_version_id,artifact_snapshot").eq("participant_id", participantId),
  ]);
  if (enrollments.error || history.error) throw new Error("Unable to confirm completed Experience records.");
  return completedJourneyRecords(enrollments.data ?? [], history.data ?? []);
}

const GENERIC_KEYS = [CIRCLE_RESPONSE_KEY, PERSONAL_IMPACT_RESPONSE_KEY, START_SOMETHING_RESPONSE_KEY, ...Object.keys(NATIVE_ASSESSMENT_RESULTS)];

export async function listCompletedAssessmentResults(participantId: string): Promise<AssessmentResultSummary[]> {
  const db = createAdminSupabaseClient();
  const [lmu, definitions] = await Promise.all([
    db.from("lmu_assessments").select("id,completed_at").eq("participant_id", participantId).eq("status", "completed").not("completed_at", "is", null),
    db.from("response_definitions").select("id,response_key").in("response_key", GENERIC_KEYS),
  ]);
  if (lmu.error || definitions.error) throw new Error("Unable to load completed Guided Experiences.");
  const definitionById = new Map((definitions.data ?? []).map((item) => [item.id, item.response_key]));
  const definitionIds = [...definitionById.keys()];
  const responses = definitionIds.length ? await db.from("participant_responses")
    .select("id,enrollment_id,experience_version_id,response_definition_id,response_data,status,finalized_at")
    .eq("participant_id", participantId)
    .in("response_definition_id", definitionIds)
    .in("status", ["submitted", "finalized"])
    .not("finalized_at", "is", null) : { data: [], error: null };
  if (responses.error) throw new Error("Unable to load completed Guided Experience results.");
  const completions = await canonicalGenericCompletions(participantId);
  const generic = (responses.data ?? []).flatMap((response) => {
    const key = definitionById.get(response.response_definition_id) ?? "";
    const legacy = completedLegacyActivatePurpose(key, response.response_data, response.finalized_at);
    if (!legacy && !completions.some((record) => record.enrollmentId === response.enrollment_id && record.versionId === response.experience_version_id)) return [];
    const parsed = legacy ?? completedGenericResult(key, response.response_data, response.finalized_at);
    return parsed ? [{ kind: parsed.kind, id: response.id, name: parsed.name, completedAt: parsed.completedAt, enrollmentId: response.enrollment_id, versionId: response.experience_version_id }] : [];
  });
  return [
    ...(lmu.data ?? []).map((assessment) => ({ kind: "life-mapping-u" as const, id: assessment.id, name: "Life Mapping U", completedAt: assessment.completed_at! })),
    ...generic,
  ].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

export async function loadCompletedAssessmentResult(participantId: string, kind: AssessmentResultKind, id: string) {
  await requireExperiencePasswordBySlug(kind, `/account/results/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`);
  const db = createAdminSupabaseClient();
  if (kind === "life-mapping-u") {
    const assessment = await db.from("lmu_assessments").select("id,completed_at").eq("id", id).eq("participant_id", participantId).eq("status", "completed").not("completed_at", "is", null).maybeSingle();
    if (assessment.error || !assessment.data) return null;
    const results = await db.from("lmu_results").select("section_key,result_data,finalized_at").eq("assessment_id", id).order("finalized_at");
    if (results.error) throw new Error("Unable to load finalized Life Mapping U results.");
    return { kind, id, name: "Life Mapping U", completedAt: assessment.data.completed_at!, data: results.data ?? [] } as const;
  }
  const expectedKey = kind === "circle-of-influence" ? CIRCLE_RESPONSE_KEY : kind === "personal-impact-statement" ? PERSONAL_IMPACT_RESPONSE_KEY : kind === "start-something" ? START_SOMETHING_RESPONSE_KEY : Object.entries(NATIVE_ASSESSMENT_RESULTS).find(([, item]) => item.kind === kind)?.[0];
  if (!expectedKey) return null;
  const response = await db.from("participant_responses")
    .select("id,enrollment_id,experience_version_id,response_definition_id,response_data,status,finalized_at")
    .eq("id", id).eq("participant_id", participantId)
    .in("status", ["submitted", "finalized"]).not("finalized_at", "is", null).maybeSingle();
  if (response.error || !response.data) return null;
  const completions = await canonicalGenericCompletions(participantId);
  const legacy = completedLegacyActivatePurpose(expectedKey!, response.data.response_data, response.data.finalized_at);
  if (!legacy && !completions.some((record) => record.enrollmentId === response.data!.enrollment_id && record.versionId === response.data!.experience_version_id)) return null;
  const definition = await db.from("response_definitions").select("response_key").eq("id", response.data.response_definition_id).eq("response_key", expectedKey).maybeSingle();
  if (definition.error || !definition.data) return null;
  const parsed = legacy ?? completedGenericResult(definition.data.response_key, response.data.response_data, response.data.finalized_at);
  return parsed && parsed.kind === kind ? { ...parsed, id } : null;
}
