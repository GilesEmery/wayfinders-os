import "server-only";
import { getAdmin, auditSecurityEvent } from "@/lib/admin/auth";
import { loadWayfinderJourney } from "./journey";
import { csvCell } from "./export-csv";

export class OperationalExportAccessError extends Error {
  readonly status = 403;
  constructor() { super("Operational export access is forbidden."); }
}

// Deliberately separate from exportWayfinder and every private response loader.
export async function exportOperationalWayfinder(participantId: string) {
  const identity = await getAdmin();
  if (!identity) throw new OperationalExportAccessError();
  const data = await loadWayfinderJourney(participantId);
  if (!("records" in data)) throw new Error("Operational records are unavailable.");
  const columns = ["Participant ID", "Record ID", "Kind", "Course or assessment", "Status", "Enrolled or started", "Completed", "Version ID", "Historical"];
  const rows = data.records.map(row => [participantId, row.id, row.kind, row.title, row.status, row.enrolledAt, row.completedAt ?? "", row.versionId ?? "", String(row.historical)]);
  await auditSecurityEvent(identity, "wayfinder.operational_csv_exported", "participant", participantId, { recordCount: rows.length });
  const date = new Date().toISOString().slice(0, 10);
  return { csv: `\uFEFF${[columns, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}\r\n`, filename: `wayfinder-operational-${participantId}-${date}.csv` };
}
