import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { EMAIL_PATTERN } from "@/lib/admin/wayfinders/import";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 500;
const ROW_CONCURRENCY = 20;
type ImportRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; email_normalized: string | null; classification: string; selected: boolean; outcome: string };

async function loadImportRows(db: ReturnType<typeof createAdminSupabaseClient>, importId: string) {
  const rows: ImportRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await db.from("crm_import_rows").select("id,first_name,last_name,email,email_normalized,classification,selected,outcome").eq("import_id", importId).order("row_number").range(from, from + PAGE_SIZE - 1);
    if (result.error) return { error: result.error } as const;
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < PAGE_SIZE) break;
  }
  return { rows } as const;
}

export async function POST(request: NextRequest) {
  const identity = await getAdmin();
  if (!identity) return NextResponse.json({ error: "Purpose OS Admin access is required." }, { status: 403 });
  const body = await request.json() as { importId?: unknown; rowIds?: unknown };
  if (typeof body.importId !== "string" || !Array.isArray(body.rowIds) || body.rowIds.some((id) => typeof id !== "string")) return NextResponse.json({ error: "Invalid import selection." }, { status: 400 });
  const db = createAdminSupabaseClient();
  const jobResult = await db.from("crm_imports").select("id,status,row_count,created_by,result_summary").eq("id", body.importId).maybeSingle();
  if (jobResult.error) { console.error("Wayfinder import job lookup failed", { importId: body.importId, code: jobResult.error.code }); return NextResponse.json({ error: "Import failed: the staged import could not be loaded." }, { status: 500 }); }
  const job = jobResult.data;
  if (!job || job.created_by !== identity.id) return NextResponse.json({ error: "This import is unavailable." }, { status: 404 });
  if (job.status === "completed") return NextResponse.json(job.result_summary);
  if (!(["review", "importing"] as string[]).includes(job.status)) return NextResponse.json({ error: "Import failed: this import cannot be resumed." }, { status: 409 });

  const loaded = await loadImportRows(db, job.id);
  if ("error" in loaded) { console.error("Wayfinder staged-row lookup failed", { importId: job.id, code: loaded.error?.code }); return NextResponse.json({ error: "Import failed: staged rows could not be loaded." }, { status: 500 }); }
  const requestedIds = new Set(body.rowIds as string[]);
  const eligible = loaded.rows.filter((row) => requestedIds.has(row.id) && row.selected && row.classification === "new_wayfinder" && row.outcome === "pending");
  const eligibleOrProcessed = new Set(loaded.rows.filter((row) => row.selected && row.classification === "new_wayfinder" && ["pending", "created", "matched"].includes(row.outcome)).map((row) => row.id));
  if ([...requestedIds].some((id) => !eligibleOrProcessed.has(id))) return NextResponse.json({ error: "Import failed: the selection contains rows that are not eligible for import." }, { status: 409 });

  if (job.status === "review") {
    const claimed = await db.from("crm_imports").update({ status: "importing", confirmed_at: new Date().toISOString() }).eq("id", job.id).eq("status", "review").select("id").maybeSingle();
    if (claimed.error || !claimed.data) { console.error("Wayfinder import claim failed", { importId: job.id, code: claimed.error?.code }); return NextResponse.json({ error: "Import failed: another confirmation may already be processing this import." }, { status: 409 }); }
  }

  let created = loaded.rows.filter((row) => row.outcome === "created").length;
  let matched = loaded.rows.filter((row) => row.outcome === "matched" || row.classification === "already_present" || row.classification === "existing_match").length;
  let failed = loaded.rows.filter((row) => row.outcome === "failed").length;
  for (let offset = 0; offset < eligible.length; offset += ROW_CONCURRENCY) {
    await Promise.all(eligible.slice(offset, offset + ROW_CONCURRENCY).map(async (row) => {
      const email = row.email_normalized?.trim().toLowerCase() ?? "";
      if (!row.first_name?.trim() || !row.last_name?.trim() || !EMAIL_PATTERN.test(email)) { failed++; await db.from("crm_import_rows").update({ outcome: "failed", error_detail: "Required normalized fields failed confirmation validation." }).eq("id", row.id).eq("outcome", "pending"); return; }
      const matches = await db.from("participants").select("id").eq("email_normalized", email).limit(2);
      if (matches.error) { failed++; console.error("Wayfinder row reconciliation failed", { importId: job.id, rowId: row.id, code: matches.error.code }); await db.from("crm_import_rows").update({ outcome: "failed", error_detail: "Existing participant reconciliation failed." }).eq("id", row.id).eq("outcome", "pending"); return; }
      if ((matches.data?.length ?? 0) > 0) { matched++; await db.from("crm_import_rows").update({ outcome: "matched", existing_participant_id: matches.data![0].id, error_detail: null }).eq("id", row.id).eq("outcome", "pending"); return; }
      const fullName = `${row.first_name.trim()} ${row.last_name.trim()}`;
      const result = await db.from("participants").insert({ first_name: row.first_name.trim(), full_name: fullName, email: row.email?.trim() || email, email_normalized: email, auth_user_id: null }).select("id").single();
      if (result.error) { failed++; console.error("Wayfinder participant insert failed", { importId: job.id, rowId: row.id, code: result.error.code }); await db.from("crm_import_rows").update({ outcome: "failed", error_detail: "Participant creation failed." }).eq("id", row.id).eq("outcome", "pending"); }
      else { created++; await db.from("crm_import_rows").update({ outcome: "created", created_participant_id: result.data.id, error_detail: null }).eq("id", row.id).eq("outcome", "pending"); }
    }));
  }

  const accountedFor = loaded.rows.filter((row) => row.classification === "already_present" || row.classification === "existing_match" || ["created", "matched", "failed"].includes(row.outcome)).length + eligible.length;
  const summary = { rowsRead: job.row_count, created, matched, skipped: Math.max(0, job.row_count - accountedFor), review: loaded.rows.filter((row) => row.classification.startsWith("needs_review") || row.classification === "conflict").length, failed };
  const finalStatus = eligible.length > 0 && failed === eligible.length && created === 0 && matched === 0 ? "failed" : "completed";
  const completed = await db.from("crm_imports").update({ status: finalStatus, completed_at: new Date().toISOString(), result_summary: summary }).eq("id", job.id);
  if (completed.error) { console.error("Wayfinder import summary update failed", { importId: job.id, code: completed.error.code }); return NextResponse.json({ error: "Import processing finished, but its result summary could not be saved. Review the staged job before retrying." }, { status: 500 }); }
  await audit(identity, "imported_wayfinders_csv", "crm_import", job.id, summary);
  return NextResponse.json(summary);
}
