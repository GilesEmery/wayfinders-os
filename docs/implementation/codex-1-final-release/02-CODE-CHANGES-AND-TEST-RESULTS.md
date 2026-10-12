# Code changes and offline verification

Final iteration changes, relative to CODEX 1.2:

| Files | Correction |
| --- | --- |
| `lib/platform/hub-membership.ts` | Check existing membership before insert/reactivation; check default preference before upsert. Transport rejection aborts; partial membership success is distinguished when preference read fails. |
| `lib/platform/hub-directory.ts` | Applicable explicit `hub.view` deny independently blocks directory, including active member/Super Admin. General effective policy unchanged. |
| `lib/experiences/lmu/persistence.ts`, `storage.ts` | Capture assessment ID from bound local store and send header for draft/finalize/reset. Unbound request returns false. |
| Both LMU section API route files | Compare required header with freshly resolved assessment before any section write. Reject stale account/retake with 409. Preserve raw responses paired with immutable results on retry; completed-section drafts reject before writes. No schema change. |
| `lib/admin/wayfinders/journey.ts` | Exact-count completeness for enrollment/history/LMU/membership collections; checked audit before operational receipt. |
| Both LMU admin pages | List exact-count completeness; checked list/detail audit before rendering. |
| `scripts/security/codex1-final.test.mjs` | Eight new isolated/static regressions for failed membership/preferences, captured save context, audit contract and explicit directory denial. |
| `lib/admin/wayfinders/journey.test.mjs` | Count-aware fake + two new truncation/audit-failure tests. |
| `scripts/security/codex1.test.mjs` | Existing fake persistence cases supply captured assessment ID; prior case count retained. |
| `lib/experiences/lmu/server/completion.test.mjs` | Fixture headers and mocked owner identity; three new missing/account/retake cases exercise PUT/POST/DELETE with zero writes; finalized-response retry/draft case verifies original raw body survives. Update old nonowner-list assertion to expected denial. |

There are 12 existing files changed in this final iteration plus one new test and seven new reports. Across CODEX 1–final the working tree contains 35 modified tracked files and six new application files plus security suites. Prior audit/implementation reports, migrations, package/lock/configuration and unrelated files were not edited. The runbook gives the precise release allowlist; inspect its staged diff before committing.

## Final commands and results

```sh
node --test scripts/security/codex1-final.test.mjs scripts/security/codex1-2.test.mjs scripts/security/codex1-1.test.mjs scripts/security/codex1.test.mjs lib/platform/effective-access-policy.test.ts lib/platform/response-library-policy.test.ts lib/experiences/admin/inline-editor-safety.test.ts lib/admin/wayfinders/export.test.mjs lib/admin/wayfinders/export-csv.test.ts lib/admin/wayfinders/journey.test.mjs
node --test lib/experiences/lmu/server/completion.test.mjs
node --test lib/resources/resource-library-policy.test.ts lib/experiences/admin/publish-validation.test.ts lib/admin/existing-user-role-management.test.ts lib/admin/admin-invitation-security.test.ts lib/platform/participant-navigation.test.ts lib/experiences/builder/cohort-context.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```

| Check | Final result |
| --- | --- |
| Focused combined suite | 194 passed: previous 184 + eight new final checks + two Journey checks |
| LMU completion/return/results suite | 23 passed: 19 existing + three new context checks (each tests all three write methods) + one finalized raw-response regression |
| Broader resource/publish/invitation/role/navigation/cohort units | 47 passed |
| Total | **264 passed, zero failures/cancelled/skipped** |
| TypeScript | Exit 0, noEmit/incremental false |
| Diff whitespace | Exit 0 |
| ESLint changed application files | Exit 0 across 36 files; zero errors, one `userEmail` unused compatibility argument warning in authorization.ts |
| Production build | Subsequent authorized guarded build passed; see update below |
| Browser, actual signing/deployment | Not run; subsequent read-only SQL/RLS/grant metadata inspection passed |

ESLint command: `node node_modules/eslint/bin/eslint.js` followed by every application `.ts`/`.tsx` in the runbook allowlist (exclude test files). Configuration imports installed ESLint/Next presets; it does not execute application modules. No installs, lint fix or production dev/build command ran.

Core tests use text transpilation + VM with explicit mocked imports; unmapped imports throw, no process/environment/real network. LMU broader suite uses Node import hooks with mocked server account, auth, Supabase, password, Next adapters; Request URLs are inert fixture strings. Added explicit platform Auth mock after the first run revealed an EISDIR loader failure from an unmocked newly imported auth dependency: initial run 12 pass/one file failure, corrected fixture then final 23 pass. No live client was invoked. Broader selected units use pure modules/static source inspection; invitation TTL helper can read its one nonsecret environment setting, but tests pass explicit values and no credentials were printed.

Tests already cover permission transport/unknown/truncation, withdrawn/different-Hub roles, body/history/embedded/private CSV denial, stale revisions, duplicate insert, zero-row CAS, LMU reset/discard/late receipts and queue acknowledgement, resource associations/cleanup, partial publish errors. Newly added cases address demonstrated gaps; no claim of transaction atomicity or end-to-end browser correctness.

Historical offline-only build safety review (superseded by the authorized guarded build update below): package build is `next build`, no prebuild/postbuild hooks; `next.config.ts` redirects/server-action size do not make it offline. Root layout uses Google Geist/Cormorant fonts; root account loading and server SDK/Auth paths can execute in Next compilation/prerender. Disabling telemetry alone does not prevent these calls. Safe alternative for owner: an explicitly approved isolated build environment with correct nonproduction configuration and controlled network, or a separately reviewed local-font/mock-prerender approach. No permanent font/config change was made just to claim a pass. Owner command in runbook is not authorized/executed here.

No new secret literal, private answer logging, .env file, build output or credential-bearing artifact was introduced. Existing resource upload error logging is unchanged; test/report fixtures are synthetic. Git status was inventoried first; no staged files were present and no git mutation occurred. Static typecheck does not prove App Router bundling/server-client boundaries; Next build remains a gate.

## Authorized release verification update

October 10, 2026. Owner authorized read-only Supabase compatibility checks, a production build, automated tests and Git preparation. No push/deployment, migrations, Supabase mutations, private participant reads or synthetic production writes were performed.

**Verified project:** local `.env.local` hostname and `supabase/.temp/project-ref` both match `xxjiiqrhnniccnxujmnv`; connected project metadata identifies `wayfinders-os`, ACTIVE_HEALTHY, us-east-1, Postgres 17.6. No credentials were displayed.

**Supabase metadata passed:** 20/20 required tables exist with RLS enabled; anon/authenticated have no SELECT or INSERT/UPDATE/DELETE privileges; service role SELECT exists. Protected-policy subset and all Storage object policies are empty, consistent with server-mediated access. Fifteen checked unique/check constraints and 29 indexes include generic enrollment/definition uniqueness, canonical participant/course uniqueness, LMU assessment/section uniqueness and permission/role scope/effect/status contracts. All 25 targeted columns match required types. Four required RPCs match signatures, deny anon/authenticated EXECUTE and allow service role. `purposeos-assets` is private, 26,214,400-byte limit, expected 14 MIME types. These were four bounded SQL metadata queries in `BEGIN TRANSACTION READ ONLY ... ROLLBACK`; no function was invoked. No result hit its 50-row cap.

**Data API exact counts passed:** two service-role HEAD-only requests to nonsensitive role/permission catalogs returned HTTP 200 and numeric exact counts (41 role-permission mappings; 31 role-entitlement mappings); zero response bodies. No participant/override rows were accessed. The authenticator-role catalog exposed no explicit row-limit setting; configured Data API maximum remains unverified. Real scoped directory/contact/override behavior, Auth URL/session configuration, browser payloads and withdrawal signing remain unverified.

**Production build passed with a temporary network guard:** `NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--require=/private/tmp/codex1-build-network-guard.cjs' npm run build`, exit 0. Installed Node v26.0.0/Next 16.3.6; compilation, Next TypeScript and 95/95 page-generation tasks completed; build ID `UL-N9OHvDw9Zm5DIp6I47`. Guard permitted Google font hosts and loopback only, blocked six requests to the identified Supabase host; no participant data was fetched. Guard is outside repository, not a committed config change. This proves guarded build compilation/generation, not deployed runtime/Supabase integration. Use a fresh approved release build after final gates; do not deploy this artifact as certified production-runtime evidence.

**Automated verification passed:** 264/264 combined checks, zero failed/skipped/cancelled; standalone TypeScript exit 0; ESLint exit 0 across 37 allowlisted application files, zero errors/one existing unused `userEmail` warning; `git diff --check` passed. The combined test command is the report 02 core command plus the LMU suite and six broader suites in one `node --test` invocation. Tests are static/unit/mock, not live writes.

**Git:** branch `main`, `origin` = `https://github.com/GilesEmery/wayfinders-os.git`; exact 72-path allowlist verified, all 35 modified tracked paths covered, excluded original audit reports/ZIP/secrets/migrations/build output. New code/tests are included; staged index remains empty. No fetch, staging, commit, push or deployment performed; remote divergence/automatic deployment hook remain unverified.

**Remaining gate / stop for owner decision:** the identified Supabase project has no development branches. Connected project discovery identified no PurposeOS staging project; the separately listed `peaceworks-portal` is unrelated and was not queried. No safe staging target/operator/prepared fixture identities were supplied. Current authorization permits read-only Supabase activity and prohibits creating/modifying users, grants or objects, so required save/reset/publication/signing/revocation integration tests cannot be safely completed here. Recommendation remains **CONDITIONAL GO, not production approved**. Do not create the Git commit under the current “after all required checks pass” condition.

**Exact next owner action:** identify an existing isolated PurposeOS staging project/deployment and explicitly authorize a bounded validation plan with prepared synthetic identities and the precise permitted fixture writes; otherwise explicitly decide to defer release or request a separately documented residual-risk exception. No production write testing or blanket grant change is proposed. Final production push still requires your separate approval after the resulting gates pass. CODEX 2/3 were not begun.

## October 12 completion execution and owner staging decision

The owner explicitly chose to skip staging setup on October 12 and continue release preparation. This is acceptance of the disclosed untested integration risks, not evidence that staging passed. No staging resources, costs, migrations, fixture writes, credentials changes, production data reads or writes were performed. Production push/deployment still requires separate final approval.

- CODEX 1 code/test files are unchanged since the 264-check passing run; the 72-path selective list covers all pending tracked release edits. Prior suites were not unnecessarily repeated. Read-only production Supabase contract evidence from October 10 is retained; no evidence of a contract change prompted repetition.
- Local and remote `main` match `363a542c0df69f64f98c15286112cbe82b877387`. Vercel's latest READY production deployment is `dpl_Ds3DAazwS1PEXMDnemMcbhJAHixe`, built from that same `main` SHA. GitHub integration links `GilesEmery/wayfinders-os`.
- Production target: Vercel project `wayfinders-os` / `prj_569lm7OPIHhr7pAoMmxEWb2xDrcp`, team `gilesemerys-projects` / `team_cgPcgpCMTyiMoDSjgSjNxipT`; public alias `https://wayfinders-os.vercel.app`. Treat a `main` push as a production deployment. Both existing Preview and Production Supabase URL settings point to `xxjiiqrhnniccnxujmnv.supabase.co`; Preview is not an isolated test database. No environment setting was changed.
- Vercel runtime is Node `24.x`. A checksum-verified official Node `v24.21.0` was downloaded into temporary storage, without modifying dependencies or system runtime. A new guarded Next production build on that runtime passed, exit 0: compilation, Next TypeScript, 95/95 page generation. Build ID `zIOrb9D12yZOMHDhwmBHA`. The temporary guard blocked 8 Supabase requests and allowed only font hosts/loopback. This verifies build compatibility, not production data/runtime integration. Deployment must build the reviewed source through Vercel; do not upload this guarded local build as a certified live artifact.
- Still NOT TESTED: live authenticated owner/nonowner payloads, real save/reload/CAS/reset/cross-tab behavior, permission revocation, resource signing, and synthetic publish/reorder recovery. Auth URL/session settings and configured Data API maximum remain unverified. No code/grant workaround is introduced to claim a pass. Sharing, scoped creator/reporting, privileged private exceptions, schema changes, CODEX 2/3 stay deferred.

Recommendation: **CONDITIONAL GO with owner-accepted staging waiver**. No known reproducible critical leak remains in the reviewed local patch, but unperformed integration checks cannot be certified. Before commit/push, show the release gate table and exact file list, obtain explicit final approval, and verify that the approved file contents and remote HEAD are unchanged. Commit title: `Complete CODEX 1 security and data integrity safeguards`. Scope: the runbook's 72 paths only; exclude original audits, ZIPs, secrets, migrations and build artifacts.

After separately approved push, monitor the matching Vercel deployment for READY and inspect sanitized build failure evidence if needed. Proposed production smoke scope: at most 10 anonymous read-only HTTP requests to public landing/admin-login/anonymous-denied API surfaces, at most 2 MiB transfer and five minutes; no accounts, answers, synthetic records, uploads or writes. Authenticated save/owner/Storage smoke remains NOT TESTED under the staging waiver. Ask separately before any broader test.

Recovery preserves privacy: do not automatically roll back to the pre-CODEX deployment, which restores audited weaknesses. On a new privacy/identity failure, stop testing; request incident approval to pause production access, then prepare a focused forward correction retaining owner-only gates. On build failure before promotion, leave the existing live deployment untouched and ask before correction/redeployment. No SQL rollback/delete/pointer reset is authorized.

### External Actions Required

**None before final approval:** Codex can perform the selective commit, push and deployment monitoring with existing connections. The required involvement now is your explicit commit/production-push approval in this conversation; do not paste credentials.

**Emergency fallback only if Codex's Vercel connection becomes unavailable:** after explicit incident approval, an authenticated operator or ChatGPT HAL can pause the production project. In a terminal with the Vercel CLI already installed and logged into the correct team, first confirm the command with `vercel project pause --help`, then execute:

```sh
vercel --scope gilesemerys-projects project pause wayfinders-os
```

This blocks the active production deployment and disables automatic production-domain assignment; it does not alter Supabase data or restore older vulnerable code. Verify `https://wayfinders-os.vercel.app` no longer serves the application, with one anonymous request. Do not execute this as part of normal release preparation. Resuming/promoting requires a reviewed safe artifact and separate approval. If login is required, use the provider's browser login flow; never share a token in chat.
