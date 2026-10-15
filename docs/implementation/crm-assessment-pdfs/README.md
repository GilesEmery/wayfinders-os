# CRM assessment PDF downloads

Wayfinder CRM profile → Courses and assessment progress → Open Journey records → Completed assessment PDFs.

Each confirmed completed assessment has a Download PDF button. The download contains the selected participant’s name, assessment name, completion date, saved results and applicable completed answers. Files include participant/assessment/date in their filename. In-progress work is not represented as a completed assessment PDF.

Supported canonical result kinds: Wayfinders Ethos, Start Something, Life Mapping U, Activate Your Purpose, Personal Impact Statement, Circle of Influence, Launching Your Wayfinders Hub, and Bridges vs. Barriers. The existing completed-result registry determines eligibility; missing legacy results are explicitly identified rather than invented. Retakes and older versions follow the existing completed-result listing policy.

## Implementation

- `AssessmentPdfDownloads` lazily loads result metadata when CRM Journey records are opened, with loading/error/download feedback and mobile sizing.
- Administrative completed-result listing reuses the existing canonical result eligibility checks with fresh admin authorization.
- The PDF API validates kind and IDs, verifies current administrator access and participant/result ownership, loads only saved canonical material, audits access, and returns an attachment with `private, no-store` and `nosniff` headers.
- PDFs use the installed `@react-pdf/renderer`; no new package or hosted rendering service is required. They are generated on demand without storing a second copy.
- Scoring and readable-answer projections are shared with existing participant results/response views. LMU exports include each saved finalized module result with readable summary, ranked selections, highlights and supporting detail.
- No personal course-note table is queried. Participant/facilitator sharing rules are unchanged.

Endpoints:
- `/api/admin/wayfinders/[participantId]/assessment-results`
- `/api/admin/wayfinders/[participantId]/assessment-results/[kind]/[resultId]/pdf`

## Verification

38 focused tests passed for admin permissions, exact participant/result scope, missing/incomplete/foreign results, audit failures, existing completed-result eligibility, scoring, content preservation, filenames, CRM journey and personal-note exclusion. TypeScript, ESLint and production webpack build passed.

A disposable local browser verified completed-result cards, a real PDF file download, revoked-access error feedback, buttons becoming available after failure, and mobile fit. API responses were synthetic in this browser test; server authorization/ownership checks were exercised separately in focused tests. No live participant work was exported for testing.

Synthetic Ethos, Start Something and Life Mapping U PDFs were generated and visually inspected. Extraction verified complete long responses, including 180 repeated next-step sentences and 200 repeated LMU reflection sentences, across pagination. Exports wrap content onto additional pages and keep question/answer starts together.

To regenerate synthetic PDF examples: `node scripts/prototypes/assessment-pdf-review.mjs`. Outputs go to `/private/tmp/assessment-pdf-review` and contain synthetic material only.

No migration or database registration is required. No deployment or participant-data changes were made. A deployed application build is required for these CRM download controls and API routes to be available in production.
