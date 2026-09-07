import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function PartnersPage() {
  const admin = await requireAdmin(); const { data: partners } = await createAdminSupabaseClient().from("organizations").select("id,name,slug,organization_type,status").order("name");
  return <AdminShell admin={admin}><AdminPageHeader eyebrow="Communities" title="Partners" description="Churches, ministries, businesses, nonprofits, funders, and strategic partners—relational records, not the authorization hierarchy."/><div className="admin-table-wrap"><table><thead><tr><th>Partner</th><th>Type</th><th>Reference</th><th>Status</th></tr></thead><tbody>{(partners ?? []).map((partner) => <tr key={partner.id}><td>{partner.name}</td><td>{humanize(partner.organization_type)}</td><td>{partner.slug}</td><td>{humanize(partner.status)}</td></tr>)}{!partners?.length && <tr><td colSpan={4}>No Partner records have been created.</td></tr>}</tbody></table></div></AdminShell>;
}
