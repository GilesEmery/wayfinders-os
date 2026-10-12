# Course / profile assessment placement correction — 2026-10-12

Baseline: deployed release `5fd97f1`. Status: local correction verified; owner explicitly approved the correction and production push on 2026-10-12. Deployment verification pending.

## Cause and correction

A selected parent course week was passed through the request-scoped context into a linked assessment’s curriculum loader. The child assessment uses different module IDs. Its response definitions remained present, but the curriculum hydration filtered its blocks using the parent module ID, so saved answers disappeared from the course/week view even though they remained visible through the separate assessment enrollment. The same owner pathway is used when a participant opens their own cohort work.

The loader now distinguishes parent and linked structures within its request-only deduplication key. A linked assessment does not inherit the parent week’s module filter. The parent still hydrates only the selected week and reads only its selected response definitions. Linked reads still resolve the selected assessment Experience/enrollment and preserve participant ownership. This does not introduce global caching, additional sharing permissions, new enrollments or duplicate stored answers.

The expected behavior applies to every participant: an enrolled assessment completed through a course is visible both in that course and as its existing separate assessment entry in Purpose Profile. Facilitators can review the same work through the exact cohort/parent block attachment verified by the previous release. Missing or unrelated attachments still cannot substitute standalone results. Admin/Super Admin review and personal notes protections are unchanged.

## Verification

- 67 relevant offline tests passed, including a completed Personal Impact Statement with distinct parent and child module IDs. The same final statement and submitted status appear in the personal course view, the owner's cohort view, the separate profile assessment and another assigned facilitator’s cohort view. Saved course questions and answers also belong in Purpose Profile under their course/week. Native week responses remain present; the index retains separate course and assessment entries. Revoked/foreign cohort access and missing attachment boundaries remain tested.
- The curriculum fixture now models child block removal when an incorrect module filter is supplied, rather than returning all child blocks regardless of the requested scope.
- TypeScript, changed-loader ESLint and `git diff --check` passed.
- Node 24.21.0 network-guarded production webpack build passed. No application/Supabase services were contacted by the build.
- A read-only production query returned only the owner's enrollment/version IDs and response counts. The two native parent-course response records belong to the current enrollment version, so a version mismatch does not explain this reported case. No statement text or other participant answer bodies were retrieved. Earlier approved metadata checks already established the saved linked Personal Impact Statement completion.

## Release scope

Only these three files belong to this correction:

- `lib/platform/response-library.ts`
- `scripts/performance/participant-pages.test.mjs`
- `docs/implementation/codex-2-performance/06-COURSE-ASSESSMENT-PLACEMENT-FIX.md`

No database objects, migrations, RLS, permissions, Storage or Vercel configuration changes. A new production push needs the owner's final approval under the standing release instruction. After approval, monitor the deployment and perform bounded anonymous smoke checks; authenticated course/profile/facilitator results still need the owner's normal-browser confirmation without agent access to private answer text.
