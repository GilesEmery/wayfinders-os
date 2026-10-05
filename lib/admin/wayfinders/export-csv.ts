export type ExportRecord = { section: string; source: string; record: Record<string, unknown>; label?: string };

export async function readExportPages<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pageSize = 500): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await query(from, from + pageSize - 1);
    if (result.error) throw new Error("Unable to load complete Wayfinder export.");
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Quoting alone does not prevent spreadsheet applications executing formulas.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function fields(value: unknown, path: string): Array<[string, unknown]> {
  if (value === null || typeof value !== "object") return [[path, value]];
  if (Array.isArray(value) && value.length && value.every(item => item && typeof item.question === "string" && typeof item.response === "string")) {
    return value.map(item => [`${path === "results" ? "Result · " : ""}${item.question || "Response"}`, item.response]);
  }
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  if (!entries.length) return [[path, Array.isArray(value) ? "[]" : "{}"]];
  return entries.flatMap(([key, item]) => fields(item, path ? `${path}.${key}` : key));
}
export function wayfinderCsv(participantId: string, records: ExportRecord[], exportedAt: string): string {
  const lines = [["Participant ID", "Section", "Source", "Record ID", "Record label", "Field", "Value", "Exported at"].map(csvCell).join(",")];
  for (const entry of records) {
    const id = entry.record.id ?? entry.record.participant_id ?? entry.record.auth_user_id ?? "";
    for (const [field, value] of fields(entry.record, "")) lines.push([participantId, entry.section, entry.source, id, entry.label ?? "", field, value, exportedAt].map(csvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
