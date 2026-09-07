import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { WayfinderRelationshipManager } from "@/components/admin/WayfinderRelationshipManager";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const identity = await requireAdmin(); const { userId } = await params; const db = createAdminSupabaseClient();
  const [userResult, assessmentResult, orgMemberships, hubMemberships, cohortMemberships, participantTags, orgs, hubs, cohorts, tags] = await Promise.all([
    db.from("participants").select("id,auth_user_id,full_name,first_name,email,created_at,updated_at").eq("id", userId).maybeSingle(),
    db.from("lmu_assessments").select("id,status,current_module,started_at,completed_at,updated_at").eq("participant_id", userId).order("updated_at", { ascending: false }),
    db.from("organization_memberships").select("organization_id,membership_role,status").eq("participant_id", userId).eq("status", "active"),
    db.from("hub_memberships").select("hub_id,membership_role,status").eq("participant_id", userId).eq("status", "active"),
    db.from("cohort_memberships").select("cohort_id,membership_role,status").eq("participant_id", userId).in("status", ["active", "completed"]),
    db.from("participant_tags").select("tag_id").eq("participant_id", userId),
    db.from("organizations").select("id,name").eq("status", "active").order("name"),
    db.from("hubs").select("id,name").eq("status", "active").order("name"),
    db.from("cohorts").select("id,name").in("status", ["open", "active"]).order("name"),
    db.from("tags").select("id,name").eq("status", "active").order("name"),
  ]);
  const user = userResult.data; if (!user) notFound(); const assessments = assessmentResult.data ?? [];
  const [{ data: member }, { data: scopedRoles }] = await Promise.all([
    user.auth_user_id ? db.from("admin_members").select("role,status").eq("auth_user_id", user.auth_user_id).maybeSingle() : Promise.resolve({ data: null }),
    user.auth_user_id ? db.from("platform_role_assignments").select("role,scope_type,scope_id,status").eq("auth_user_id", user.auth_user_id).eq("status", "active") : Promise.resolve({ data: [] }),
  ]);
  const orgNames = new Map((orgs.data ?? []).map((item) => [item.id, item.name])); const hubNames = new Map((hubs.data ?? []).map((item) => [item.id, item.name])); const cohortNames = new Map((cohorts.data ?? []).map((item) => [item.id, item.name])); const tagNames = new Map((tags.data ?? []).map((item) => [item.id, item.name]));
  const existing = [
    ...(orgMemberships.data ?? []).map((item) => ({ kind: "organization" as const, targetId: item.organization_id, name: orgNames.get(item.organization_id) ?? "Organization", role: item.membership_role })),
    ...(hubMemberships.data ?? []).map((item) => ({ kind: "hub" as const, targetId: item.hub_id, name: hubNames.get(item.hub_id) ?? "Hub", role: item.membership_role })),
    ...(cohortMemberships.data ?? []).map((item) => ({ kind: "cohort" as const, targetId: item.cohort_id, name: cohortNames.get(item.cohort_id) ?? "Cohort", role: item.membership_role })),
    ...(participantTags.data ?? []).map((item) => ({ kind: "tag" as const, targetId: item.tag_id, name: tagNames.get(item.tag_id) ?? "Journey classification", role: "classification" })),
  ];
  await audit(identity, "viewed_wayfinder_detail", "participant", userId);
  return <AdminShell admin={identity}>
    <AdminPageHeader eyebrow="Wayfinder" title={user.full_name ?? user.first_name} description={user.email}/><p className="admin-wayfinder-label">Wayfinder</p>
    <div className="admin-detail-meta"><div><span>Identity</span><strong>Wayfinder</strong></div><div><span>Account</span><strong>{user.auth_user_id ? "Active" : "Unclaimed"}</strong></div><div><span>Communities</span><strong>{existing.filter((item) => item.kind !== "tag").length}</strong></div><div><span>Joined</span><strong>{formatDate(user.created_at)}</strong></div><div><span>Last activity</span><strong>{formatDate(user.updated_at)}</strong></div></div>
    <section className="admin-profile-sections">
      <article><h2>Access &amp; Leadership</h2>{member && <div className="admin-record-row"><div><strong>{humanize(member.role)}</strong><span>Current admin authority · {member.status}</span></div></div>}{(scopedRoles ?? []).map((role) => <div className="admin-record-row" key={`${role.role}-${role.scope_type}-${role.scope_id}`}><div><strong>{humanize(role.role)}</strong><span>{humanize(role.scope_type)} scope</span></div></div>)}{!member && !(scopedRoles ?? []).length && <p>No additional platform permissions.</p>}<Link className="admin-secondary-link" href="/admin/admins">Manage Admin access</Link></article>
      <article><h2>Communities</h2>{existing.filter((item) => item.kind !== "tag").map((item) => <div className="admin-record-row" key={`${item.kind}-${item.targetId}`}><div><strong>{item.name}</strong><span>{humanize(item.kind)} · {humanize(item.role)}</span></div></div>)}{!existing.some((item) => item.kind !== "tag") && <p>No organization, Hub, or cohort memberships.</p>}</article>
      <article><h2>Journey</h2>{assessments.map((assessment) => <div className="admin-record-row" key={assessment.id}><div><strong>Life Mapping U</strong><span>{humanize(assessment.status)} · {assessment.status === "completed" ? "Complete" : humanize(assessment.current_module)}</span></div><Link href={`/admin/assessments/life-mapping-u/${assessment.id}`}>View assessment</Link></div>)}{existing.filter((item) => item.kind === "tag").map((item) => <div className="admin-record-row" key={item.targetId}><div><strong>{item.name}</strong><span>Journey classification</span></div></div>)}{!assessments.length && !existing.some((item) => item.kind === "tag") && <p>No connected journey activity or classifications.</p>}</article>
      <article><h2>Account &amp; Activity</h2><p>Created {formatDate(user.created_at)}. Last profile or journey update {formatDate(user.updated_at)}.</p></article>
    </section>
    <section className="admin-identity-management"><p className="admin-kicker">Purpose OS Admin</p><h2>Identities &amp; Memberships</h2><p>Manage descriptive relationships separately from scoped authorization. Hub Leader and facilitator assignments create both the membership and matching scoped permission.</p><WayfinderRelationshipManager participantId={user.id} organizations={orgs.data ?? []} hubs={hubs.data ?? []} cohorts={cohorts.data ?? []} tags={tags.data ?? []} existing={existing}/></section>
  </AdminShell>;
}
