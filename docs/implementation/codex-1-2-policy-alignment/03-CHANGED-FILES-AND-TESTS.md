# Changed files and offline tests

**Verified from local code / execution record:** initial Git status: 23 modified tracked files and seven untracked entries, including directories. Existing CODEX 1/1.1 application changes and all 20 earlier reports were preserved. A pre-edit SHA-256 manifest across app/components/lib/scripts/docs/migrations distinguishes this iteration from the dirty HEAD diff. No reset, checkout, discard or commit occurred.

## Exact delta

**Verified from local code:** 14 existing files modified, three application/test files added. Earlier baseline reports and all captured migration files are unchanged.

| Path | CODEX 1.2 change / evidence |
| --- | --- |
| `lib/platform/hub-directory.ts` (new) | Gate roster before names; minimal projection; count/name completeness; independent explicit contact permission. `:8`, `:20`, `:34`. |
| `app/hubs/[hubSlug]/page.tsx` | Calls guarded directory, hides denied directory; contact links use separate gate. `:39`, `:40`, `:49`. |
| `app/hubs/[hubSlug]/members/[participantId]/page.tsx` | Requires explicit exact-Hub contact authority before PII. `:20`. |
| `lib/platform/authorization.ts` | Count completeness and runtime role/scope validation for direct consumers. `:34`, `:37`, `:40`. |
| `lib/platform/effective-access.ts` | Exact counts on catalogs/overrides; incomplete/unknown collections reject. `:28`, `:36`. |
| `lib/admin/wayfinders/operational-export.ts` (new) | Separate audited closed operational CSV projection; structured forbidden error. `:6`, `:12`, `:17`. |
| `app/api/admin/wayfinders/[participantId]/export/route.ts` | Explicit operational query dispatch; default private; invalid view rejection; typed 403 and safe unavailable errors. `:10`, `:12`, `:15`. |
| `lib/admin/wayfinders/export.ts` | Accurate approved-policy private denial message; ownership untouched. `:26`. |
| `components/admin/WayfinderJourney.tsx` | Operational copy, respondent-only disclosure, operational download link. `:43`, `:65`. |
| `app/admin/users/[userId]/page.tsx` | Existing private CSV/Journey copy accurately describes restrictions and metadata alternative. `:41`, `:42`. |
| `app/admin/users/[userId]/results/[kind]/[resultId]/page.tsx` | Removes unnecessary target-name query before owner result guard. `:13`. |
| `app/admin/life-mapping-u/page.tsx` | Removes names/email query/search; ID search and truthful progress labels; checks data errors; total assessments label; removes the aggregate completion-rate metric to keep totals-only scope. `:12`, `:16`, `:31`. |
| `app/admin/life-mapping-u/[assessmentId]/page.tsx` | Removes contact/name join and rendering; preserves separate owner-only result query; approved-policy copy. `:15`, `:23`, `:42`. |
| `app/admin/analytics/page.tsx` | Placeholder scope narrowed to approved operational totals; no implemented aggregate feature. `:2`. |
| `lib/experiences/admin/block-mutations.ts` | Checks cleanup receipts after response-definition read/insert failure. `:422`. |
| `scripts/security/codex1.test.mjs` | Fixture supplies synthetic exact counts only for queries explicitly requesting them. Baseline cases/assertions unchanged. `:19`. |
| `scripts/security/codex1-2.test.mjs` (new) | 36 focused tests, inert database/auth mocks and static route/page assertions. `:1`. |

**Verified from local code:** eight new reports under `docs/implementation/codex-1-2-policy-alignment/`: `00-EXECUTIVE-REVIEW.md`, `01-APPROVED-ACCESS-MATRIX.md`, `02-ROUTE-AND-DATA-ACCESS-REVIEW.md`, `03-CHANGED-FILES-AND-TESTS.md`, `04-REGRESSION-AND-ROLLBACK-RISKS.md`, `05-STAGING-VALIDATION-PROPOSAL.md`, `06-OPEN-TECHNICAL-DECISIONS.md`, `07-RELEASE-READINESS-CHECKLIST.md`. Total iteration delta: 17 code/test files plus eight reports.

## Exact verification commands and results

**Verified by isolated test:** final combined run: **184 passed; zero failed, skipped, cancelled or todo**. Retained baseline 148 cases (93 CODEX 1 + 55 CODEX 1.1); new CODEX 1.2 cases 36. This count includes static source assertions, not 184 runtime integration tests.

```sh
node --test scripts/security/codex1-2.test.mjs scripts/security/codex1-1.test.mjs scripts/security/codex1.test.mjs lib/platform/effective-access-policy.test.ts lib/platform/response-library-policy.test.ts lib/experiences/admin/inline-editor-safety.test.ts lib/admin/wayfinders/export.test.mjs lib/admin/wayfinders/export-csv.test.ts lib/admin/wayfinders/journey.test.mjs
```

**Verified from local code / static execution:** final TypeScript check exited 0 without diagnostics; `git diff --check` exited 0. The initial TypeScript failure was the operational loader's union return type; an explicit `records` guard corrected it, and the final check passed.

```sh
node node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```

**Verified by isolated test:** new coverage includes 16 directory cases for membership, leaders, cross-Hub, errors/revocation/identity and pre-query denial; two independent contact/Super Admin cases; three malformed assignment cases; three operational export cases; one static routing/page case; four response-definition cleanup cases; seven counted-result completeness cases. Sources: `scripts/security/codex1-2.test.mjs:31`, `:66`, `:73`, `:84`, `:95`, `:126`, `:129`.

**Verified by isolated test:** retained coverage continues to check failed permission reads, ordinary denies, successful empty reads and Super Admin precedence; body-query exclusion; owner export/results/Journey; generic stale revision/zero-row CAS/duplicate insert/partial progress/receipt/duplicate submit; LMU timer ordering, timeout uncertainty and discarded local acknowledgements; foreign/missing/archived resource rejection and link copying; partial publication and reorder failure; editor recovery. `scripts/security/codex1.test.mjs:35`, `:100`, `:142`, `:158`, `:179`, `:245`, `:262`, `:327`; `scripts/security/codex1-1.test.mjs:80`, `:109`, `:169`; existing selected pure suites above.

## Isolation and limits

**Verified from local code / execution record:** reviewed selected imports and fixture loaders before execution. VM imports are denied unless mocked; no process/environment, real fetch/client/socket or application bootstrap is exposed (`scripts/performance/offline-module.mjs:1`). New database handlers are in-memory; auth/getAdmin and audit are inert stubs; CSV cells are pure. Older selected CSV/Journey transpilation fixtures explicitly mock every require (`lib/admin/wayfinders/export.test.mjs:18`; `lib/admin/wayfinders/journey.test.mjs:17`). Existing LMU tests inject fake timers/fetch. Source regex/static migration tests read text only.

**Verified from local code / execution record:** no network command, Supabase/Vercel tool, SQL/CLI migration, dependency install, secrets/`.env` read, Next dev/build, browser integration, route/page execution or deployment occurred. No participant records, published content, canonical IDs, custom schemas, LMU payloads, Start Something workflows, packages or lockfiles changed. React review was limited to server authorization before data queries, minimal serialized fields, truthful headings, link semantics and unchanged hooks; no CODEX 2 optimization was undertaken.

**Requires live verification:** actual RLS/grants/exact-count responses, directory/contact payloads, browser download, real receipt/CAS races, cross-tab/account-switch saves, unload/navigation, signing withdrawal and database atomicity. Mock count receipts do not prove deployed PostgREST configuration. Passing local checks does not establish production readiness.
