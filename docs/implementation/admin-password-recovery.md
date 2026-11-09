# Admin password assistance

When a Wayfinder cannot receive the ordinary reset email, an active Admin can
open **Wayfinders → person → Access & Leadership → Password assistance**, confirm
that they verified the person's identity, and generate a temporary reset link.
Copy the link and share it with that person through a verified channel. The
recipient opens it and chooses their own password immediately, without waiting
for the recovery email. Generating the link does not change their password.

This uses Supabase's `generateLink({ type: "recovery" })` and the existing
token-hash confirmation/reset flow. It is a recovery link, not an Admin-chosen
temporary password. Supabase enforces token expiry and single use; expiry uses
the deployed project's Auth configuration. New recovery requests can replace a
previous link. Do not open the recipient's link, store it in CRM notes, or paste
it into an issue or log.

## Permissions and safeguards

- Admin: assist non-administrator accounts, including Hub Leaders.
- Super Admin: also assist Admin accounts.
- Own account and Super Admin targets: continue using self-service recovery.
- Target permissions are checked on the server, including disabled Admin records.
- Require an activated Auth identity and a matching CRM/Auth email; never accept
  a target email from the browser.
- Require a same-origin request and identity verification acknowledgement.
- Require request/completion security audits; never persist the credential in
  audit metadata. If required auditing fails, no credential is returned.
- Return `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- Apply a one-minute, audit-backed per-person cooldown. This is a best-effort
  duplicate-request guard, not an atomic distributed rate limiter.

No schema migration or new environment variable is required. The server already
uses `SUPABASE_SECRET_KEY`; it remains server-only. The link uses the request's
application origin and does not depend on an email delivery provider.

## Verification

`npm run test:password-recovery` exercises the actual route handler with mocked
Auth/database boundaries, including hierarchy restrictions, cross-origin denial,
canonical identity binding, failed lookups/auditing, cooldown, provider failure,
and cache/secret-handling behavior. It does not send email or reset a real account.

Before production release, verify with dedicated staging accounts:

1. Admin generates a link for a synthetic Wayfinder and copies it into a separate
   browser session. The recipient chooses a password and signs in successfully.
2. Reusing the consumed link and using an expired link fail. Test a newer recovery
   request replacing an older one against the deployed Auth version/configuration.
3. Direct API attempts by a member/Hub Leader, an Admin targeting an Admin, and
   either role targeting a Super Admin are denied.
4. The ordinary email-based reset continues to work, with the correct deployed
   redirect allowlist/email template, on the supported browsers/devices.

The cause of Paige's historical delay has not been established. The normal
recovery endpoint intentionally preserves account-existence privacy; failures
now log provider error code/status without email-bearing provider messages, and
the form tells people to seek Admin assistance after a few minutes. Investigate
the incident using its actual time window: Auth recovery/rate-limit errors,
Supabase SMTP or Send Email hook configuration, provider acceptance/delivery,
redirect configuration, and expired or superseded links. Signup notifications
using Resend do not prove that Auth recovery emails use Resend.
