# Changed files and isolated verification

The pre-existing untracked `docs/audits/` directory is unchanged. No configuration, package, lockfile, secret or migration file was modified.

## Exact code/test files

| Path | Change |
| --- | --- |
| `lib/platform/authorization.ts` | Controlled unavailable error for admin/assignment reads and transport rejection; avoid unnecessary session lookup when actor ID is supplied |
| `lib/platform/effective-access.ts` | Check every prerequisite read; validate context identity, effect and scope; no empty-on-error grant |
| `lib/platform/effective-access-policy.ts` | Represent existing organization scope explicitly; existing grant/deny policy retained |
| `app/hubs/[hubSlug]/page.tsx` | Both authorization prerequisites fail closed with unavailable feedback; directory audience unchanged |
| `app/hubs/[hubSlug]/members/[participantId]/page.tsx` | Effective-access failure stops private profile reads and gives non-sensitive feedback |
| `lib/platform/response-sharing-policy.ts` (new) | One content decision for respondent/verified sharing scope; independent raw/result access; group remains disabled; accurate disclosure |
| `lib/platform/response-library.ts` | Filter definitions before answer read; exclude nonowner snapshots/embedded data; no legacy-pointer sharing inference; respondent-only admin detail |
| `lib/platform/response-library-policy.ts` | Remove global-admin shortcut from review-entry helper; body policy separate |
| `lib/platform/response-library-policy.test.ts` | Update review-entry regression to deny global role alone |
| `lib/assessment-results.ts` | Fresh respondent ownership inside both exported result loaders, including admin URL consumer |
| `lib/admin/wayfinders/export.ts` | Respondent ownership before private CSV queries |
| `lib/admin/wayfinders/export.test.mjs` | Mock ownership lookup and verify eligible export still preserves content/audit behavior |
| `app/admin/life-mapping-u/[assessmentId]/page.tsx` | Separate operational progress from respondent-only results; check read errors |
| `lib/experiences/builder/response-mutations.ts` | Rendered revision validation and database CAS; confirm returned row; conflict/partial-progress errors; no silent finalized overwrite |
| `lib/experiences/builder/response-actions.ts` | Safe serializable save receipt; success only after mutation and required progress |
| `components/experiences/builder/ParticipantResponseForm.tsx` (new) | Pending/acknowledged/error states, duplicate guard, preserve mounted input, unload warning |
| `components/experiences/builder/ParticipantResponseBlock.tsx` | Hidden revision, shared form feedback, corrected privacy disclosure and draft validation behavior |
| `lib/experiences/builder/progress-actions.ts` | Reject unconfirmed visit/manual completion instead of completing silently |
| `components/experiences/builder/ParticipantProgressControls.tsx` | Visit failure/retry, cleanup guard, manual completion pending/failure feedback |
| `lib/experiences/lmu/acknowledged-save-queue.ts` (new) | Injected-timer debouncing/acknowledgement; settle superseded callers, serialize section writes |
| `lib/experiences/lmu/persistence.ts` | Real HTTP/body acknowledgement, timeout and save-status subscription; ordered save/reset scheduling |
| `lib/experiences/lmu/storage.ts` | Retain failed local drafts; completion after receipt; prevent old failure from reverting newer/module work |
| `components/experiences/lmu/LMUPersistenceHydrator.tsx` | Save/restore feedback, subscription and unload warning; existing hydration retained |
| `lib/experiences/admin/resource-copy.ts` (new) | Inspect source links/resources and course/library path authority without Storage operations |
| `lib/experiences/admin/block-mutations.ts` | Copy validated source links, safe new-copy cleanup; reject another course's private uploaded asset attachment |
| `lib/experiences/admin/version-release.ts` | Stop on continuity lookup error; truthful unknown/already-published outcomes |
| `scripts/security/codex1.test.mjs` (new) | New VM/fake database, fake timers/fetch/local-store and UI receipt tests |

## Exact documentation files (all new)

- `docs/implementation/codex-1-security-data-integrity/00-IMPLEMENTATION-SUMMARY.md`
- `docs/implementation/codex-1-security-data-integrity/01-PRIVACY-AND-ACCESS-MATRIX.md`
- `docs/implementation/codex-1-security-data-integrity/02-CHANGED-FILES-AND-TESTS.md`
- `docs/implementation/codex-1-security-data-integrity/03-MIGRATION-AND-ROLLOUT-PLAN.md`
- `docs/implementation/codex-1-security-data-integrity/04-OPEN-DECISIONS.md`

27 code/test files and five documentation files. The existing inline editor and custom native assessment mutation files were not changed.

## Isolation proof

New server-module tests use the already-present `scripts/performance/offline-module.mjs`: TypeScript is transpiled as text into a VM, and every unprovided import throws. Supabase client creation, identity, database builders, authorization dependencies, Next/React adapters, timers, fetch and local storage are supplied as fakes. The VM has no `process`, environment access, real fetch or socket APIs. The fake fetch records local relative request arguments and never sends them. Direct API URL parsing uses `fixture.invalid` text only, with an explicitly injected URL parser.

Existing selected tests import pure policy/format/recovery modules or transpile server code with explicit fake dependency maps. Those source imports were inspected before execution: no production client/bootstrap or network calls. Tests read known source files for structural assertions only. Native Node module-type warnings are harmless; package configuration was not changed to suppress them.

The TypeScript CLI checks source text without executing application modules, Next build hooks, fonts or SDK initialization. No dependency install or Next build/dev server was run.

## Commands and results

Final combined test command:

```sh
node --test scripts/security/codex1.test.mjs lib/platform/effective-access-policy.test.ts lib/platform/response-library-policy.test.ts lib/experiences/admin/inline-editor-safety.test.ts lib/admin/wayfinders/export.test.mjs lib/admin/wayfinders/export-csv.test.ts lib/admin/wayfinders/journey.test.mjs
```

**93 passed; zero failed/skipped** (36 new cases, 57 focused regressions). Earlier new-suite runs and a focused regression run were also executed during implementation. Initial harness failures involved missing URL injection and fake query-builder/insert behavior; the fixtures were corrected, and the final combined suite passed. These are unit/mock checks, not real HTTP/database/browser integration tests.

```sh
node node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```

Both passed. TypeScript was rerun after relevant source changes; it did not execute application code.

## Covered behaviors

- Each failed identity/admin-role/assignment/catalog/grant/deny lookup blocks access even for a would-be Super Admin; controlled transport error. Valid empty reads, Member/Admin grants, explicit deny, wrong/invalid scopes and fresh revocation.
- Legacy private response exclusion before body fetch; no archived/embedded private transfer; anonymous/revoked/withdrawn/cross-cohort denial; legacy enrollment pointer cannot authorize sharing. Independently evaluated raw/results policy with explicit verified scope; group/leader/custom/admin audiences deny.
- Admin Journey, CSV, shared assessment loader and LMU admin page prevent unrelated content reads; operational progress remains. Direct cohort API denial is non-sensitive and no-store.
- Stale rendered revision, zero-row CAS, database/network failure and duplicate insert reject; confirmed response with failed progress has distinct error.
- Fake-clock draft acknowledgement waits for actual request; superseded callers settle; same-section final follows old in-flight draft. Timeout/failure/cancel do not report saved. Ambiguous LMU transport failures block later writes/reset in that session until reload verification; unmapped sections return false. Actual persistence module uses fake fetch; HTTP failure returns false. Form state remains pending until receipt and reports failure on network rejection.
- Local LMU completion waits for receipt; failed drafts survive and old failed work cannot undo newer/module work.
- Source resource inspection covers image/PDF/video/document identifiers. Actual PDF block duplication preserves independent resource association with no Storage access; cross-course/missing/archived resource and reorder/link-copy failures reject.
- Partial publish continuity/activation failure identifies published state; unknown transport outcome requests verification rather than claiming unchanged state.
- Existing editor recovery/revision, native response rendering, effective-access policy, Journey summary and eligible owner-admin CSV regressions.

## Not executed / required before rollout

No real browser/DOM test, full Next build, real SQL/RLS/Storage or server-action integration, deployed policy inspection, live historical metadata inventory, load/performance measurement, real timeout/network race, or production smoke test. No existing operational verification/import scripts were run. Real group sharing is not enabled or tested as a working persisted feature.

Pending integration scenarios include two-tab LMU races, unload/device recovery, all ten module navigation paths, actual generic-form revalidation/revision refresh, manual progress partial writes, signed-resource access after withdrawal, real media-copy publication validation, and idempotent publication recovery. See [03](03-MIGRATION-AND-ROLLOUT-PLAN.md).
