import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parsePrebuiltAssessmentConfiguration, PREBUILT_ASSESSMENT_BLOCK_TYPE } from "@/lib/experiences/builder/prebuilt-assessment";
import type { BuilderSection } from "@/lib/experiences/builder/types";
import type { PrebuiltAssessmentConfiguration } from "@/lib/experiences/builder/prebuilt-assessment";
import { AssessmentLaunchCard, assessmentLaunchLabel } from "./AssessmentLaunchCard";
import { EmbeddedAssessmentLauncher } from "./EmbeddedAssessmentLauncher";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null };

export type AssessmentCardData = { name: string | null; description: string | null; status: "not_started" | "in_progress" | "completed" };
export type AssessmentCards = Readonly<Record<string, AssessmentCardData>>;

// Identity comes from the already-authorized server runtime, never from a client.
export async function loadAssessmentCards(section: BuilderSection, participantId: string | null, enrollmentId: string | null): Promise<AssessmentCards> {
  const cards = section.layout?.columns.flatMap(column => column.blocks).filter(block => block.status === "active" && block.visibility === "visible" && block.block_type === PREBUILT_ASSESSMENT_BLOCK_TYPE).flatMap(block => {
    const parsed = parsePrebuiltAssessmentConfiguration(block.configuration);
    return parsed.ok ? [{ blockId: block.id, experienceId: parsed.value.assessmentExperienceId }] : [];
  }) ?? [];
  if (!cards.length) return {};
  const db = createAdminSupabaseClient();
  const ids = [...new Set(cards.map(card => card.experienceId))];
  const [metadata, attempts, enrollments] = await Promise.all([
    db.from("experiences").select("id,name,description").in("id", ids).eq("experience_type", "assessment"),
    participantId && enrollmentId ? db.from("embedded_assessment_attempts").select("parent_content_block_id,status").eq("parent_enrollment_id", enrollmentId).eq("participant_id", participantId).in("parent_content_block_id", cards.map(card => card.blockId)) : Promise.resolve({ data: [], error: null }),
    participantId && enrollmentId ? db.from("experience_enrollments").select("experience_id,status").eq("participant_id", participantId).in("experience_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (metadata.error || attempts.error || enrollments.error) throw new Error("Unable to load Assessment cards.");
  return Object.fromEntries(cards.map(card => {
    const assessment = metadata.data?.find(item => item.id === card.experienceId);
    const attempt = attempts.data?.find(item => item.parent_content_block_id === card.blockId);
    const enrollment = enrollments.data?.find(item => item.experience_id === card.experienceId);
    const status = attempt?.status === "completed" || enrollment?.status === "completed" ? "completed" : attempt || enrollment?.status === "in_progress" ? "in_progress" : "not_started";
    return [card.blockId, { name: assessment?.name ?? null, description: assessment?.description ?? null, status }];
  }));
}

export function PrebuiltAssessmentBlock({ blockId, configuration, route, preview, card }: { blockId: string; configuration: PrebuiltAssessmentConfiguration; route: Route; preview: boolean; card?: AssessmentCardData }) {
  const title = configuration.title || card?.name || "Prebuilt Assessment";
  const description = configuration.description || card?.description || "Complete this Assessment to continue your learning journey.";
  const status = card?.status ?? "not_started";
  const action = preview ? <button type="button" disabled>Preview Assessment</button> : <EmbeddedAssessmentLauncher blockId={blockId} route={route} label={assessmentLaunchLabel(status)}/>;
  return <AssessmentLaunchCard title={title} description={description} status={status} action={action}/>;
}
