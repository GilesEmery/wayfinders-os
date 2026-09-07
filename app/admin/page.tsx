import Link from "next/link";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page() {
  const identity = await requireAdmin(); const db = createAdminSupabaseClient();
  const [{ data: participants }, { data: assessments }, { data: activity }] = await Promise.all([db.from("participants").select("id"), db.from("lmu_assessments").select("id,status"), db.from("admin_audit_log").select("id,admin_email,action,entity_type,created_at").order("created_at", { ascending: false }).limit(6)]);
  const completed=(assessments??[]).filter(x=>x.status==="completed").length; const active=(assessments??[]).filter(x=>x.status==="in_progress").length;
  return <AdminShell admin={identity}><AdminPageHeader eyebrow="Purpose OS overview" title="Dashboard" description="A clear operating view across Wayfinders, experiences, organizations, engagement, and insights."/>
    <section className="admin-summary-grid"><article><span>Total Wayfinders</span><strong>{participants?.length??0}</strong><small>Registered Purpose OS participants</small></article><article><span>Active assessments</span><strong>{active}</strong><small>Life Mapping U in progress</small></article><article><span>Completed assessments</span><strong>{completed}</strong><small>Finalized LMU records</small></article><article><span>Active trainings</span><strong>0</strong><small>Experience enrollment arrives next</small></article><article><span>Organizations & Hubs</span><strong>0</strong><small>Membership architecture arrives next</small></article><article><span>Upcoming events</span><strong>0</strong><small>Engagement records arrive next</small></article></section>
    <div className="admin-dashboard-columns"><section className="admin-panel"><p className="admin-kicker">Activity</p><h2>Recent activity</h2>{activity?.length?<ul className="admin-activity-list">{activity.map(row=><li key={row.id}><div><strong>{humanize(row.action)}</strong><span>{row.admin_email}{row.entity_type?` · ${humanize(row.entity_type)}`:""}</span></div><time>{formatDate(row.created_at)}</time></li>)}</ul>:<p className="admin-muted">No recorded admin activity yet.</p>}</section><section className="admin-panel"><p className="admin-kicker">Journey</p><h2>Quick access</h2><div className="admin-quick-actions"><Link href="/admin/users">View Wayfinders</Link><Link href="/admin/organizations">Organizations & Hubs</Link><Link href="/admin/assessments/life-mapping-u">View LMU results</Link><Link href="/admin/trainings">Experience registry</Link><Link href="/admin/analytics">View analytics</Link></div></section></div>
  </AdminShell>;
}
