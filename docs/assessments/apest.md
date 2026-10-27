# Digital APEST assessment

Implemented locally in `app/experiences/apest` using the existing native assessment shell, builder renderer registry, authorized participant course mutation resolver, compare-and-swap persistence, enrollment completion, and My Journey result reader. No schema changes are required.

## Source and reproduction information

Source: the user's attached one-page `APEST-Test.pdf`, titled “The Three Minute APEST Test,” from the referenced “Create Five Voices Assessment” conversation. All 25 statements are preserved, including the paper's original wording and punctuation; line wrapping is normalized. Stable source identities are q1–q25.

On October 27, 2026 the user stated: “No rights - it is open source.” Implementation proceeds on that representation. The supplied paper has no visible author, license, copyright, or attribution notice. No specific open-source license or independent reproduction permission has been verified. Do not describe a particular license as established. If an author/license source is later supplied, add the required attribution before public release.

The original scale is 1 Rarely, 2 Sometimes, 3 Always. The five selectable digital stops (1, 1.5, 2, 2.5, 3) are an intentional adaptation. At the user’s request, this provenance is retained in internal documentation only. Participants see Rarely, Occasionally, Sometimes, Often, and Always, without numeric weights. PurposeOS wrote the result descriptions, contributions, growth suggestions and practices; they are not source-paper text or a validated interpretive instrument.

## Behavior

- Original mapping: q1–q5 Apostle; q6–q10 Prophet; q11–q15 Evangelist; q16–q20 Shepherd; q21–q25 Teacher.
- Five pages of five shuffled statements, with stable IDs for scoring. Server-rendered launch order is passed into the client; draft order is saved and restored. Retakes reshuffle.
- Range controls and accessible numbered stop buttons both select exact half-step values. Unselected center positions do not count as responses.
- Each domain totals five answers, ranges 5–15, and retains half points. Results appear in descending order, without numeric scores. Primary cards use dark blue with white text, secondary cards use light blue with white text, and the remaining cards use gray. Tied scores share a rank and are labeled as ties. There are no invented normative thresholds.
- Drafts save without completing a first attempt. Finalization requires all 25 valid answers. The server computes scores rather than accepting client totals.
- Retake drafts preserve the previous finished snapshot. A completed retake archives that snapshot, including five scores, before replacing the current result. Earlier rankings are viewable on the assessment's saved-results screen.
- My Journey's existing completed-result list recognizes `apest_assessment` / `apest`, renders the detailed result, and links to review/retake. Shared response summaries and existing PDF downloads receive all questions and all five ranked descriptions.
- The server resolves participant identity and enrollment from the signed-in session and validates the exact active block, renderer and response definition. Existing compare-and-swap persistence protects against late writes. Stale retakes fail rather than replacing newer results.

## Local review and activation

Run the existing development server and open `/dev/apest-preview`. This development-only page uses fictitious data, skips saving, and supports taking the test and retaking it. `/dev/apest-preview?finished=1` shows a completed fixture.

The production route requires a published Assessment with its native response definition. The authenticated admin setup at `/admin/assessments/apest/setup` installs the complete source-controlled APEST screen into the existing private draft, archives the temporary introduction-only block, and registers the standalone launch path for embedding in courses. It rejects a published Experience or Version, checks the admin’s authority, preserves image settings, and can be safely retried. It does not publish the assessment.

## Verification

- `npm run test:apest`: scoring, exact groups, decimal stops, incomplete responses, ties, order retention, server-computed snapshots, retake history, stale retakes, result policy, authorization, failed saves and completion retries.
- Existing completion, result, response-library and publication validation regression tests.
- `npx next typegen` followed by `npx tsc --noEmit`.
- Targeted ESLint checks on the new assessment model, mutation/action, UI, and routes.
- Browser preview: 25 answers at 2.5 yield five tied scores of 12.5/15; retake starts with zero responses and a fresh order.

Live database saving has not been exercised because this local checkout has no database configuration.

## Introduction and draft preparation

New participants see an introduction before the statements, both when launching independently and from a course. It introduces Apostle, Prophet, Evangelist, Shepherd and Teacher, describes the 25-statement reflection, and explains how to use the profile. Continuing a saved attempt opens its questions; a retake starts with the introduction.

The native draft setup preserves the course image for the owner and registers the standalone launch path for course embedding after publication. It does not add APEST to any particular course automatically.

### Live draft identity

A private unpublished Assessment shell was created through the signed-in admin interface on October 27, 2026:
- Experience: `6c442633-9fc0-4783-a9ab-ce9765c5dcda` (`apest`).
- Draft Version: `0a34fadd-5817-4600-a530-c7caa8ec62be`.
- Admin: https://wayfinders-os.vercel.app/admin/trainings/6c442633-9fc0-4783-a9ab-ce9765c5dcda

Use the authenticated native draft setup to install the renderer and reusable-assessment registration into this exact draft. The temporary introduction block is archived rather than deleted. Deployment of the application code was authorized on October 27, 2026; publication of the APEST assessment remains the owner’s action.
