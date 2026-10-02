import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deliverSignupNotifications, signupNotificationRecipients, signupNotificationText } from "./signup-notification.ts";
const event = { userId: "new-user", fullName: "Maya Fixture", email: "maya@example.test", createdAt: "2026-10-02T12:00:00.000Z" };
const members = [
  { id: "admin", email_normalized: "ADMIN@example.test", role: "admin", status: "active" },
  { id: "super", email_normalized: "super@example.test", role: "super_admin", status: "active" },
  { id: "duplicate", email_normalized: "admin@example.test", role: "admin", status: "active" },
  { id: "inactive", email_normalized: "inactive@example.test", role: "super_admin", status: "inactive" },
  { id: "invited", email_normalized: "invited@example.test", role: "admin", status: "invited" },
  { id: "other", email_normalized: "other@example.test", role: "participant", status: "active" },
];
const config = { apiKey: "fixture-key", from: "PurposeOS <notices@example.test>" };
const sleep = async () => {};

test("only active admins and super admins receive one email each", () => {
  assert.deepEqual(signupNotificationRecipients(members), [{ id: "admin", email: "admin@example.test" }, { id: "super", email: "super@example.test" }]);
  assert.deepEqual(signupNotificationRecipients([]), []);
});
test("signup notification uses text and contains no credentials", () => {
  const text = signupNotificationText({ ...event, fullName: "Maya\nFixture" });
  assert.ok(text.includes("Name: Maya Fixture"));
  assert.ok(text.includes(event.email));
  assert.ok(text.includes(event.createdAt));
  assert.doesNotMatch(text, /password|fixture-key/i);
});
test("separate recipient emails have stable idempotency keys and private audiences", async () => {
  const requests: RequestInit[] = [];
  const result = await deliverSignupNotifications(event, members, config, { sleep, fetch: async (_url, options) => { requests.push(options!); return Response.json({ id: "email-fixture" }); } });
  assert.equal(result.accepted, 2);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map((request) => JSON.parse(String(request.body)).to), [["admin@example.test"], ["super@example.test"]]);
  assert.deepEqual(requests.map((request) => (request.headers as Record<string, string>)["Idempotency-Key"]), ["purposeos-signup/new-user/admin", "purposeos-signup/new-user/super"]);
});
test("transient errors retry the identical payload and key", async () => {
  const requests: RequestInit[] = [];
  const result = await deliverSignupNotifications(event, members.slice(0, 1), config, { sleep, fetch: async (_url, options) => { requests.push(options!); if (requests.length === 1) throw new Error("timeout"); if (requests.length === 2) return new Response(null, { status: 429 }); return Response.json({ id: "accepted" }); } });
  assert.equal(result.accepted, 1);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].body, requests[2].body);
  assert.deepEqual(requests[0].headers, requests[2].headers);
});
test("permanent errors are isolated and do not prevent the other admin notification", async () => {
  let calls = 0;
  const result = await deliverSignupNotifications(event, members, config, { sleep, fetch: async (_url, options) => { calls++; return String(options?.body).includes("admin@example.test") ? new Response(null, { status: 422 }) : Response.json({ id: "accepted" }); } });
  assert.equal(calls, 2);
  assert.equal(result.accepted, 1);
  assert.deepEqual(result.failedRecipientIds, ["admin"]);
});
test("exhausted retries and missing configuration do not report successful delivery", async () => {
  let calls = 0;
  const fetchMock: typeof fetch = async () => { calls++; return new Response(null, { status: 503 }); };
  const result = await deliverSignupNotifications(event, members.slice(0, 1), config, { sleep, fetch: fetchMock });
  assert.equal(calls, 3);
  assert.equal(result.accepted, 0);
  await assert.rejects(deliverSignupNotifications(event, members, { apiKey: "", from: "" }, { sleep, fetch: fetchMock }), /not configured/);
  assert.equal(calls, 3);
});
test("signup dispatch follows duplicate/error guards and precedes the confirmation branch", () => {
  const route = readFileSync(new URL("../../app/api/account/signup/route.ts", import.meta.url), "utf8");
  assert.ok(route.indexOf("if (accountExists)") < route.indexOf("after(() => notifyAdminsOfSignup"));
  assert.ok(route.indexOf("if (error)") < route.indexOf("after(() => notifyAdminsOfSignup"));
  assert.ok(route.indexOf("after(() => notifyAdminsOfSignup") < route.indexOf("if (!data.user || !data.session)"));
});
