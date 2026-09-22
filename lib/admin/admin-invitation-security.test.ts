import assert from "node:assert/strict";
import test from "node:test";
import { disabledAdminRecoveryResponse, goneAdminSetupResponse } from "./deprecated-endpoints.ts";
import {
  adminInvitationExpiresAt,
  adminInvitationRedirectUrl,
  adminInvitationTtlMinutes,
} from "./invitation-security.ts";
import { passwordRecoveryRedirectUrl } from "../platform/password-recovery-url.ts";

test("password-based admin setup can never claim an invited or unknown email", async () => {
  const response = goneAdminSetupResponse();
  assert.equal(response.status, 410);
  assert.match((await response.json()).error, /secure invitation email/i);
});

test("custom admin recovery fails closed in production", async () => {
  assert.equal(disabledAdminRecoveryResponse().status, 404);
});

test("custom admin recovery fails closed in Vercel preview and staging", async () => {
  assert.equal(disabledAdminRecoveryResponse().status, 404);
});

test("admin invitations use the dedicated Supabase callback and password setup", () => {
  const redirect = new URL(adminInvitationRedirectUrl("https://purpose-os.org/api/admin/admins"));
  assert.equal(redirect.origin, "https://purpose-os.org");
  assert.equal(redirect.pathname, "/api/admin/auth/confirm");
  assert.equal(redirect.searchParams.get("type"), "invite");
  assert.equal(redirect.searchParams.get("next"), "/admin/reset-password");
});

test("invitation expiry is bounded and deterministic", () => {
  assert.equal(adminInvitationTtlMinutes("not-a-number"), 60);
  assert.equal(adminInvitationTtlMinutes("1"), 60);
  assert.equal(adminInvitationTtlMinutes("90"), 90);
  assert.equal(adminInvitationExpiresAt(new Date("2026-09-22T18:00:00.000Z"), 60).toISOString(), "2026-09-22T19:00:00.000Z");
});

test("standard Supabase password recovery still targets the PKCE confirmation route", () => {
  assert.equal(
    passwordRecoveryRedirectUrl("https://purpose-os.org"),
    "https://purpose-os.org/account/reset-password/confirm?type=recovery",
  );
});
