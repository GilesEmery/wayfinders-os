import Link from "next/link";
import { HubCreateForm } from "@/components/admin/HubCreateForm";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function HubsPage() {
  const admin = await requireAdmin();
  const db = createAdminSupabaseClient();
  const [{ data: hubs }, { data: memberships }, { data: roles }] = await Promise.all([
    db.from("hubs").select("id,name,slug,status,membership_mode").order("name"),
    db.from("hub_memberships").select("hub_id,participant_id,status"),
    db.from("platform_role_assignments").select("scope_id,status").eq("role", "hub_leader").eq("scope_type", "hub"),
  ]);
  return <AdminShell admin={admin}>
    <AdminPageHeader eyebrow="Communities" title="Hubs" description="Operational Purpose OS communities with independent membership and explicitly scoped leadership."/>
    <HubCreateForm/>
    <div className="admin-table-wrap"><table><thead><tr><th>Hub</th><th>Membership mode</th><th>Wayfinders</th><th>Hub Leaders</th><th>Status</th><th>Portal</th></tr></thead><tbody>{(hubs ?? []).map((hub) => <tr key={hub.id}><td>{hub.name}</td><td>{humanize(hub.membership_mode)}</td><td>{(memberships ?? []).filter((item) => item.hub_id === hub.id && item.status === "active").length}</td><td>{(roles ?? []).filter((item) => item.scope_id === hub.id && item.status === "active").length}</td><td>{humanize(hub.status)}</td><td><Link href={`/hubs/${hub.slug}`}>View Hub</Link></td></tr>)}{!hubs?.length && <tr><td colSpan={6}>No Hubs have been created.</td></tr>}</tbody></table></div>
  </AdminShell>;
}
