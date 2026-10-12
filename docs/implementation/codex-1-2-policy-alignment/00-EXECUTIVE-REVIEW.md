# CODEX 1.2 executive review

October 10, 2026. **Inference — recommendation:** the implemented private-only patch is ready for a separately authorized, bounded synthetic staging verification exercise. It is not production-ready or a complete implementation of scoped creator/reporting/sharing features. Those features remain denied/deferred, not silently activated.

**Verified from local code:** reviewed the eight audit reports, five CODEX 1 reports and seven CODEX 1.1 reports against current source. The initial working tree had 23 modified tracked files and seven untracked status entries (including directories). A pre-edit SHA-256 inventory preserves provenance of this iteration: 14 existing files changed, three application/test files were added, and eight new reports were created. Prior reports, migration files, and unrelated captured source remain unchanged. See [03](03-CHANGED-FILES-AND-TESTS.md). The eight owner decisions are the approved direction; earlier reports' pending decisions/proposals are historical, not current policy.

## Completed local corrections

| Classification | Correction / evidence |
| --- | --- |
| Verified from local code; verified by isolated test | Hub names require exact active membership or explicit exact-Hub leadership, with fresh matching identity and effective access. Nonmembers, pending/invited/withdrawn, cross-Hub and global-role-only actors do not trigger roster/name reads. Existing inactive membership conservatively denies even a still-assigned leader. `lib/platform/hub-directory.ts:8`; `app/hubs/[hubSlug]/page.tsx:40`. |
| Verified from local code; verified by isolated test | Hub contact access requires an explicit existing `wayfinder.view` allow override for the exact Hub, separate from inherited role permissions; applicable explicit deny remains restrictive. Ordinary member/leader/global role alone is insufficient. `lib/platform/hub-directory.ts:34`; `app/hubs/[hubSlug]/members/[participantId]/page.tsx:20`. |
| Verified from local code; verified by isolated test | A separate operational CSV projects identifiers, course/assessment label, status and dates only; private export remains owner-only. Default URL remains private; `?view=operational` selects the new path. Mandatory checked audit precedes export receipt. `lib/admin/wayfinders/operational-export.ts:12`; `app/api/admin/wayfinders/[participantId]/export/route.ts:10`; `lib/admin/wayfinders/export.ts:26`. |
| Verified from local code; static assertions | LMU operational list/detail no longer query participant names/email. Search uses participant/assessment IDs, counts remain operational, headings distinguish progress from owner-only results. Admin result page delegates to ownership before any target-name query. `app/admin/life-mapping-u/page.tsx:12`; `app/admin/life-mapping-u/[assessmentId]/page.tsx:15`; `app/admin/users/[userId]/results/[kind]/[resultId]/page.tsx:13`. |
| Verified from local code; verified by isolated test | Assignment role/scope validation now covers direct context readers; assignments, permission catalogs/overrides and directory roster require complete exact-count reads. Unknown/truncated results reject before a grant, including Super Admin snapshots. `lib/platform/authorization.ts:32`; `lib/platform/effective-access.ts:28`; `lib/platform/hub-directory.ts:20`. |
| Verified from local code; verified by isolated test | Response-definition copy failure checks both cleanup receipts and reports unconfirmed cleanup explicitly. No new transaction or Storage operation. `lib/experiences/admin/block-mutations.ts:422`. |
| Verified from local code | Journey/private-export copy distinguishes respondent-only bodies from operational metadata. Analytics remains an unimplemented operational-only placeholder, not a new aggregate engine. `components/admin/WayfinderJourney.tsx:43`, `:65`; `app/admin/users/[userId]/page.tsx:41`; `app/admin/analytics/page.tsx:2`. |

**Verified by isolated test:** 184 checks passed: 148 retained CODEX 1/1.1 cases plus 36 new CODEX 1.2 cases. No failures/skips/cancellations. TypeScript and diff checks passed. Static page/route assertions are included in that count; application routes/pages were not executed. The baseline fake-query adapter now returns synthetic exact counts for explicitly counted reads; baseline case count and assertions remain. Initial TypeScript checking caught the Journey loader's union result; an explicit metadata-shape guard corrected it before final validation.

## Intentionally denied or deferred

**Verified from local code:** private responses, individual interpreted results and private CSV remain owner-only. Facilitator/group bodies remain disabled because the adapter supplies no durable response scope/consent (`lib/platform/response-library.ts:246`, `:305`; `lib/platform/response-sharing-policy.ts:21`; `lib/assessment-results.ts:16`). General Super Admin precedence remains, only after complete prerequisites, and is independent of these private checks (`lib/platform/effective-access-policy.ts:32`, `:41`; `lib/platform/effective-access.ts:34`).

**Verified from local code; inference:** course-specific role assignments exist, but `created_by` is creation provenance and `owner_organization_id` is organizational ownership; neither is a verified current actor-ownership contract. Creator effective permissions and legacy builder/admin roles differ; global admin UI/audit/entry assumptions cannot safely be removed piecemeal. Scoped creator entry remains denied pending a coherent contract (`lib/supabase/database.types.ts:75`; `lib/platform/authorization.ts:64`; `lib/experiences/admin/block-mutations.ts:87`; `lib/experiences/admin/preview.ts:15`). No ownership was inferred from legacy fields or a client request.

**Verified from local code; inference:** canonical participant/course enrollment can serve concurrent cohorts; legacy pointers are not authoritative cohort progress attribution. No new facilitator/Hub progress endpoint was created using those pointers (`supabase/migrations/20260918112528_canonical_enrollment_multiple_cohort_contexts.sql:22`, `:29`). Closed-Hub landing/description/offerings behavior was preserved. These limits are technical/discoverability gaps, not requests to reapprove D1–D8.

**Requires live verification:** real counts/grants/RLS, directory/contact override behavior, operational export/owner parity, browser CAS/unload, LMU session/cross-tab ordering, Storage signing and partial-operation recovery. Staging must be authorized with a named synthetic project/actor and caps in [05](05-STAGING-VALIDATION-PROPOSAL.md). Production sign-off remains blocked until that evidence and accepted deferred-feature scope exist.

## Report index

1. [Approved access matrix](01-APPROVED-ACCESS-MATRIX.md)
2. [Routes and data access](02-ROUTE-AND-DATA-ACCESS-REVIEW.md)
3. [Files and offline tests](03-CHANGED-FILES-AND-TESTS.md)
4. [Regression and rollback risks](04-REGRESSION-AND-ROLLBACK-RISKS.md)
5. [Synthetic staging proposal](05-STAGING-VALIDATION-PROPOSAL.md)
6. [Open technical decisions](06-OPEN-TECHNICAL-DECISIONS.md)
7. [Readiness checklist](07-RELEASE-READINESS-CHECKLIST.md)
