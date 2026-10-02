import assert from "node:assert/strict";
import test from "node:test";
import { measureOperation, measuredSupabaseFetch } from "./performance-measurement.ts";

test("numeric diagnostics include nested requests without URLs, credentials or payloads", async () => {
  const previous = process.env.WAYFINDERS_PERFORMANCE;
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const logs: unknown[] = [];
  process.env.WAYFINDERS_PERFORMANCE = "1";
  globalThis.fetch = async () => new Response("private-fixture-answer");
  console.info = (...args: unknown[]) => { logs.push(args); };
  try {
    await measureOperation("pis-save", async () => {
      await measureOperation("course-mutation-data", async () => {
        await measuredSupabaseFetch("https://fixture.invalid/rest/v1/private-table?credential=secret", { headers: { Authorization: "secret" }, body: "private-fixture-answer", method: "POST" });
      });
      await measuredSupabaseFetch("https://fixture.invalid/storage/v1/object/sign/private-path?token=secret");
    });
    const text = JSON.stringify(logs);
    assert.doesNotMatch(text, /secret|private-table|private-path|private-fixture-answer|Authorization|fixture.invalid/);
    const child = JSON.parse((logs[0] as [string, string])[1]);
    const parent = JSON.parse((logs[1] as [string, string])[1]);
    assert.equal(child.requests.databaseHttp.count, 1);
    assert.equal(parent.requests.databaseHttp.count, 1);
    assert.equal(parent.requests.storageHttp.count, 1);
    process.env.WAYFINDERS_PERFORMANCE = "0";
    await measureOperation("pis-save", async () => { await measuredSupabaseFetch("https://fixture.invalid/auth/v1/user"); });
    assert.equal(logs.length, 2);
  } finally {
    globalThis.fetch = originalFetch; console.info = originalInfo;
    if (previous === undefined) delete process.env.WAYFINDERS_PERFORMANCE; else process.env.WAYFINDERS_PERFORMANCE = previous;
  }
});
