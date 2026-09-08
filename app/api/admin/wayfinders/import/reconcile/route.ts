import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { classifyImportRows, IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, normalizeImportRows, type ImportMapping, type SourceRow } from "@/lib/admin/wayfinders/import";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const identity = await getAdmin();
  if (!identity) return NextResponse.json({ error: "Purpose OS Admin access is required." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > IMPORT_MAX_BYTES) return NextResponse.json({ error: "CSV imports are limited to 2 MB." }, { status: 413 });
  const body = await request.json() as { fileName?: unknown; mapping?: Partial<ImportMapping>; rows?: unknown };
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  if (!fileName.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
  if (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > IMPORT_MAX_ROWS) return NextResponse.json({ error: `CSV files must contain 1–${IMPORT_MAX_ROWS} data rows.` }, { status: 400 });
  const mapping = body.mapping;
  if (!mapping?.firstName || !mapping.lastName || !mapping.email) return NextResponse.json({ error: "Map First Name, Last Name, and Email." }, { status: 400 });
  const rows = body.rows.filter((row): row is SourceRow => Boolean(row) && typeof row === "object" && !Array.isArray(row));
  if (rows.length !== body.rows.length) return NextResponse.json({ error: "The CSV contains an invalid row." }, { status: 400 });
  const db = createAdminSupabaseClient();
  const normalized = normalizeImportRows(rows, mapping as ImportMapping);
  const emails = [...new Set(normalized.flatMap((row) => row.emailNormalized ? [row.emailNormalized] : []))];
  const existing: Array<{ id: string; first_name: string; full_name: string | null; email_normalized: string }> = [];
  for (let index = 0; index < emails.length; index += 100) {
    const result = await db.from("participants").select("id,first_name,full_name,email_normalized").in("email_normalized", emails.slice(index, index + 100));
    if (result.error) return NextResponse.json({ error: "Unable to reconcile existing Wayfinders." }, { status: 500 });
    existing.push(...(result.data ?? []));
  }
  const proposals = classifyImportRows(normalized, existing);
  const job = await db.from("crm_imports").insert({ file_name: fileName, column_mapping: mapping, row_count: proposals.length, created_by: identity.id }).select("id").single();
  if (job.error) return NextResponse.json({ error: "Apply the Wayfinder CSV import migration before using this workflow." }, { status: 503 });
  const staged = proposals.map((row) => ({ import_id: job.data.id, row_number: row.rowNumber, source_data: row.sourceData, first_name: row.firstName || null, last_name: row.lastName || null, email: row.email || null, email_normalized: row.emailNormalized, classification: row.classification, existing_participant_id: row.existingParticipantId, issue: row.issue, selected: row.selected }));
  const inserted = await db.from("crm_import_rows").insert(staged).select("id,row_number");
  if (inserted.error) return NextResponse.json({ error: "Unable to stage the import rows." }, { status: 500 });
  const ids = new Map((inserted.data ?? []).map((row) => [row.row_number, row.id]));
  return NextResponse.json({ importId: job.data.id, rows: proposals.map((row) => ({ ...row, id: ids.get(row.rowNumber) })) });
}
