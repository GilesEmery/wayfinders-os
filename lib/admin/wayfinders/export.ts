import "server-only";
import { getAdmin, auditSecurityEvent } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { activityResultItems, activityResponseItems } from "@/lib/platform/response-library-policy";
import { readExportPages, wayfinderCsv, type ExportRecord } from "./export-csv";

export class WayfinderExportError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// Export participant-authored content independently of the curated Journey view.
const participantSources = [
  ["participant_responses", "Course responses"],
  ["experience_enrollment_version_history", "Archived course responses"],
  ["lmu_assessments", "Life Mapping U assessments"],
  ["participant_companion_entries", "Companion entries"],
  ["participant_personal_notes", "Personal notes"],
] as const;

export async function exportWayfinder(participantId: string) {
  const identity = await getAdmin();
  if (!identity) throw new WayfinderExportError(403, "Admin access is required.");
  const db = createAdminSupabaseClient();
  const person = await db.from("participants").select("id,full_name").eq("id", participantId).maybeSingle();
  if (person.error) throw new Error("Unable to load Wayfinder.");
  if (!person.data) throw new WayfinderExportError(404, "Wayfinder not found.");
  const records: ExportRecord[] = [];
  const groups = await Promise.all(participantSources.map(async ([table, section]) => {
    const order = "id";
    const rows = await readExportPages((from, to) => db.from(table).select("*").eq("participant_id", participantId).order(order).range(from, to));
    return rows.flatMap<ExportRecord>(row => {
      const record: Record<string, unknown> = row;
      if (table === "lmu_assessments") return [{ section, source: table, record: { id: record.id } }];
      if (table !== "experience_enrollment_version_history") return [{ section, source: table, record }];
      // Publish-forward archives answers alongside progress and transition metadata.
      // Retain the answers without turning the export into an activity history.
      const snapshot = record.artifact_snapshot as { removed_responses?: unknown[]; removed_companion_entries?: unknown[] } | null;
      const responses = Array.isArray(snapshot?.removed_responses) ? snapshot.removed_responses : [];
      const companionEntries = Array.isArray(snapshot?.removed_companion_entries) ? snapshot.removed_companion_entries : [];
      if (!responses.length && !companionEntries.length) return [];
      return [{ section, source: table, record: {
        id: record.id, enrollment_id: record.enrollment_id, experience_id: record.experience_id,
        experience_version_id: record.experience_version_id, responses: responses.map(value => { const response = value as Record<string, unknown>; return { response_definition_id: response.response_definition_id, response_data: response.response_data }; }), companion_entries: companionEntries.map(value => { const entry = value as Record<string, unknown>; return { entry_data: entry.entry_data }; }),
      } }];
    });
  }));
  records.push(...groups.flat());
  const assessments = records.filter(row => row.source === "lmu_assessments").map(row => String(row.record.id));
  for (let offset = 0; offset < assessments.length; offset += 100) {
    const ids = assessments.slice(offset, offset + 100);
    const groups = await Promise.all((["lmu_responses", "lmu_results"] as const).map(async table => {
      const rows = await readExportPages((from, to) => db.from(table).select("*").in("assessment_id", ids).order("id").range(from, to));
      return rows.map(record => ({ section: "Life Mapping U", source: table, record }));
    }));
    records.push(...groups.flat());
  }
  // Resolve course context without exporting enrollment or progress records.
  const enrollmentIds = [...new Set(records.flatMap(entry => typeof entry.record.enrollment_id === "string" ? [entry.record.enrollment_id] : []))];
  for (let offset = 0; offset < enrollmentIds.length; offset += 100) {
    const chunk = enrollmentIds.slice(offset, offset + 100);
    const enrollments = await readExportPages((from, to) => db.from("experience_enrollments").select("id,experience_id").eq("participant_id", participantId).in("id", chunk).order("id").range(from, to));
    const byId = new Map(enrollments.map(row => [row.id, row.experience_id]));
    for (const entry of records) if (typeof entry.record.enrollment_id === "string" && byId.has(entry.record.enrollment_id)) entry.record.experience_id = byId.get(entry.record.enrollment_id);
  }
  // Add names and authored question labels using only referenced IDs.
  const references = [
    ["experiences", "experience_id", "id,name,slug,experience_type"],
    ["response_definitions", "response_definition_id", "id,label,response_key,configuration"],
  ] as const;
  const definitions = new Map<string, Record<string, unknown>>();
  for (const [table, foreignKey, selection] of references) {
    const ids = [...new Set(records.flatMap(entry => typeof entry.record[foreignKey] === "string" ? [entry.record[foreignKey] as string] : []))];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const chunk = ids.slice(offset, offset + 100);
      const rows = await readExportPages((from, to) => db.from(table).select(selection).in("id", chunk).order("id").range(from, to));
      for (const row of rows) {
        const record = row as unknown as Record<string, unknown>;
        const label = String(record.name ?? record.label ?? "");
        if (table === "response_definitions") definitions.set(String(record.id), record);
        for (const entry of records) if (entry.record[foreignKey] === record.id) entry.label = [entry.label, label].filter(Boolean).join(" · ");
      }
    }
  }
  for (const entry of [...records]) {
    if (entry.source !== "participant_responses") continue;
    const definition = definitions.get(String(entry.record.response_definition_id));
    if (!definition) continue;
    const key = String(definition.response_key);
    const answers = activityResponseItems(key, entry.record.response_data, definition.configuration);
    const results = activityResultItems(key, entry.record.response_data, String(entry.record.status), typeof entry.record.finalized_at === "string" ? entry.record.finalized_at : null);
    if (answers.length || results.length) {
      // Replace storage payloads with readable answers rather than exporting both.
      entry.record = { id: entry.record.id, enrollment_id: entry.record.enrollment_id, experience_version_id: entry.record.experience_version_id, answers, results };
    }
  }
  const contentKeys: Record<string, string[]> = {
    participant_responses: ["response_data", "answers", "results"],
    experience_enrollment_version_history: ["responses", "companion_entries"],
    lmu_responses: ["section_key", "response_data"],
    lmu_results: ["section_key", "result_data"],
    participant_companion_entries: ["entry_data"],
    participant_personal_notes: ["content", "curriculum_context"],
  };
  const cleanRecords = records.flatMap<ExportRecord>(entry => {
    const keys = contentKeys[entry.source];
    if (!keys) return [];
    const record: Record<string, unknown> = { id: entry.record.id };
    for (const key of keys) if (entry.record[key] !== undefined) record[key] = entry.record[key];
    if (Object.keys(record).length === 1) return [];
    return [{ ...entry, record }];
  });
  // A single identity row keeps multiple people's exports distinguishable without account data.
  cleanRecords.unshift({ section: "Person", source: "participants", record: { name: person.data.full_name } });
  const exportedAt = new Date().toISOString();
  await auditSecurityEvent(identity, "wayfinder.responses_csv_exported", "participant", participantId, { recordCount: cleanRecords.length });
  return { csv: wayfinderCsv(participantId, cleanRecords, exportedAt), filename: `wayfinder-${participantId}-${exportedAt.slice(0, 10)}.csv` };
}
