import Link from "next/link";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { getAdminExperienceIndex } from "@/lib/experiences/admin/data";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const { filter = "all" } = await searchParams;
  const { experiences } = await getAdminExperienceIndex();
  const rows = experiences.filter(item => filter === "all" || (filter === "active" ? item.status === "active" : item.status === filter || item.delivery_mode === filter));
  const tabs = [["all","All"],["draft","Draft"],["active","Active"],["archived","Archived"],["builder","Builder"],["hybrid","Hybrid"],["custom_code","Custom Code"]];
  return <AdminShell admin={admin}>
    <AdminPageHeader eyebrow="Experiences" title="Experience registry" description="The canonical Purpose OS registry for builder, hybrid, and custom-coded experiences." action={<div className="admin-heading-actions"><Link className="admin-secondary-link" href="/admin/trainings/themes">Themes</Link><Link className="admin-primary admin-primary-link" href="/admin/trainings/new">Create Experience</Link></div>}/>
    <nav className="admin-channel-tabs" aria-label="Filter Experiences">{tabs.map(([value,label]) => <Link className={filter === value ? "is-active" : ""} href={value === "all" ? "/admin/trainings" : `/admin/trainings?filter=${value}`} key={value}>{label}</Link>)}</nav>
    <div className="admin-table-wrap"><table><thead><tr><th>Experience</th><th>Type</th><th>Delivery</th><th>Status</th><th>Visibility</th><th>Published version</th><th>Owner</th><th>Updated</th></tr></thead><tbody>{rows.map(item => <tr key={item.id}><td><Link href={`/admin/trainings/${item.id}`}><strong>{item.name}</strong><br/><small>{item.slug}</small></Link></td><td>{humanize(item.experience_type)}</td><td>{humanize(item.delivery_mode)}</td><td><span className={`admin-status is-${item.status}`}>{humanize(item.status)}</span></td><td>{humanize(item.visibility)}</td><td>{item.currentVersion?.version_label ?? "—"}</td><td>{item.ownerName ?? "Platform"}</td><td>{formatDate(item.updated_at)}</td></tr>)}{!rows.length && <tr><td colSpan={8}>No Experiences match this view.</td></tr>}</tbody></table></div>
  </AdminShell>;
}
