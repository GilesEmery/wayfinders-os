import Link from "next/link";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { getExperienceThemes } from "@/lib/experiences/admin/themes";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin(); const { filter = "all" } = await searchParams; const data = await getExperienceThemes();
  const organizations = new Map(data.organizations.map(item => [item.id,item.name]));
  const rows = data.themes.filter(theme => filter === "all" || theme.status === filter || (filter === "global" ? !theme.organization_id : filter === "organization" ? Boolean(theme.organization_id) : false));
  const tabs = [["all","All"],["draft","Draft"],["active","Active"],["archived","Archived"],["global","Global"],["organization","Organization"]];
  return <AdminShell admin={admin}><AdminPageHeader eyebrow="Experience branding" title="Themes" description="Revisioned, controlled visual tokens for Purpose OS Experiences." action={<div className="admin-heading-actions"><Link className="admin-secondary-link" href="/admin/trainings">Experiences</Link><Link className="admin-primary admin-primary-link" href="/admin/trainings/themes/new">Create theme</Link></div>}/><nav className="admin-channel-tabs" aria-label="Filter themes">{tabs.map(([value,label]) => <Link className={filter === value ? "is-active" : ""} href={value === "all" ? "/admin/trainings/themes" : `/admin/trainings/themes?filter=${value}`} key={value}>{label}</Link>)}</nav><div className="admin-table-wrap"><table><thead><tr><th>Theme</th><th>Key</th><th>Revision</th><th>Status</th><th>Scope</th><th>Usage</th><th>Updated</th></tr></thead><tbody>{rows.map(theme => { const usage = data.experiences.filter(item => item.default_theme_id === theme.id).length + data.versions.filter(item => item.theme_id === theme.id).length; return <tr key={theme.id}><td><Link href={`/admin/trainings/themes/${theme.id}`}><strong>{theme.name}</strong></Link></td><td>{theme.theme_key}</td><td>{theme.revision}</td><td><span className={`admin-status is-${theme.status}`}>{humanize(theme.status)}</span></td><td>{theme.organization_id ? organizations.get(theme.organization_id) ?? "Organization" : "Global"}</td><td>{usage}</td><td>{formatDate(theme.updated_at)}</td></tr>; })}{!rows.length && <tr><td colSpan={7}>No themes match this view.</td></tr>}</tbody></table></div></AdminShell>;
}
