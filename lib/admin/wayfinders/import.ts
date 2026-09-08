export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ImportMapping = { firstName: string; lastName: string; email: string };
export type SourceRow = Record<string, string>;
export type ImportClassification = "new_wayfinder" | "existing_match" | "already_present" | "needs_review_shared_email" | "needs_review_duplicate_name" | "needs_review_invalid_email" | "needs_review_no_email" | "conflict";
export type ProposedImportRow = { rowNumber: number; sourceData: SourceRow; firstName: string; lastName: string; email: string; emailNormalized: string | null; fullName: string; classification: ImportClassification; existingParticipantId: string | null; existingMatch: string | null; issue: string | null; selected: boolean };

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const nameKey = (first: string, last: string) => `${first.toLocaleLowerCase()}\u0000${last.toLocaleLowerCase()}`;

export function normalizeImportRows(rows: SourceRow[], mapping: ImportMapping) {
  return rows.map((sourceData, index) => {
    const firstName = clean(sourceData[mapping.firstName]);
    const lastName = clean(sourceData[mapping.lastName]);
    const email = clean(sourceData[mapping.email]);
    return { rowNumber: index + 2, sourceData, firstName, lastName, email, emailNormalized: email ? email.toLocaleLowerCase() : null, fullName: [firstName, lastName].filter(Boolean).join(" ") };
  });
}

export function incomingDuplicateSets(rows: ReturnType<typeof normalizeImportRows>) {
  const emailNames = new Map<string, Set<string>>();
  const names = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.emailNormalized) {
      const set = emailNames.get(row.emailNormalized) ?? new Set<string>();
      set.add(nameKey(row.firstName, row.lastName)); emailNames.set(row.emailNormalized, set);
    }
    if (row.firstName || row.lastName) {
      const set = names.get(nameKey(row.firstName, row.lastName)) ?? new Set<string>();
      set.add(row.emailNormalized ?? ""); names.set(nameKey(row.firstName, row.lastName), set);
    }
  }
  return {
    sharedEmails: new Set([...emailNames].filter(([, values]) => values.size > 1).map(([key]) => key)),
    duplicateNames: new Set([...names].filter(([, values]) => values.size > 1).map(([key]) => key)),
  };
}

export function classifyImportRows(rows: ReturnType<typeof normalizeImportRows>, existing: Array<{ id: string; first_name: string; full_name: string | null; email_normalized: string }>): ProposedImportRow[] {
  const byEmail = new Map<string, typeof existing>();
  for (const participant of existing) { const values = byEmail.get(participant.email_normalized) ?? []; values.push(participant); byEmail.set(participant.email_normalized, values); }
  const { sharedEmails, duplicateNames } = incomingDuplicateSets(rows);
  return rows.map((row) => {
    let classification: ImportClassification = "new_wayfinder"; let issue: string | null = null; let match: (typeof existing)[number] | undefined;
    const matches = row.emailNormalized ? byEmail.get(row.emailNormalized) ?? [] : [];
    if (!row.emailNormalized) { classification = "needs_review_no_email"; issue = "No email address was provided."; }
    else if (!EMAIL_PATTERN.test(row.emailNormalized) || row.emailNormalized.length > 254) { classification = "needs_review_invalid_email"; issue = "The email format is invalid."; }
    else if (sharedEmails.has(row.emailNormalized)) { classification = "needs_review_shared_email"; issue = "Multiple incoming names use this email."; }
    else if (duplicateNames.has(nameKey(row.firstName, row.lastName))) { classification = "needs_review_duplicate_name"; issue = "This incoming name appears with a different or missing email."; }
    else if (matches.length > 1) { classification = "conflict"; issue = "Multiple existing Wayfinders use this email."; }
    else if (matches.length === 1) {
      match = matches[0];
      const existingName = (match.full_name || match.first_name).trim().toLocaleLowerCase();
      if (existingName === row.fullName.toLocaleLowerCase() || (!row.lastName && existingName === row.firstName.toLocaleLowerCase())) classification = "already_present";
      else { classification = "conflict"; issue = "The email matches an existing Wayfinder with a different name."; }
    }
    return { ...row, classification, existingParticipantId: match?.id ?? null, existingMatch: match ? match.full_name || match.first_name : null, issue, selected: classification === "new_wayfinder" };
  });
}
