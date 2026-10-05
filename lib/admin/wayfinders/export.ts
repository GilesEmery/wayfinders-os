import "server-only";
import { getAdmin, auditSecurityEvent } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { activityResultItems, activityResponseItems } from "@/lib/platform/response-library-policy";
import { readExportPages, wayfinderCsv, type ExportRecord } from "./export-csv";

export class WayfinderExportError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// Explicitly scoped business records; authentication credentials and sessions are never exported.
const participantSources = [
  ["organization_memberships", "Communities"], ["hub_memberships", "Communities"], ["cohort_memberships", "Communities"],
  ["participant_tags", "Classifications"], ["participant_preferences", "Preferences"], ["crm_notes", "CRM notes"],
  ["experience_enrollments", "Courses"], ["experience_progress", "Course progress"], ["lesson_progress", "Lesson progress"], ["section_progress", "Page progress"],
  ["participant_responses", "Course responses"], ["experience_enrollment_version_history", "Course history"], ["embedded_assessment_attempts", "Assessment attempts"],
  ["lmu_assessments", "Life Mapping U assessments"], ["experience_entitlements", "Experience access"], ["participant_offering_assignments", "Offering assignments"],
  ["participant_companion_entries", "Companion entries"], ["participant_personal_notes", "Personal notes"],
] as const;

export async function exportWayfinder(participantId: string) {
  const identity = await getAdmin();
  if (!identity) throw new WayfinderExportError(403, "Admin access is required.");
  const db = createAdminSupabaseClient();
  const person = await db.from("participants").select("*").eq("id", participantId).maybeSingle();
  if (person.error) throw new Error("Unable to load Wayfinder.");
  if (!person.data) throw new WayfinderExportError(404, "Wayfinder not found.");
  const records: ExportRecord[] = [{ section: "Profile", source: "participants", record: person.data }];
  const groups = await Promise.all(participantSources.map(async ([table, section]) => {
    const order = table === "participant_tags" ? "tag_id" : table === "participant_preferences" ? "participant_id" : "id";
    const rows = await readExportPages((from, to) => db.from(table).select("*").eq("participant_id", participantId).order(order).range(from, to));
    return rows.map(record => ({ section, source: table, record }));
  }));
  records.push(...groups.flat());
  const assessments = records.filter(row => row.source === "lmu_assessments").map(row => String(row.record.id));
  for (let offset = 0; offset < assessments.length; offset += 100) {
    const ids = assessments.slice(offset, offset + 100);
    const groups = await Promise.all((["lmu_responses", "lmu_results", "lmu_section_progress"] as const).map(async table => {
      const rows = await readExportPages((from, to) => db.from(table).select("*").in("assessment_id", ids).order("id").range(from, to));
      return rows.map(record => ({ section: "Life Mapping U", source: table, record }));
    }));
    records.push(...groups.flat());
  }
  if (person.data.auth_user_id) {
    const authId = person.data.auth_user_id;
    const [roles, overrides, permissions, admin] = await Promise.all([
      readExportPages((from, to) => db.from("platform_role_assignments").select("*").eq("auth_user_id", authId).order("id").range(from, to)),
      readExportPages((from, to) => db.from("authorization_entitlement_overrides").select("*").eq("auth_user_id", authId).order("entitlement_key").range(from, to)),
      readExportPages((from, to) => db.from("authorization_permission_overrides").select("*").eq("auth_user_id", authId).order("permission_key").order("scope_type").order("scope_id").range(from, to)),
      db.from("admin_members").select("id,auth_user_id,role,status,created_at,updated_at,last_login_at").eq("auth_user_id", authId),
    ]);
    if (admin.error) throw new Error("Unable to load account role.");
    records.push(...roles.map(record => ({ section: "Leadership", source: "platform_role_assignments", record })), ...overrides.map(record => ({ section: "Access", source: "authorization_entitlement_overrides", record })), ...permissions.map(record => ({ section: "Access", source: "authorization_permission_overrides", record })), ...(admin.data ?? []).map(record => ({ section: "Administration", source: "admin_members", record })));
  }
  const audit = await readExportPages((from, to) => db.from("admin_audit_log").select("*").eq("entity_type", "participant").eq("entity_id", participantId).order("id").range(from, to));
  records.push(...audit.map(record => ({ section: "Activity", source: "admin_audit_log", record })));
  // Add names and authored question labels using only referenced IDs.
  const references = [
    ["experiences", "experience_id", "id,name,slug,experience_type"], ["cohorts", "cohort_id", "id,name,experience_id"],
    ["hubs", "hub_id", "id,name"], ["organizations", "organization_id", "id,name"], ["tags", "tag_id", "id,name,description"],
    ["experience_offerings", "offering_id", "id,name,experience_id"], ["response_definitions", "response_definition_id", "id,label,response_key,configuration"],
  ] as const;
  for (const [table, foreignKey, selection] of references) {
    const ids = [...new Set(records.flatMap(entry => typeof entry.record[foreignKey] === "string" ? [entry.record[foreignKey] as string] : []))];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const chunk = ids.slice(offset, offset + 100);
      const rows = await readExportPages((from, to) => db.from(table).select(selection).in("id", chunk).order("id").range(from, to));
      for (const row of rows) {
        const record = row as unknown as Record<string, unknown>;
        const label = String(record.name ?? record.label ?? "");
        records.push({ section: "Referenced names & questions", source: table, record, label });
        for (const entry of records) if (entry.record[foreignKey] === record.id) entry.label = [entry.label, label].filter(Boolean).join(" · ");
      }
    }
  }
  const definitions = new Map(records.filter(entry => entry.source === "response_definitions").map(entry => [String(entry.record.id), entry.record]));
  for (const entry of [...records]) {
    if (entry.source !== "participant_responses") continue;
    const definition = definitions.get(String(entry.record.response_definition_id));
    if (!definition) continue;
    const key = String(definition.response_key);
    const answers = activityResponseItems(key, entry.record.response_data, definition.configuration);
    const results = activityResultItems(key, entry.record.response_data, String(entry.record.status), typeof entry.record.finalized_at === "string" ? entry.record.finalized_at : null);
    if (answers.length || results.length) records.push({ section: "Readable answers & assessment results", source: "participant_responses", label: entry.label, record: { id: entry.record.id, enrollment_id: entry.record.enrollment_id, experience_version_id: entry.record.experience_version_id, answers, results } });
  }
  const exportedAt = new Date().toISOString();
  await auditSecurityEvent(identity, "wayfinder.full_csv_exported", "participant", participantId, { recordCount: records.length });
  return { csv: wayfinderCsv(participantId, records, exportedAt), filename: `wayfinder-${participantId}-${exportedAt.slice(0, 10)}.csv` };
}
