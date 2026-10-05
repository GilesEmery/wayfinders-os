import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, readExportPages, wayfinderCsv } from "./export-csv.ts";

test("CSV escapes commas, quotes, newlines and Unicode without losing answers", () => {
  assert.equal(csvCell('A, "B"\nCafé'), '"A, ""B""\nCafé"');
  assert.equal(csvCell(false), '"false"');
  assert.equal(csvCell(0), '"0"');
  assert.equal(csvCell(null), '""');
});
test("CSV protects spreadsheet formula cells, including whitespace prefixes", () => {
  for (const input of ["=HYPERLINK(\"https://example.com\")", "+SUM(1,2)", "-1+2", "@SUM(1)", "  =1", "\t=1", "\r=1", "\n=1"]) assert.ok(csvCell(input).startsWith('"\''));
});
test("CSV preserves nested archived responses, empty collections and repeated record context", () => {
  const csv = wayfinderCsv("person", [{ section: "History", source: "history", label: "Hub leader", record: { id: "record", snapshot: { removed_responses: [{ response_data: { answer: "Saved answer" } }] }, empty: [], missing: null } }], "2026-10-05T15:00:00Z");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"snapshot.removed_responses.0.response_data.answer","Saved answer"'));
  assert.ok(csv.includes('"empty","[]"'));
  assert.ok(csv.includes('"missing",""'));
  assert.equal(csv.split("\r\n").filter(Boolean).length, 5);
});
test("exports read every page, including exact page-size boundaries", async () => {
  const ranges: number[][] = [];
  const rows = await readExportPages(async (from, to) => { ranges.push([from, to]); return { data: from < 4 ? [{ id: from }, { id: from + 1 }] : [], error: null }; }, 2);
  assert.deepEqual(ranges, [[0, 1], [2, 3], [4, 5]]);
  assert.equal(rows.length, 4);
});
test("a failed later page fails the export instead of returning a partial CSV", async () => {
  await assert.rejects(readExportPages(async from => ({ data: from === 0 ? [{ id: 1 }] : null, error: from === 0 ? null : new Error("database error") }), 1), /complete Wayfinder export/);
});
