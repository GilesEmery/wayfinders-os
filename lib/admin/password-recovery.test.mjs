import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function compile(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", source)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, compiled, compiled.exports);
  return compiled.exports;
}

const policy = compile("lib/admin/password-recovery-policy.ts");
const participantId = "11111111-1111-4111-8111-111111111111";
function setup(options = {}) {
  const audits = [], generated = [];
  const actor = options.actor === undefined ? { id: "actor", role: "admin" } : options.actor;
  const db = {
    from(table) {
      const value = table === "participants" ? { id: participantId, auth_user_id: options.targetId ?? "target", email: "person@example.com" }
        : table === "admin_members" ? (options.targetRole ? { role: options.targetRole } : null)
        : options.recent ? [{ id: "recent" }] : [];
      const result = { data: value, error: options.lookupFailure ? { message: "unavailable" } : null };
      const chain = { select: () => chain, eq: () => chain, gte: () => chain, limit: async () => result, maybeSingle: async () => result };
      return chain;
    },
    auth: { admin: {
      getUserById: async () => ({ data: { user: { id: "target", email: options.email ?? "person@example.com" } }, error: null }),
      generateLink: async (input) => {
        generated.push(input);
        return { data: { properties: { hashed_token: "secret-reset-token" }, user: { id: options.generatedUserId ?? "target" } }, error: options.generateFailure ? {} : null };
      },
    } },
  };
  const { POST } = compile("app/api/admin/wayfinders/[participantId]/password-recovery/route.ts", {
    "next/server": { NextResponse: { json: (value, init) => Response.json(value, init) } },
    "@/lib/admin/auth": {
      getAdmin: async () => actor,
      auditSecurityEvent: async (...args) => { if (options.auditFailure) throw new Error("audit unavailable"); audits.push(args); },
    },
    "@/lib/admin/password-recovery-policy": policy,
    "@/lib/experiences/lmu/server/http": { apiError: (error, status) => Response.json({ error }, { status }), readJsonObject: (request) => request.json(), PayloadError: class extends Error {} },
    "@/lib/platform/password-recovery-url": { passwordRecoveryRedirectUrl: (origin) => `${origin}/account/reset-password/confirm?type=recovery` },
    "@/lib/supabase/admin": { createAdminSupabaseClient: () => db },
  });
  const request = new Request("https://purpose-os.org/api/admin/recovery", {
    method: "POST", headers: { origin: options.origin ?? "https://purpose-os.org", "content-type": "application/json" },
    body: JSON.stringify({ identityVerified: options.verified ?? true, email: "attacker@example.com" }),
  });
  request.nextUrl = new URL(request.url);
  return { run: () => POST(request, { params: Promise.resolve({ participantId }) }), audits, generated };
}

test("regular Admin can generate an audited recovery link for the canonical Wayfinder account", async () => {
  const fixture = setup();
  const response = await fixture.run();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const { resetUrl } = await response.json();
  const link = new URL(resetUrl);
  assert.equal(link.origin, "https://purpose-os.org");
  assert.equal(link.pathname, "/account/reset-password/confirm");
  assert.equal(link.searchParams.get("type"), "recovery");
  assert.equal(link.searchParams.get("token_hash"), "secret-reset-token");
  assert.equal(fixture.generated[0].email, "person@example.com");
  assert.equal(fixture.generated[0].type, "recovery");
  assert.equal(fixture.audits.length, 2);
  assert.doesNotMatch(JSON.stringify(fixture.audits), /secret-reset-token|token_hash|resetUrl/);
});

for (const [name, options, expected] of [
  ["signed-out caller", { actor: null }, 403],
  ["cross-origin caller", { origin: "https://attacker.example" }, 403],
  ["identity not verified", { verified: false }, 400],
  ["Admin targeting Admin", { targetRole: "admin" }, 403],
  ["Admin targeting Super Admin", { targetRole: "super_admin" }, 403],
  ["Super Admin targeting Super Admin", { actor: { id: "actor", role: "super_admin" }, targetRole: "super_admin" }, 403],
  ["self recovery", { targetId: "actor" }, 403],
  ["stale CRM email", { email: "different@example.com" }, 409],
  ["failed authority lookup", { lookupFailure: true }, 500],
  ["failed mandatory audit", { auditFailure: true }, 500],
  ["rapid repeated request", { recent: true }, 429],
]) {
  test(`${name} cannot generate recovery credentials`, async () => {
    const fixture = setup(options);
    const response = await fixture.run();
    assert.equal(response.status, expected);
    assert.equal(fixture.generated.length, 0);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
}

test("Super Admin can assist an Admin", async () => {
  const fixture = setup({ actor: { id: "actor", role: "super_admin" }, targetRole: "admin" });
  assert.equal((await fixture.run()).status, 200);
});

for (const options of [{ generateFailure: true }, { generatedUserId: "different-user" }]) {
  test(`provider failure or identity mismatch never returns a credential: ${JSON.stringify(options)}`, async () => {
    const fixture = setup(options);
    const response = await fixture.run();
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /secret-reset-token|token_hash/);
  });
}
