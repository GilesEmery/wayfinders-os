# Changed files and offline verification

October 10, 2026. **Verified from code / local execution record:** before edits, the working tree already contained 22 modified tracked files and seven untracked status entries. Directory entries included the earlier audits and implementation reports. CODEX 1 documented 27 application/test files and five reports; all eight audit reports also predated this assignment. No clean baseline was assumed and no unrelated changes were reverted.

## Exact CODEX 1.1 delta

The following six application sources, one existing test and one new test are the complete application/test delta relative to the pre-edit file hashes. Seven new documents are listed separately. This is not the entire dirty working-tree diff against HEAD.

| File | Rationale and evidence |
| --- | --- |
| `lib/platform/response-sharing-policy.ts` | Explicit trusted participant consent prerequisite at `:15`, `:25`; disclosure at `:39`. No adapter activation. |
| `lib/platform/authorization.ts` | Returned Hub/member/offering/cohort errors reject at `:116`, `:128`, `:136`; missing cohort denies instead of fallback at `:146`. |
| `lib/admin/auth.ts` | Identity/admin-member/profile errors reject at `:17`, `:29`, `:37`. Successful global identity preserved. |
| `app/hubs/[hubSlug]/page.tsx` | Hub and viewer membership/preference prerequisite errors checked at `:16`, `:28`, `:32`; directory policy unchanged. |
| `app/hubs/[hubSlug]/members/[participantId]/page.tsx` | Hub/target membership error checks at `:13`, `:20`; same successful permissions. |
| `lib/experiences/lmu/storage.ts` | Local reset generation, assessment identity and module save revision prevent late completion resurrection at `:90`, `:110`, `:130`, `:137`, `:149`. Custom payload/schema unchanged. |
| `scripts/security/codex1.test.mjs` | Existing positive policy audience supplies synthetic verified consent at `:64`; two mocked route/page executions become static assertions at `:203`, `:211`. Baseline retains 93 cases but those two cases no longer claim runtime route validation. |
| `scripts/security/codex1-1.test.mjs` (new) | 55 focused checks: full 27-role/level consent matrix, helper and global identity error handling, positive scoped/owner paths, local reset/supersession, resource read failure, duplicate submit and static Hub prerequisite ordering. |

**Verified from code:** new documents under `docs/implementation/codex-1-1-privacy-predeployment/`:

- `00-EXECUTIVE-REVIEW.md`
- `01-PRIVACY-AND-ACCESS-DECISIONS.md`
- `02-DURABLE-SHARING-DESIGN.md`
- `03-ADMIN-HUB-CREATOR-BOUNDARIES.md`
- `04-CHANGED-FILES-AND-TESTS.md`
- `05-STAGING-AND-ROLLOUT-GATES.md`
- `06-OPEN-OWNER-DECISIONS.md`

**Verified from code:** a SHA-256 comparison with the pre-edit snapshot confirms only the seven existing files above changed. All prior audit/CODEX 1 reports and other captured app/components/lib/scripts sources are unchanged. No Supabase migration file was edited or created. No custom Start Something source or LMU payload/schema file was changed. Snapshot/logs were written only to `/private/tmp` and are local scratch, not required repository artifacts.

## Exact validation

**Verified by isolated test:** baseline command: **93 passed; 0 failed, skipped, cancelled or todo**.

```sh
node --test scripts/security/codex1.test.mjs lib/platform/effective-access-policy.test.ts lib/platform/response-library-policy.test.ts lib/experiences/admin/inline-editor-safety.test.ts lib/admin/wayfinders/export.test.mjs lib/admin/wayfinders/export-csv.test.ts lib/admin/wayfinders/journey.test.mjs
```

**Verified by isolated test:** combined command: **148 passed; 0 failed, skipped, cancelled or todo**. This consists of 93 baseline cases plus 55 CODEX 1.1 cases. “Checks” includes static source assertions; it is not 148 integration tests.

```sh
node --test scripts/security/codex1-1.test.mjs scripts/security/codex1.test.mjs lib/platform/effective-access-policy.test.ts lib/platform/response-library-policy.test.ts lib/experiences/admin/inline-editor-safety.test.ts lib/admin/wayfinders/export.test.mjs lib/admin/wayfinders/export-csv.test.ts lib/admin/wayfinders/journey.test.mjs
```

**Verified from code / local static validation:** TypeScript exited 0 with no diagnostics; whitespace/diff check exited 0.

```sh
node node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```

**Verified from code:** the offline VM loader admits only explicit imports, Date/Map/Set/Promise/console and no `process`, environment, real fetch, sockets or SDK bootstrap (`scripts/performance/offline-module.mjs:1`). Database clients, authentication, timers, localStorage and fetch used by tests are supplied inert fakes. Existing CSV/Journey fixtures transpile source with explicitly mocked requires; no actual client is created (`lib/admin/wayfinders/export.test.mjs:18`; `lib/admin/wayfinders/journey.test.mjs:1`). Tests import only selected pure TS modules or mock-transpiled libraries/components; application route/page modules are read as text, never executed in this iteration.

## Coverage and remaining limits

| Area | Offline evidence / source | Limit |
| --- | --- | --- |
| Authorization errors and revocation | Baseline effective lookup failures, malformed scopes, denied grants, fresh revocation; new partial-data and rejected Hub/offering reads, Admin identity errors and success (`scripts/security/codex1.test.mjs:36`; `scripts/security/codex1-1.test.mjs:41`, `:135`) | No live role/catalog/RLS inventory; helper rejected promises deny but not every caller's displayed error is tested. |
| Private query ordering | Mock cohort loader asserts no raw/history/embedded body queries; admin detail/CSV deny before bodies (`scripts/security/codex1.test.mjs:100`, `:120`, `:126`) | All alternate endpoints need staging authorization review; adapter cannot positively share today. |
| Three sharing levels | 27 new combinations test both raw and individual result with no consent; explicit consent contract test also keeps group disabled (`scripts/security/codex1-1.test.mjs:24`, `:34`) | No durable consent persistence or RLS implemented. |
| Owner parity | Existing CSV exports owner answers/results/history; new own LMU result and owner-admin Journey positive tests (`lib/admin/wayfinders/export.test.mjs:34`; `scripts/security/codex1-1.test.mjs:109`, `:157`) | Actual Admin page rendering/static gate only; generic native result browser display deferred. |
| Generic CAS / submit | Baseline stale rendered revision, zero-row CAS, duplicate insert, returned error, partial progress failure, form pending/success/failure; new duplicate pending submit invokes persistence once (`scripts/security/codex1.test.mjs:142`, `:153`, `:293`; `scripts/security/codex1-1.test.mjs:169`) | Lost real receipt still ambiguous. Form has no new durable offline text recovery. Real simultaneous transactions and reload of finalized partial-progress state not verified. |
| LMU acknowledgements | Fake debounce/order/cancel/timeout/HTTP failures, section uncertainty block and retained drafts; new removed/cleared/switched/superseded local acknowledgement checks (`scripts/security/codex1.test.mjs:158`, `:278`, `:315`, `:355`; `scripts/security/codex1-1.test.mjs:80`, `:90`) | One browser runtime only; no network cancellation/session binding added. Cross-tab/account-switch server ordering and failed reset recovery unverified. |
| Resource duplication | Baseline actual mock block association copy, course-path/availability rejection, failed link cleanup and reorder rejection; new association read-error checks (`scripts/security/codex1.test.mjs:179`, `:243`; `scripts/security/codex1-1.test.mjs:131`) | Real Storage signing/withdrawal unverified. Response-definition failure cleanup still ignores delete receipts (`lib/experiences/admin/block-mutations.ts:422`). No transaction added. |
| Publish uncertainty | Fake publication RPC error, Companion continuity and activation partial failures (`scripts/security/codex1.test.mjs:262`, `:346`) | No actual RPC, migration or publish; companion follow-up/activation not one atomic unit (`lib/experiences/admin/version-release.ts:47`, `:56`). |
| Editor safety | Existing inline editor CAS/recovery regression suite (`lib/experiences/admin/inline-editor-safety.test.ts:1`) | No editor recovery/storage format change; real browser/cross-tab deferred. |
| Hub pages | Static ordering of new error guards and existing LMU/API safe query/error contract (`scripts/security/codex1-1.test.mjs:125`; `scripts/security/codex1.test.mjs:203`) | Does not execute Next pages/routes; signed-in nonmember directory remains unresolved. |

**Requires live verification:** browser unload/navigation cannot be certified by a fake hook test; warning source exists at `components/experiences/builder/ParticipantResponseForm.tsx:10` and `components/experiences/lmu/LMUPersistenceHydrator.tsx:16`. No load tests, builds, server startup, application route execution, integration tests, migration execution, Storage requests or remote traffic were performed. Local passes are not a deployment-ready finding.
