import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const WAYFINDER_PAGE_SIZE = 50;

export type WayfinderRegistryFilters = {
  q: string;
  hub: string;
  role: string;
  tag: string;
  account: string;
  experience: string;
  cohort: string;
  sort: string;
  page: number;
};

function intersect(current: Set<string> | null, ids: string[]) {
  const next = new Set(ids);
  return current ? new Set([...current].filter((id) => next.has(id))) : next;
}

export async function loadWayfinderRegistry(filters: WayfinderRegistryFilters) {
  const db = createAdminSupabaseClient();
  const [{ data: hubs }, { data: tags }, { data: experiences }, { data: cohorts }] = await Promise.all([
    db.from("hubs").select("id,name").eq("status", "active").order("name"),
    db.from("tags").select("id,name").eq("status", "active").order("name"),
    db.from("experiences").select("id,name").order("name"),
    db.from("cohorts").select("id,name").in("status", ["open", "active", "completed"]).order("name"),
  ]);

  let matchingIds: Set<string> | null = null;
  const idLookups: Array<PromiseLike<string[]>> = [];
  if (filters.hub) idLookups.push(db.from("hub_memberships").select("participant_id").eq("hub_id", filters.hub).eq("status", "active").then(({ data }) => (data ?? []).map((row) => row.participant_id)));
  if (filters.tag) idLookups.push(db.from("participant_tags").select("participant_id").eq("tag_id", filters.tag).then(({ data }) => (data ?? []).map((row) => row.participant_id)));
  if (filters.cohort) idLookups.push(db.from("cohort_memberships").select("participant_id").eq("cohort_id", filters.cohort).in("status", ["active", "completed"]).then(({ data }) => (data ?? []).map((row) => row.participant_id)));
  if (filters.experience) idLookups.push(db.from("experience_enrollments").select("participant_id").eq("experience_id", filters.experience).then(({ data }) => (data ?? []).map((row) => row.participant_id)));
  if (filters.role && filters.role !== "none") {
    const { data: roleUsers } = await db.from("platform_role_assignments").select("auth_user_id").eq("role", filters.role).eq("status", "active");
    const authIds = (roleUsers ?? []).map((row) => row.auth_user_id);
    idLookups.push(authIds.length ? db.from("participants").select("id").in("auth_user_id", authIds).then(({ data }) => (data ?? []).map((row) => row.id)) : Promise.resolve([]));
  }
  for (const ids of await Promise.all(idLookups)) matchingIds = intersect(matchingIds, ids);

  const orderColumn = filters.sort === "name" ? "full_name" : filters.sort === "updated" ? "updated_at" : "created_at";
  const ascending = filters.sort === "name";
  let query = db.from("participants").select("id,auth_user_id,full_name,first_name,preferred_name,email,email_normalized,created_at,updated_at", { count: "exact" });
  if (filters.q) query = query.or(`full_name.ilike.%${filters.q.replaceAll(",", "")}%,first_name.ilike.%${filters.q.replaceAll(",", "")}%,email.ilike.%${filters.q.replaceAll(",", "")}%`);
  if (filters.account === "active") query = query.not("auth_user_id", "is", null);
  if (filters.account === "unclaimed") query = query.is("auth_user_id", null);
  if (matchingIds) query = matchingIds.size ? query.in("id", [...matchingIds]) : query.in("id", ["00000000-0000-0000-0000-000000000000"]);
  const from = (filters.page - 1) * WAYFINDER_PAGE_SIZE;
  const { data: people, count, error } = await query.order(orderColumn, { ascending, nullsFirst: false }).range(from, from + WAYFINDER_PAGE_SIZE - 1);
  if (error) throw error;
  const ids = (people ?? []).map((person) => person.id);
  const authIds = (people ?? []).flatMap((person) => person.auth_user_id ? [person.auth_user_id] : []);
  const pageEmails = [...new Set((people ?? []).map((person) => person.email_normalized))];
  const duplicateEmailRows = pageEmails.length
    ? await db.from("participants").select("id,email_normalized").in("email_normalized", pageEmails)
    : { data: [] };
  const emailCounts = new Map<string, number>();
  for (const row of duplicateEmailRows.data ?? []) emailCounts.set(row.email_normalized, (emailCounts.get(row.email_normalized) ?? 0) + 1);
  const linkingIssueIds = new Set((people ?? []).filter((person) => (emailCounts.get(person.email_normalized) ?? 0) > 1).map((person) => person.id));
  const [hubRows, tagRows, enrollments, assessments, preferences, adminMembers, scopedRoles] = ids.length ? await Promise.all([
    db.from("hub_memberships").select("participant_id,hub_id,membership_role").in("participant_id", ids).eq("status", "active"),
    db.from("participant_tags").select("participant_id,tag_id").in("participant_id", ids),
    db.from("experience_enrollments").select("participant_id,experience_id,status,updated_at").in("participant_id", ids),
    db.from("lmu_assessments").select("participant_id,status,updated_at").in("participant_id", ids).order("updated_at", { ascending: false }),
    db.from("participant_preferences").select("participant_id,default_hub_id").in("participant_id", ids),
    authIds.length ? db.from("admin_members").select("auth_user_id,role,status").in("auth_user_id", authIds).eq("status", "active") : Promise.resolve({ data: [] }),
    authIds.length ? db.from("platform_role_assignments").select("auth_user_id,role,scope_type,scope_id").in("auth_user_id", authIds).eq("status", "active") : Promise.resolve({ data: [] }),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  return { people: people ?? [], count: count ?? 0, linkingIssueIds, hubs: hubs ?? [], tags: tags ?? [], experiences: experiences ?? [], cohorts: cohorts ?? [], hubRows: hubRows.data ?? [], tagRows: tagRows.data ?? [], enrollments: enrollments.data ?? [], assessments: assessments.data ?? [], preferences: preferences.data ?? [], adminMembers: adminMembers.data ?? [], scopedRoles: scopedRoles.data ?? [] };
}

export async function loadWayfinderWorkspace(participantId: string) {
  const db = createAdminSupabaseClient();
  const [participant, assessments, orgMemberships, hubMemberships, cohortMemberships, participantTags, enrollments, progress, entitlements, assignments, preferences, notes, auditRows, orgs, hubs, cohorts, tags, experiences, offerings] = await Promise.all([
    db.from("participants").select("id,auth_user_id,full_name,first_name,preferred_name,email,email_normalized,phone,city,state_region,country,timezone,short_bio,created_at,updated_at").eq("id", participantId).maybeSingle(),
    db.from("lmu_assessments").select("id,status,current_module,started_at,completed_at,updated_at").eq("participant_id", participantId).order("updated_at", { ascending: false }),
    db.from("organization_memberships").select("organization_id,membership_role,status,joined_at,created_at").eq("participant_id", participantId),
    db.from("hub_memberships").select("hub_id,membership_role,status,joined_at,created_at").eq("participant_id", participantId),
    db.from("cohort_memberships").select("cohort_id,membership_role,status,joined_at,created_at").eq("participant_id", participantId),
    db.from("participant_tags").select("tag_id,created_at").eq("participant_id", participantId),
    db.from("experience_enrollments").select("id,experience_id,experience_version_id,cohort_id,status,enrolled_at,started_at,completed_at,updated_at").eq("participant_id", participantId),
    db.from("experience_progress").select("enrollment_id,experience_id,status,started_at,completed_at,updated_at").eq("participant_id", participantId),
    db.from("experience_entitlements").select("experience_id,source_type,source_id,status,starts_at,expires_at").eq("participant_id", participantId),
    db.from("participant_offering_assignments").select("offering_id,source_type,status,starts_at,expires_at").eq("participant_id", participantId),
    db.from("participant_preferences").select("default_hub_id").eq("participant_id", participantId).maybeSingle(),
    db.from("crm_notes").select("id,body,created_by,created_at,updated_at").eq("participant_id", participantId).order("created_at", { ascending: false }),
    db.from("admin_audit_log").select("id,admin_email,action,metadata,created_at").eq("entity_type", "participant").eq("entity_id", participantId).order("created_at", { ascending: false }).limit(100),
    db.from("organizations").select("id,name,status").order("name"), db.from("hubs").select("id,name,status").order("name"), db.from("cohorts").select("id,name,experience_id,status,start_date,end_date").order("name"), db.from("tags").select("id,name,description,status").order("name"), db.from("experiences").select("id,name,slug").order("name"), db.from("experience_offerings").select("id,name,experience_id,hub_id,cohort_id,access_mode").order("name"),
  ]);
  if (participant.error) throw participant.error;
  const emailMatches = participant.data
    ? await db.from("participants").select("id", { count: "exact", head: true }).eq("email_normalized", participant.data.email_normalized)
    : { count: 0 };
  const authId = participant.data?.auth_user_id;
  const [adminMember, roles] = authId ? await Promise.all([db.from("admin_members").select("role,status").eq("auth_user_id", authId).maybeSingle(), db.from("platform_role_assignments").select("id,role,scope_type,scope_id,status,created_at").eq("auth_user_id", authId).eq("status", "active")]) : [{ data: null }, { data: [] }];
  return { participant: participant.data, accountLinkingIssue: (emailMatches.count ?? 0) > 1, assessments: assessments.data ?? [], orgMemberships: orgMemberships.data ?? [], hubMemberships: hubMemberships.data ?? [], cohortMemberships: cohortMemberships.data ?? [], participantTags: participantTags.data ?? [], enrollments: enrollments.data ?? [], progress: progress.data ?? [], entitlements: entitlements.data ?? [], assignments: assignments.data ?? [], preferences: preferences.data, notes: notes.data ?? [], auditRows: auditRows.data ?? [], orgs: orgs.data ?? [], hubs: hubs.data ?? [], cohorts: cohorts.data ?? [], tags: tags.data ?? [], experiences: experiences.data ?? [], offerings: offerings.data ?? [], adminMember: adminMember.data, roles: roles.data ?? [] };
}
