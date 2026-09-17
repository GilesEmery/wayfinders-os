import "server-only";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

type Companion = Tables<"companion_modules">;
type TargetKeys = { module: string | null; lesson: string | null; page: string | null };
export type CompanionReconciliationItem = {
  source: Companion;
  candidates: Companion[];
  entryCount: number;
  acknowledged: boolean;
  classification: "already_reconciled" | "likely_inherited" | "removed" | "ambiguous";
};
export type CompanionReconciliationReport = {
  draftVersionId: string;
  sourceVersionId: string;
  items: CompanionReconciliationItem[];
  newModules: Companion[];
  blockingCount: number;
};

function identity(module: Companion, targets: Map<string, TargetKeys>) {
  const target = targets.get(module.id) ?? { module: null, lesson: null, page: null };
  return JSON.stringify([module.module_type, module.scope, module.audience, target.module, target.lesson, target.page]);
}

async function targetKeys(versionId: string) {
  const db = createAdminSupabaseClient();
  const [companions, modules, lessons, sections] = await Promise.all([
    db.from("companion_modules").select("id,target_module_id,target_lesson_id,target_section_id").eq("experience_version_id", versionId),
    db.from("experience_modules").select("id,module_key").eq("experience_version_id", versionId),
    db.from("experience_lessons").select("id,lesson_key").eq("experience_version_id", versionId),
    db.from("experience_sections").select("id,section_key").eq("experience_version_id", versionId),
  ]);
  const error = companions.error || modules.error || lessons.error || sections.error;
  if (error) throw new Error(`Unable to inspect Companion targets: ${error.message}`);
  const moduleKeys = new Map((modules.data ?? []).map((row) => [row.id, row.module_key]));
  const lessonKeys = new Map((lessons.data ?? []).map((row) => [row.id, row.lesson_key]));
  const pageKeys = new Map((sections.data ?? []).map((row) => [row.id, row.section_key]));
  return new Map((companions.data ?? []).map((row) => [row.id, {
    module: row.target_module_id ? moduleKeys.get(row.target_module_id) ?? null : null,
    lesson: row.target_lesson_id ? lessonKeys.get(row.target_lesson_id) ?? null : null,
    page: row.target_section_id ? pageKeys.get(row.target_section_id) ?? null : null,
  }]));
}

export async function getCompanionReconciliationReport(experienceId: string, draftVersionId: string): Promise<CompanionReconciliationReport | null> {
  const db = createAdminSupabaseClient();
  const draftVersion = await db.from("experience_versions").select("id,experience_id,status,based_on_version_id").eq("id", draftVersionId).eq("experience_id", experienceId).maybeSingle();
  if (draftVersion.error) throw new Error(`Unable to inspect Draft lineage: ${draftVersion.error.message}`);
  const sourceVersionId = draftVersion.data?.based_on_version_id;
  if (!draftVersion.data || draftVersion.data.status !== "draft" || !sourceVersionId) return null;

  const [sourceResult, draftResult, decisionsResult, sourceTargets, draftTargets] = await Promise.all([
    db.from("companion_modules").select("*").eq("experience_version_id", sourceVersionId).order("sort_order"),
    db.from("companion_modules").select("*").eq("experience_version_id", draftVersionId).order("sort_order"),
    db.from("companion_draft_identity_decisions").select("source_companion_module_id").eq("draft_version_id", draftVersionId).eq("decision", "removed"),
    targetKeys(sourceVersionId),
    targetKeys(draftVersionId),
  ]);
  const error = sourceResult.error || draftResult.error || decisionsResult.error;
  if (error) throw new Error(`Unable to build Companion reconciliation report: ${error.message}`);
  const source = sourceResult.data ?? [];
  const draft = draftResult.data ?? [];
  const sourceIds = source.map((module) => module.id);
  const entriesResult = sourceIds.length
    ? await db.from("participant_companion_entries").select("companion_module_id").in("companion_module_id", sourceIds)
    : { data: [], error: null };
  if (entriesResult.error) throw new Error(`Unable to inspect Companion continuity: ${entriesResult.error.message}`);
  const entryCounts = new Map<string, number>();
  for (const row of entriesResult.data ?? []) entryCounts.set(row.companion_module_id, (entryCounts.get(row.companion_module_id) ?? 0) + 1);
  const acknowledged = new Set((decisionsResult.data ?? []).map((row) => row.source_companion_module_id));
  const claimedDraftIds = new Set<string>();
  const items = source.map((sourceModule): CompanionReconciliationItem => {
    const exact = draft.find((module) => module.module_key === sourceModule.module_key);
    if (exact) {
      claimedDraftIds.add(exact.id);
      return { source: sourceModule, candidates: [exact], entryCount: entryCounts.get(sourceModule.id) ?? 0, acknowledged: false, classification: "already_reconciled" };
    }
    const candidates = draft.filter((module) => !claimedDraftIds.has(module.id) && identity(module, draftTargets) === identity(sourceModule, sourceTargets));
    for (const candidate of candidates) claimedDraftIds.add(candidate.id);
    const classification = candidates.length === 1 ? "likely_inherited" : candidates.length > 1 ? "ambiguous" : "removed";
    return { source: sourceModule, candidates, entryCount: entryCounts.get(sourceModule.id) ?? 0, acknowledged: acknowledged.has(sourceModule.id), classification };
  });
  const newModules = draft.filter((module) => !claimedDraftIds.has(module.id) && !source.some((old) => old.module_key === module.module_key));
  const blockingCount = items.filter((item) => item.entryCount > 0 && item.classification !== "already_reconciled" && !(item.classification === "removed" && item.acknowledged)).length;
  return { draftVersionId, sourceVersionId, items, newModules, blockingCount };
}

async function reconciliationContext(experienceId: string, draftVersionId: string) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to reconcile this Course Draft.");
  const db = createAdminSupabaseClient();
  const version = await db.from("experience_versions").select("id").eq("id", draftVersionId).eq("experience_id", experienceId).eq("status", "draft").maybeSingle();
  if (version.error || !version.data) throw new Error("The selected Draft is no longer available for reconciliation.");
  return { admin, db };
}

export async function reconcileCompanionModule(experienceId: string, draftVersionId: string, draftModuleId: string, sourceModuleId: string) {
  const { admin, db } = await reconciliationContext(experienceId, draftVersionId);
  const result = await db.rpc("reconcile_draft_companion_module_key", { p_draft_companion_module_id: draftModuleId, p_source_companion_module_id: sourceModuleId });
  if (result.error) throw new Error(`Companion identity could not be confirmed: ${result.error.message}`);
  await audit(admin, "course.companion_identity.reconciled", "companion_module", draftModuleId, { experienceId, draftVersionId, sourceModuleId });
}

export async function acknowledgeCompanionRemoval(experienceId: string, draftVersionId: string, sourceModuleId: string) {
  const { admin, db } = await reconciliationContext(experienceId, draftVersionId);
  const result = await db.rpc("acknowledge_draft_companion_module_removal", { p_draft_version_id: draftVersionId, p_source_companion_module_id: sourceModuleId, p_actor_id: admin.id });
  if (result.error) throw new Error(`Companion removal could not be confirmed: ${result.error.message}`);
  await audit(admin, "course.companion_identity.removal_acknowledged", "companion_module", sourceModuleId, { experienceId, draftVersionId });
}
