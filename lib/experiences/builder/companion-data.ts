import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/database.types";
import { companionObject } from "./companion";
import { resolveResourceIds, type ResolvedAsset } from "./resource-assets";

type Db = ReturnType<typeof createAdminSupabaseClient>;
type Offering = Tables<"experience_offerings">;
export type CompanionChatMessage = Tables<"companion_chat_messages"> & { author_name: string };
export type ResolvedCompanionModule = Tables<"companion_modules"> & { effective_configuration: Record<string, Json | undefined>; resources: ResolvedAsset[]; entry: Tables<"participant_companion_entries"> | null; delivery_override_id: string | null; call_session: Tables<"companion_call_sessions"> | null; chat_messages: CompanionChatMessage[] };
export type CompanionRuntimeData = Readonly<{ modules: ResolvedCompanionModule[]; groupMembers: Array<{ id: string; name: string; role: string }>; hasGroupContext: boolean; currentMemberRole: string | null }>;

export async function loadCompanionRuntime({ versionId, offering, participantId, enrollmentId, preview = false, db = createAdminSupabaseClient() }: { versionId: string; offering: Offering | null; participantId?: string | null; enrollmentId?: string | null; preview?: boolean; db?: Db }): Promise<CompanionRuntimeData> {
  const moduleResult = await db.from("companion_modules").select("*").eq("experience_version_id", versionId).order("sort_order");
  if (moduleResult.error) throw new Error(`Unable to load Companion modules: ${moduleResult.error.message}`);
  const modules = moduleResult.data ?? [];
  if (!modules.length) return { modules: [], groupMembers: [], hasGroupContext: false, currentMemberRole: null };
  const moduleIds = modules.map((module) => module.id);
  const planResult = offering?.cohort_id ? await db.from("cohort_course_plans").select("id").eq("cohort_id", offering.cohort_id).eq("experience_version_id", versionId).eq("status", "active").maybeSingle() : { data: null, error: null };
  if (planResult.error) throw new Error(`Unable to resolve Companion cohort context: ${planResult.error.message}`);
  let overrideQuery = db.from("companion_delivery_overrides").select("*").eq("experience_version_id", versionId).in("companion_module_id", moduleIds);
  if (!offering && !planResult.data) overrideQuery = overrideQuery.is("offering_id", null).is("cohort_course_plan_id", null);
  const [overrideResult, linksResult, entriesResult] = await Promise.all([
    preview || !offering && !planResult.data ? Promise.resolve({ data: [], error: null }) : overrideQuery,
    db.from("companion_module_resources").select("companion_module_id,resource_id,delivery_override_id,sort_order").in("companion_module_id", moduleIds).order("sort_order"),
    participantId && enrollmentId ? db.from("participant_companion_entries").select("*").eq("participant_id", participantId).eq("enrollment_id", enrollmentId).eq("experience_version_id", versionId).in("companion_module_id", moduleIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = overrideResult.error || linksResult.error || entriesResult.error; if (error) throw new Error(`Unable to load Companion context: ${error.message}`);
  const overrides = overrideResult.data ?? [];
  let currentMemberRole: string | null = null;
  if (!preview && offering?.cohort_id && participantId) {
    const membership = await db.from("cohort_memberships").select("membership_role").eq("cohort_id", offering.cohort_id).eq("participant_id", participantId).eq("status", "active").limit(1).maybeSingle();
    if (membership.error) throw new Error(`Unable to resolve Group membership: ${membership.error.message}`);
    currentMemberRole = membership.data?.membership_role ?? null;
  }
  const hasGroupContext = Boolean(offering?.cohort_id && currentMemberRole);
  const effective = modules.map((module) => {
    const planOverride = planResult.data ? overrides.find((item) => item.companion_module_id === module.id && item.cohort_course_plan_id === planResult.data!.id) : null;
    const offeringOverride = offering ? overrides.find((item) => item.companion_module_id === module.id && item.offering_id === offering.id) : null;
    const override = planOverride ?? offeringOverride ?? null;
    const defaultLinks = (linksResult.data ?? []).filter((link) => link.companion_module_id === module.id && link.delivery_override_id === null);
    const overrideLinks = override ? (linksResult.data ?? []).filter((link) => link.companion_module_id === module.id && link.delivery_override_id === override.id) : [];
    return { module, override, links: overrideLinks.length ? overrideLinks : defaultLinks };
  }).filter(({ module, override }) => module.visibility === "visible" && override?.visibility !== "hidden");
  const resourceIds = effective.flatMap((item) => item.links.map((link) => link.resource_id));
  const resourceMap = await resolveResourceIds(db, resourceIds);
  const entryMap = new Map((entriesResult.data ?? []).map((entry) => [entry.companion_module_id, entry]));
  const overrideIds = hasGroupContext ? effective.flatMap(({ override }) => override ? [override.id] : []) : [];
  const [callResult, messageResult] = overrideIds.length && enrollmentId ? await Promise.all([
    db.from("companion_call_sessions").select("*").in("delivery_override_id", overrideIds).eq("status", "live").order("started_at", { ascending: false }),
    db.from("companion_chat_messages").select("*").in("delivery_override_id", overrideIds).order("created_at", { ascending: true }).limit(200),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (callResult.error || messageResult.error) throw new Error(`Unable to load live Group Companion data: ${(callResult.error || messageResult.error)!.message}`);
  const messageAuthorIds = [...new Set((messageResult.data ?? []).map((message) => message.author_participant_id))];
  const messagePeople = messageAuthorIds.length ? await db.from("participants").select("id,full_name,first_name").in("id", messageAuthorIds) : { data: [], error: null };
  if (messagePeople.error) throw new Error(`Unable to load Chat authors: ${messagePeople.error.message}`);
  const authorNames = new Map((messagePeople.data ?? []).map((person) => [person.id, person.full_name || person.first_name || "Group member"]));
  const resolved = effective.map(({ module, override, links }) => ({ ...module, effective_configuration: { ...companionObject(module.configuration), ...companionObject(override?.configuration) }, resources: links.map((link) => resourceMap.get(link.resource_id)).filter((asset): asset is ResolvedAsset => Boolean(asset)), entry: entryMap.get(module.id) ?? null, delivery_override_id: override?.id ?? null, call_session: (callResult.data ?? []).find((session) => session.companion_module_id === module.id) ?? null, chat_messages: (messageResult.data ?? []).filter((message) => message.companion_module_id === module.id).map((message) => ({ ...message, author_name: authorNames.get(message.author_participant_id) ?? "Group member" })) }));
  let groupMembers: CompanionRuntimeData["groupMembers"] = [];
  if (!preview && offering?.cohort_id && resolved.some((module) => module.module_type === "group_members")) {
    const memberships = await db.from("cohort_memberships").select("participant_id,membership_role").eq("cohort_id", offering.cohort_id).eq("status", "active");
    if (memberships.error) throw new Error(`Unable to load group membership: ${memberships.error.message}`);
    const ids = (memberships.data ?? []).map((item) => item.participant_id);
    const people = ids.length ? await db.from("participants").select("id,full_name,first_name").in("id", ids) : { data: [], error: null };
    if (people.error) throw new Error(`Unable to load group members: ${people.error.message}`);
    const names = new Map((people.data ?? []).map((person) => [person.id, person.full_name || person.first_name || "Group member"]));
    groupMembers = (memberships.data ?? []).map((membership) => ({ id: membership.participant_id, name: names.get(membership.participant_id) ?? "Group member", role: membership.membership_role }));
  }
  return { modules: resolved, groupMembers, hasGroupContext, currentMemberRole };
}
