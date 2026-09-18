import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/database.types";
import { companionObject } from "./companion";
import { videoConferenceEnabled } from "./companion-live";
import { resolveResourceIds, type ResolvedAsset } from "./resource-assets";

type Db = ReturnType<typeof createAdminSupabaseClient>;
type Offering = Tables<"experience_offerings">;
export type CompanionChatMessage = Tables<"companion_chat_messages"> & { author_name: string };
export type ResolvedCompanionModule = Tables<"companion_modules"> & { effective_configuration: Record<string, Json | undefined>; resources: ResolvedAsset[]; entry: Tables<"participant_companion_entries"> | null; delivery_override_id: string | null; call_session: Tables<"companion_call_sessions"> | null; chat_messages: CompanionChatMessage[] };
export type CompanionRuntimeData = Readonly<{ modules: ResolvedCompanionModule[]; cohortMembers: Array<{ id: string; name: string; role: string }>; hasCohortContext: boolean; contextLabel: string; currentMemberRole: string | null }>;

export async function loadCompanionRuntime({ versionId, offering, participantId, enrollmentId, preview = false, db = createAdminSupabaseClient() }: { versionId: string; offering: Offering | null; participantId?: string | null; enrollmentId?: string | null; preview?: boolean; db?: Db }): Promise<CompanionRuntimeData> {
  const moduleResult = await db.from("companion_modules").select("*").eq("experience_version_id", versionId).order("sort_order");
  if (moduleResult.error) throw new Error(`Unable to load Companion modules: ${moduleResult.error.message}`);
  const modules = moduleResult.data ?? [];
  if (!modules.length) return { modules: [], cohortMembers: [], hasCohortContext: Boolean(offering?.cohort_id), contextLabel: offering?.cohort_id ? offering.name : "Personal", currentMemberRole: null };
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
  let overrides = overrideResult.data ?? [];
  let currentMemberRole: string | null = null;
  if (!preview && offering?.cohort_id && participantId) {
    const membership = await db.from("cohort_memberships").select("membership_role").eq("cohort_id", offering.cohort_id).eq("participant_id", participantId).eq("status", "active").limit(1).maybeSingle();
    if (membership.error) throw new Error(`Unable to resolve Cohort membership: ${membership.error.message}`);
    currentMemberRole = membership.data?.membership_role ?? null;
  }
  const hasCohortContext = Boolean(offering?.cohort_id && (preview || currentMemberRole));
  if (!preview && hasCohortContext && offering) {
    const missingChats = modules.filter((module) => module.module_type === "chat" && module.availability_context !== "individual" && !overrides.some((item) => item.companion_module_id === module.id && item.offering_id === offering.id));
    if (missingChats.length) {
      for (const chatModule of missingChats) { const provisioned = await db.from("companion_delivery_overrides").insert({ companion_module_id: chatModule.id, experience_version_id: versionId, offering_id: offering.id, visibility: "inherit", configuration: {} }); if (provisioned.error && provisioned.error.code !== "23505") throw new Error(`Unable to provision Cohort Chat: ${provisioned.error.message}`); }
      const refreshed = await db.from("companion_delivery_overrides").select("*").eq("experience_version_id", versionId).eq("offering_id", offering.id).in("companion_module_id", moduleIds);
      if (refreshed.error) throw new Error(`Unable to load provisioned Cohort Chat: ${refreshed.error.message}`);
      overrides = [...overrides.filter((item) => item.offering_id !== offering.id), ...(refreshed.data ?? [])];
    }
  }
  const effective = modules.map((module) => {
    const acceptsDeliveryContext = hasCohortContext && module.availability_context !== "individual";
    const planOverride = acceptsDeliveryContext && planResult.data ? overrides.find((item) => item.companion_module_id === module.id && item.cohort_course_plan_id === planResult.data!.id) : null;
    const offeringOverride = acceptsDeliveryContext && offering ? overrides.find((item) => item.companion_module_id === module.id && item.offering_id === offering.id) : null;
    const override = planOverride ?? offeringOverride ?? null;
    const defaultLinks = (linksResult.data ?? []).filter((link) => link.companion_module_id === module.id && link.delivery_override_id === null);
    const overrideLinks = override ? (linksResult.data ?? []).filter((link) => link.companion_module_id === module.id && link.delivery_override_id === override.id) : [];
    const links = module.availability_context === "both" && overrideLinks.length
      ? [...defaultLinks, ...overrideLinks.filter((link) => !defaultLinks.some((item) => item.resource_id === link.resource_id))]
      : overrideLinks.length ? overrideLinks : defaultLinks;
    return { module, override, links };
  }).filter(({ module, override }) => module.visibility === "visible" && override?.visibility !== "hidden" && (module.module_type !== "video_call" || override !== null && videoConferenceEnabled({ ...companionObject(module.configuration), ...companionObject(override.configuration) })));
  const resourceIds = effective.flatMap((item) => item.links.map((link) => link.resource_id));
  const resourceMap = await resolveResourceIds(db, resourceIds);
  const entryMap = new Map((entriesResult.data ?? []).map((entry) => [entry.companion_module_id, entry]));
  const overrideIds = hasCohortContext ? effective.flatMap(({ override }) => override ? [override.id] : []) : [];
  let chatOverrideIds = overrideIds;
  const historicalModuleKey = new Map<string, string>();
  if (hasCohortContext && offering) {
    const chatKeys = modules.filter((module) => module.module_type === "chat").map((module) => module.module_key);
    if (chatKeys.length) {
      const experienceVersions = await db.from("experience_versions").select("id").eq("experience_id", offering.experience_id);
      if (experienceVersions.error) throw new Error(`Unable to resolve Cohort Chat Course history: ${experienceVersions.error.message}`);
      const versionIds = (experienceVersions.data ?? []).map((item) => item.id);
      const historicalModules = versionIds.length ? await db.from("companion_modules").select("id,module_key").in("experience_version_id", versionIds).in("module_key", chatKeys).eq("module_type", "chat") : { data: [], error: null };
      if (historicalModules.error) throw new Error(`Unable to resolve Cohort Chat history: ${historicalModules.error.message}`);
      for (const item of historicalModules.data ?? []) historicalModuleKey.set(item.id, item.module_key);
      const ids = (historicalModules.data ?? []).map((item) => item.id);
      const historicalOverrides = ids.length ? await db.from("companion_delivery_overrides").select("id").eq("offering_id", offering.id).in("companion_module_id", ids) : { data: [], error: null };
      if (historicalOverrides.error) throw new Error(`Unable to resolve Cohort Chat delivery history: ${historicalOverrides.error.message}`);
      chatOverrideIds = [...new Set([...overrideIds, ...(historicalOverrides.data ?? []).map((item) => item.id)])];
    }
  }
  const [callResult, messageResult] = overrideIds.length && enrollmentId ? await Promise.all([
    db.from("companion_call_sessions").select("*").in("delivery_override_id", overrideIds).eq("status", "live").order("started_at", { ascending: false }),
    db.from("companion_chat_messages").select("*").in("delivery_override_id", chatOverrideIds).order("created_at", { ascending: true }).limit(200),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (callResult.error || messageResult.error) throw new Error(`Unable to load live Cohort Companion data: ${(callResult.error || messageResult.error)!.message}`);
  const messageAuthorIds = [...new Set((messageResult.data ?? []).map((message) => message.author_participant_id))];
  const messagePeople = messageAuthorIds.length ? await db.from("participants").select("id,full_name,first_name").in("id", messageAuthorIds) : { data: [], error: null };
  if (messagePeople.error) throw new Error(`Unable to load Chat authors: ${messagePeople.error.message}`);
  const authorNames = new Map((messagePeople.data ?? []).map((person) => [person.id, person.full_name || person.first_name || "Cohort member"]));
  const resolved = effective.map(({ module, override, links }) => ({ ...module, effective_configuration: { ...companionObject(module.configuration), ...companionObject(override?.configuration) }, resources: links.map((link) => resourceMap.get(link.resource_id)).filter((asset): asset is ResolvedAsset => Boolean(asset)), entry: entryMap.get(module.id) ?? null, delivery_override_id: override?.id ?? null, call_session: (callResult.data ?? []).find((session) => session.companion_module_id === module.id) ?? null, chat_messages: (messageResult.data ?? []).filter((message) => module.module_type === "chat" && (message.companion_module_id === module.id || historicalModuleKey.get(message.companion_module_id) === module.module_key)).map((message) => ({ ...message, author_name: authorNames.get(message.author_participant_id) ?? "Cohort member" })) }));
  let cohortMembers: CompanionRuntimeData["cohortMembers"] = [];
  if (!preview && offering?.cohort_id && resolved.some((module) => module.module_type === "group_members")) {
    const memberships = await db.from("cohort_memberships").select("participant_id,membership_role").eq("cohort_id", offering.cohort_id).eq("status", "active");
    if (memberships.error) throw new Error(`Unable to load group membership: ${memberships.error.message}`);
    const ids = (memberships.data ?? []).map((item) => item.participant_id);
    const people = ids.length ? await db.from("participants").select("id,full_name,first_name").in("id", ids) : { data: [], error: null };
    if (people.error) throw new Error(`Unable to load group members: ${people.error.message}`);
    const names = new Map((people.data ?? []).map((person) => [person.id, person.full_name || person.first_name || "Cohort member"]));
    cohortMembers = (memberships.data ?? []).map((membership) => ({ id: membership.participant_id, name: names.get(membership.participant_id) ?? "Cohort member", role: membership.membership_role }));
  }
  return { modules: resolved, cohortMembers, hasCohortContext, contextLabel: hasCohortContext ? offering?.name || "Cohort" : "Personal", currentMemberRole };
}
