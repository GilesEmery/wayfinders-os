"use client";

import { useMemo, useState } from "react";
import type { ImportMapping, ProposedImportRow, SourceRow } from "@/lib/admin/wayfinders/import";

type PreviewRow = ProposedImportRow & { id: string };
type Result = { rowsRead: number; created: number; matched: number; skipped: number; review: number; failed: number };
export type ResumableImport = { importId: string; fileName: string; rows: PreviewRow[] };
const labels: Record<ProposedImportRow["classification"], string> = { new_wayfinder: "New Wayfinder", existing_match: "Existing Match", already_present: "Already Present", needs_review_shared_email: "Needs Review — Shared Email", needs_review_duplicate_name: "Needs Review — Duplicate Name", needs_review_invalid_email: "Needs Review — Invalid Email", needs_review_no_email: "Needs Review — No Email", conflict: "Conflict" };
const suggestions: Record<keyof ImportMapping, string[]> = { firstName: ["first_name", "first name", "first", "given name"], lastName: ["last_name", "last name", "surname"], email: ["email", "email address"] };

function parseCsv(text: string) {
  const matrix: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') { if (quoted && text[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index++; row.push(field); if (row.some((value) => value.trim())) matrix.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  row.push(field); if (row.some((value) => value.trim())) matrix.push(row);
  const headers = (matrix.shift() ?? []).map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim());
  if (!headers.length || new Set(headers).size !== headers.length) throw new Error("CSV headers must be present and unique.");
  return { headers, rows: matrix.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))) as SourceRow[] };
}

const suggested = (headers: string[], key: keyof ImportMapping) => headers.find((header) => suggestions[key].includes(header.trim().toLowerCase())) ?? "";

export function WayfinderImport({ initialImport }: { initialImport?: ResumableImport | null }) {
  const [fileName, setFileName] = useState(initialImport?.fileName ?? ""); const [headers, setHeaders] = useState<string[]>([]); const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({ firstName: "", lastName: "", email: "" }); const [rows, setRows] = useState<PreviewRow[]>(initialImport?.rows ?? []); const [importId, setImportId] = useState(initialImport?.importId ?? "");
  const [filter, setFilter] = useState("all"); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [result, setResult] = useState<Result | null>(null);
  const visible = useMemo(() => rows.filter((row) => filter === "all" || (filter === "ready" && row.classification === "new_wayfinder") || (filter === "existing" && ["existing_match", "already_present"].includes(row.classification)) || (filter === "review" && row.classification.startsWith("needs_review")) || (filter === "errors" && row.classification === "conflict")), [filter, rows]);
  const selectedIds = rows.filter((row) => row.selected && row.classification === "new_wayfinder").map((row) => row.id);

  async function chooseFile(file?: File) {
    if (!file) return; setError(""); setResult(null); setRows([]); setImportId("");
    if (!file.name.toLowerCase().endsWith(".csv") || (file.type && !["text/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type))) return setError("Choose a CSV file.");
    if (file.size > 2 * 1024 * 1024) return setError("CSV imports are limited to 2 MB.");
    try { const parsed = parseCsv(await file.text()); if (parsed.rows.length > 2000) throw new Error("CSV imports are limited to 2,000 rows."); setFileName(file.name); setHeaders(parsed.headers); setSourceRows(parsed.rows); setMapping({ firstName: suggested(parsed.headers, "firstName"), lastName: suggested(parsed.headers, "lastName"), email: suggested(parsed.headers, "email") }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to parse the CSV."); }
  }

  async function reconcile() {
    setBusy(true); setError("");
    try { const response = await fetch("/api/admin/wayfinders/import/reconcile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName, mapping, rows: sourceRows }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRows(data.rows); setImportId(data.importId); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to reconcile the CSV."); } finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError("");
    try { const response = await fetch("/api/admin/wayfinders/import/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importId, rowIds: selectedIds }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); }
    catch (caught) { const message = caught instanceof Error ? caught.message : "Unable to confirm the import."; setError(message.startsWith("Import failed") ? message : `Import failed: ${message}`); } finally { setBusy(false); }
  }

  return <div className="crm-import">
    <ol className="crm-import-steps" aria-label="Import progress"><li className={fileName ? "is-done" : "is-active"}>1 Upload CSV</li><li className={headers.length ? "is-active" : ""}>2 Map Columns</li><li className={rows.length ? "is-done" : ""}>3 Preview & Validate</li><li className={rows.length ? "is-done" : ""}>4 Reconcile</li><li className={rows.length ? "is-active" : ""}>5 Review Issues</li><li className={rows.length && !result ? "is-active" : ""}>6 Confirm</li><li className={result ? "is-done" : ""}>7 Results</li></ol>
    <section className="admin-panel"><h2>Upload CSV</h2><p>CSV only, UTF-8, up to 2 MB and 2,000 data rows. Uploading does not create Wayfinders.</p>{initialImport && importId === initialImport.importId && <p><strong>Resumed staged import:</strong> review the saved selection below and press Confirm Import when ready.</p>}<label className="crm-file-picker">CSV file<input accept=".csv,text/csv" onChange={(event) => void chooseFile(event.target.files?.[0])} type="file"/></label>{fileName && <p><strong>{fileName}</strong> · {sourceRows.length || rows.length} rows read</p>}</section>
    {headers.length > 0 && <section className="admin-panel"><h2>Map Columns</h2><div className="crm-import-mapping">{(["firstName", "lastName", "email"] as const).map((key) => <label key={key}>{key === "firstName" ? "First Name" : key === "lastName" ? "Last Name" : "Email"}<select value={mapping[key]} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}><option value="">Choose a column</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div><button className="admin-primary" disabled={busy || !mapping.firstName || !mapping.lastName || !mapping.email} onClick={() => void reconcile()} type="button">{busy ? "Reconciling…" : "Preview & Reconcile"}</button></section>}
    {error && <p className="admin-form-message" role="alert">{error}</p>}
    {rows.length > 0 && !result && <section className="admin-panel"><h2>Review & Confirm</h2><p>Only safe New Wayfinder rows are selected. Review items and conflicts cannot be imported.</p><div className="crm-import-filters" role="group" aria-label="Preview filters">{["all", "ready", "existing", "review", "errors"].map((value) => <button className={filter === value ? "is-active" : ""} key={value} onClick={() => setFilter(value)} type="button">{value}</button>)}</div><div className="admin-table-wrap"><table><thead><tr><th>Import</th><th>First Name</th><th>Last Name</th><th>Email</th><th>Proposed Action</th><th>Existing Match</th><th>Issue / Warning</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td><input aria-label={`Import row ${row.rowNumber}`} checked={row.selected} disabled={row.classification !== "new_wayfinder"} onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, selected: event.target.checked } : item))} type="checkbox"/></td><td>{row.firstName || "—"}</td><td>{row.lastName || "—"}</td><td>{row.email || "—"}</td><td>{labels[row.classification]}</td><td>{row.existingMatch || "—"}</td><td>{row.issue || "Ready"}</td></tr>)}</tbody></table></div><div className="crm-import-confirm"><span>{selectedIds.length} safe rows selected</span><button className="admin-primary" disabled={busy || !selectedIds.length} onClick={() => void confirm()} type="button">{busy ? "Importing…" : "Confirm Import"}</button></div></section>}
    {result && <section className="admin-panel" aria-live="polite"><h2>Import Results</h2><div className="crm-import-results">{Object.entries(result).map(([key, value]) => <div key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{value}</strong></div>)}</div></section>}
  </div>;
}
