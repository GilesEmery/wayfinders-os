import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { WayfinderImport, type ResumableImport } from "@/components/admin/WayfinderImport";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page() {
  const identity = await requireAdmin();
  const db = createAdminSupabaseClient();
  const { data: job } = await db.from("crm_imports").select("id,file_name").eq("created_by", identity.id).in("status", ["review", "importing"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let initialImport: ResumableImport | null = null;
  if (job) {
    const { data: rows } = await db.from("crm_import_rows").select("id,row_number,source_data,first_name,last_name,email,email_normalized,classification,existing_participant_id,issue,selected,outcome").eq("import_id", job.id).order("row_number").limit(2000);
    initialImport = { importId: job.id, fileName: job.file_name, rows: (rows ?? []).map((row) => ({ id: row.id, rowNumber: row.row_number, sourceData: row.source_data as Record<string, string>, firstName: row.first_name ?? "", lastName: row.last_name ?? "", email: row.email ?? "", emailNormalized: row.email_normalized, fullName: [row.first_name, row.last_name].filter(Boolean).join(" "), classification: row.classification as ResumableImport["rows"][number]["classification"], existingParticipantId: row.existing_participant_id, existingMatch: null, issue: row.issue, selected: row.selected && row.outcome === "pending" })) };
  }
  return <AdminShell admin={identity} showAutomaticBlueprint={false}><AdminPageHeader eyebrow="Wayfinder CRM" title="Import Wayfinders" description="Stage, validate, reconcile, and confirm CSV records without creating duplicate contact data or authentication accounts."/><WayfinderImport initialImport={initialImport}/></AdminShell>;
}
