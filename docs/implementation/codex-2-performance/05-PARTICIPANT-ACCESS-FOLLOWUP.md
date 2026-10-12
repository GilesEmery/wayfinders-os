# Participant access and performance follow-up — 2026-10-12

Status: local implementation and verification complete; owner explicitly approved pushing the latest fixes on 2026-10-12. Deployment verification is pending. Baseline: `78e3857` (deployed CODEX 2). No live participant records were accessed or exported during this work. No database, RLS, grants, Storage objects, migrations or hosting configuration changed.

## Owner policy corrections

The owner explicitly restored all responses/results for facilitators within their own cohorts, and then explicitly authorized both active Admins and Super Admins to review individuals’ responses/results. Personal notes remain excluded. These decisions supersede the CODEX 1 owner-only restrictions for these specific review paths; earlier reports describe the former policy.

- Cohort review checks fresh identity, exact facilitator assignment or active facilitator membership, active respondent membership, permitted cohort status, the cohort’s Experience, the respondent’s active/completed enrollment, and one matching active offering/version. A legacy enrollment cohort pointer does not determine access. Global administrator status alone does not impersonate a cohort facilitator.
- Native responses/results are available regardless of the old generic sharing definition. Generic group/consent sharing elsewhere remains restrictive.
- Attached assessment review verifies `embedded_assessment_attempts` against the exact participant, parent enrollment, parent content block and assessment Experience. Generic child enrollment and LMU provider attempt ownership remain checked. Missing attachments never fall back to standalone results.
- Wayfinder Journey results and response CSV exports use fresh `getAdmin()` authority for both Admin roles. Result/attempt/enrollment/version IDs remain bound to the requested participant. Non-admin and signed-out callers still deny before private bodies are read.
- The separate completed-results Admin page explicitly requests freshly checked Admin review, retains completion/password gates, and now awaits a checked security audit before rendering. Participant results pages retain owner-only access.
- Admin CSV exports never query `participant_personal_notes`. Archived exports select only the existing response and companion-entry projections, not personal-note content. Course response loaders do not query personal notes. Normal personal note creation/edit/delete remains owner-scoped and unchanged.
- Participant response privacy text now discloses administrator and own-cohort facilitator review instead of incorrectly promising owner-only privacy.

## UI and focused loading

- Remove the live course Admin/Leader access bar; retain actual bypass capabilities and the genuine admin preview banner. End-of-course label becomes “Final Page.”
- Combine retained inline definitions and linked assessment entries only within the same course block. One panel preserves existing saved responses/results, drops empty/copied placeholders, and retains different saved answers with source labels. No database rows are removed and similarly named independent blocks remain separate.
- Restore assessment card headings by correcting the CSS selector that hid existing `h2` titles. No new title query is needed.
- Purpose Profile loads a lightweight owned enrollment/assessment index, then an Experience outline when opened, then answer bodies only for the selected week. Weeks default closed. Selected-week curriculum hydration scopes layout/block reads to that module, including legacy pages.
- Week requests and Experience requests ignore descendant toggle events, abort on close/unmount and discard aborted results. Reopening fetches fresh data with `cache: no-store`; timeout/errors provide retry controls rather than claiming no saved work.
- The client display guard uses the browser Auth subject, independently of an optional account DTO field. It isolates account switching; every API request separately verifies ownership/authority on the server.
- Purpose Profile no longer hydrates the Dashboard/network overview. My Journey omits unused broad Hub rosters/network statistics. Account avoids a duplicate name/profile read while retaining fresh Admin authority.
- Dashboard / My Trainings / My Cohorts / Hubs menu destinations share the existing optimized Dashboard loader; public Trainings keeps the deployed CODEX 2 card/image cache. No broad new cache is introduced for private response bodies or grants. Signed-in speed has not been benchmarked against real production accounts.

## Verification

- 230 selected offline security, performance, cohort, results, Journey and export tests passed, including fresh Admin/Super Admin result access, non-admin denial, owner isolation, revoked/foreign cohort scope, exact assessment attachment boundaries, selected-week response definitions, module hydration, missing optional account identity fields, nested toggles, retries and aborts.
- TypeScript (`npx tsc --noEmit`) passed. ESLint for changed application TS/TSX files passed; `git diff --check` passed.
- Node 24.21.0 production webpack build passed with the existing network guard blocking application/Supabase service access. Local webpack is used because the sandbox’s Turbopack worker restrictions were already established; no hosting build configuration was changed.
- Eight network-guarded local production HTTP checks passed: homepage/login 200, Admin redirect 307, own responses signed-out 401 and invalid input 400, cohort responses signed-out 401, Admin Journey/export signed-out 403. Private endpoints returned `private, no-store`.
- Updated three former CODEX 1 cohort assertions and one owner-Admin Journey assertion to the explicitly revised owner policy; generic sharing, non-admin, ownership, CAS and personal-note protections remain covered.
- Private authenticated production data was not used to verify these changes. After deployment, the owner should verify one Admin result, one assigned-cohort member/week, Purpose Profile expansion/reopen and personal notes isolation through their normal browser session. Offline fixtures cannot establish current production attachment completeness or live offering ambiguity.

## Release gates and residual risks

Ready for an explicitly authorized deployment, with the authenticated integration gap disclosed. Missing/ambiguous offerings deny safely; missing embedded attachments show not-started instead of exposing unrelated results. Facilitator historical versions are still limited to the current verified cohort enrollment version. These changes provide no new permission to alter participant answers or export personal notes.

The next action is owner approval for selective commit/push of this follow-up and production deployment monitoring. Previous approvals covered the earlier CODEX 2 release, not this revised access policy. Retain deployed CODEX 2 as the rollback target if a release regression occurs. Do not advance CODEX 3/4.

## Exact selective staging scope

Exclude unrelated untracked audits and CODEX 1 ZIP/closeout artifacts. The reviewed scope is 27 files:

- `app/account/page.tsx`
- `app/admin/users/[userId]/results/[kind]/[resultId]/page.tsx`
- `app/api/cohorts/[cohortId]/members/[participantId]/responses/route.ts`
- `app/globals.css`
- `app/my-journey/page.tsx`
- `app/purpose-profile/page.tsx`
- `components/experiences/builder/ParticipantCourseRuntime.tsx`
- `components/platform/SavedResponseLibrary.tsx`
- `components/platform/WayfindersAuthProvider.tsx`
- `lib/admin/wayfinders/export.test.mjs`
- `lib/admin/wayfinders/export.ts`
- `lib/assessment-results.ts`
- `lib/experiences/builder/data.ts`
- `lib/platform/auth.ts`
- `lib/platform/dashboard.ts`
- `lib/platform/response-library-policy.test.ts`
- `lib/platform/response-library-policy.ts`
- `lib/platform/response-library.test.mjs`
- `lib/platform/response-library.ts`
- `lib/platform/response-sharing-policy.ts`
- `scripts/performance/codex2.test.mjs`
- `scripts/security/codex1-1.test.mjs`
- `scripts/security/codex1.test.mjs`
- `app/api/account/responses/route.ts`
- `components/platform/OwnSavedResponseLibrary.tsx`
- `scripts/performance/participant-pages.test.mjs`
- `docs/implementation/codex-2-performance/05-PARTICIPANT-ACCESS-FOLLOWUP.md`
