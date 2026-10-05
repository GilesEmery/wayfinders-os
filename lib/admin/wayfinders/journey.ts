import "server-only";
import { getAdmin, auditSecurityEvent } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { completedJourneyRecords } from "@/lib/platform/journey-policy";
import { loadAdminJourneyResponses, ResponseLibraryAccessError } from "@/lib/platform/response-library";
import type { JourneyRecord, WayfinderJourneyData } from "./journey-types";

export async function loadWayfinderJourney(participantId: string, selection?: { enrollmentId?: string; versionId?: string; assessmentId?: string }) {
  const identity = await getAdmin();
  if (!identity) throw new ResponseLibraryAccessError(403);
  const db = createAdminSupabaseClient();
  const person = await db.from("participants").select("id").eq("id", participantId).maybeSingle();
  if (person.error) throw new Error("Unable to load Wayfinder.");
  if (!person.data) throw new ResponseLibraryAccessError(404);
  if (selection) {
    const data = await loadAdminJourneyResponses(participantId, selection);
    await auditSecurityEvent(identity, "wayfinder.journey_responses_viewed", "participant", participantId, selection);
    return data;
  }
  const [enrollments, history, assessments, memberships] = await Promise.all([
    db.from("experience_enrollments").select("id,experience_id,experience_version_id,cohort_id,status,enrolled_at,completed_at").eq("participant_id", participantId).order("updated_at", { ascending: false }),
    db.from("experience_enrollment_version_history").select("id,enrollment_id,experience_id,experience_version_id,artifact_snapshot:artifact_snapshot->completion").eq("participant_id", participantId),
    db.from("lmu_assessments").select("id,status,started_at,completed_at").eq("participant_id", participantId).order("started_at", { ascending: false }),
    db.from("cohort_memberships").select("cohort_id").eq("participant_id", participantId),
  ]);
  if (enrollments.error || history.error || assessments.error || memberships.error) throw new Error("Unable to load Journey records.");
  const experienceIds = [...new Set((enrollments.data ?? []).map(row => row.experience_id))];
  const cohortIds = [...new Set([...(enrollments.data ?? []).flatMap(row => row.cohort_id ? [row.cohort_id] : []), ...(memberships.data ?? []).map(row => row.cohort_id)])];
  const [experiences, cohorts] = await Promise.all([
    experienceIds.length ? db.from("experiences").select("id,name,slug,experience_type").in("id", experienceIds) : { data: [], error: null },
    cohortIds.length ? db.from("cohorts").select("id,name,experience_id").in("id", cohortIds) : { data: [], error: null },
  ]);
  if (experiences.error || cohorts.error) throw new Error("Unable to load Journey titles.");
  const experienceMap = new Map((experiences.data ?? []).map(row => [row.id, row]));
  const cohortName = (enrollment: NonNullable<typeof enrollments.data>[number]) => {
    if (enrollment.cohort_id) return cohorts.data?.find(row => row.id === enrollment.cohort_id)?.name ?? null;
    const matches = (cohorts.data ?? []).filter(row => row.experience_id === enrollment.experience_id);
    return matches.map(row => row.name).join(", ") || null;
  };
  const visible = (enrollments.data ?? []).filter(row => !(experienceMap.get(row.experience_id)?.slug === "life-mapping-u" && assessments.data?.length));
  const records: JourneyRecord[] = visible.map(row => ({ id: row.id, kind: experienceMap.get(row.experience_id)?.experience_type === "assessment" ? "assessment" : "course", title: experienceMap.get(row.experience_id)?.name ?? "Unavailable experience", status: row.status, enrolledAt: row.enrolled_at, completedAt: row.completed_at, cohort: cohortName(row), versionId: row.experience_version_id, enrollmentId: row.id, historical: false }));
  // Only completion metadata was selected; answers stay on the detail endpoint.
  const completions = completedJourneyRecords([], (history.data ?? []).map(row => ({ ...row, artifact_snapshot: { completion: row.artifact_snapshot } })));
  for (const completion of completions) {
    const enrollment = visible.find(row => row.id === completion.enrollmentId);
    if (!enrollment || (enrollment.status === "completed" && enrollment.experience_version_id === completion.versionId && enrollment.completed_at === completion.completedAt)) continue;
    records.push({ id: completion.id, kind: experienceMap.get(enrollment.experience_id)?.experience_type === "assessment" ? "assessment" : "course", title: experienceMap.get(enrollment.experience_id)?.name ?? "Unavailable experience", status: "completed", enrolledAt: enrollment.enrolled_at, completedAt: completion.completedAt, cohort: cohortName(enrollment), versionId: completion.versionId, enrollmentId: enrollment.id, historical: true });
  }
  for (const row of assessments.data ?? []) records.push({ id: row.id, kind: "assessment", title: "Life Mapping U", status: row.status, enrolledAt: row.started_at, completedAt: row.completed_at, cohort: null, versionId: null, enrollmentId: null, historical: false });
  return { records } satisfies WayfinderJourneyData;
}
