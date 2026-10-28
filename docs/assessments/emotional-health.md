# Native Emotional Health Assessment

Implemented in PurposeOS using the existing APEST assessment shell and native experience/response architecture. This is a new native assessment, not a Jotform integration or a requirement to reproduce Jotform settings.

## Content and scoring authority

The 40 exact statements and the scale endpoints were extracted from the owner's Emotional Health Assessment on October 28, 2026. The owner supplied the scoring rule and results message, and then directed that the assessment be built natively in PurposeOS in the APEST style.

- Stable question identities q1–q40; source wording preserved.
- Four fixed scoring groups of ten: q1–q10 Self-Awareness; q11–q20 Self-Management; q21–q30 Social Awareness; q31–q40 Relationship Management.
- Five integer choices, 1–5. Endpoints are Strongly Disagree and Strongly Agree. The source has no descriptive labels for intermediate stops, so those remain 2, 3 and 4.
- Each section is the direct sum of its ten responses, 10–50 when complete. There are no reverse-scored items, weights, rankings, combined totals, or APEST primary/secondary categories in this native implementation. In particular, q5 remains a direct contribution as specified by the owner's sum rule.
- Inclusive bands: 0–25 Area for enrichment; 26–38 Effective functioning; 39–50 Enhanced skills area. Preserve the supplied lower bound of 0, but never score an incomplete section as a completed zero.
- Results use the supplied formative language and Wayfinders Team closing. The greeting/name merge field and email transport are omitted because this is an in-app result, not an email. No duplicate name/email collection or notification service is added.
- Internally, `emotional-health.config.json` records the native content/configuration. Runtime source of truth is `lib/experiences/builder/emotional-health.ts`; tests check the scoring and section membership.

## Shared assessment rules followed

- Reuse APEST's launch card, focused assessment frame, neutral native shell, typography, five-stop sliders, progress navigation, intro, saved-result actions and responsive styles.
- Eight pages of five shuffled statements. Stable IDs determine scores; presentation order is saved/restored and retakes reshuffle.
- Untouched centered sliders do not count as responses. Exact stop buttons support keyboard and pointer input.
- Save progress without completing an attempt. Explicit completion requires all 40 valid responses, computes scores on the server, and confirms canonical enrollment completion.
- Use the existing signed-in identity, participant/enrollment authorization resolver and compare-and-swap persistence. Do not accept a client participant ID or client-computed total.
- Preserve previous completed results during a retake draft. Explicit retake completion archives the previous snapshot. Stale retakes are rejected and completion retries do not duplicate history.
- Integrate My Journey, shared response/result readers, printable participant results and existing authorized CRM PDF downloads. Preserve existing sharing and access policies.
- Register an exact custom-component renderer and response key; keep unrecognized renderers unavailable.
- No schema migrations, separate login, new database tables, published-content edits, or live test submissions. Application deployment is handled separately from assessment-content publication.

## Entry points

- Participant: `/experiences/emotional-health` (requires a published native assessment and eligible enrollment).
- Local development preview: `/dev/emotional-health-preview`.
- Completed fixture: `/dev/emotional-health-preview?finished=1`.
- Renderer: `emotional-health-assessment.v1`.
- Response key: `emotional_health_assessment`.
- Draft setup: `scripts/create-emotional-health-draft.mjs`.

The development-only preview uses fictitious data, performs no database saves, and is unavailable in production. Its completed fixture has scores 50, 30, 20 and 40, showing all three interpretation bands.

## Draft setup and owner release

Integrated in the primary checkout from base `99367ff`. The supplied patch applies cleanly. Integration also adds Emotional Health to both participant/admin saved-result route allowlists, which the supplied patch omitted. The configured PurposeOS database now contains the private draft and active prebuilt registration; the assessment remains unpublished. See the integration release record for deployment evidence.

Review the offline setup plan without credentials or database access:

```sh
node scripts/create-emotional-health-draft.mjs --plan
```

In the owner's existing configured checkout, inspect the linked project read-only first:

```sh
node --env-file=.env.local scripts/create-emotional-health-draft.mjs
```

After reviewing that target and plan, the explicit installation command is:

```sh
node --env-file=.env.local scripts/create-emotional-health-draft.mjs --apply --confirm=c1bc78cb-6e09-5077-af85-8e5d3a0c093d
```

The setup uses existing experience/version/module/lesson/section/layout/column/block/response/registry tables. It creates a private unpublished draft, participant-only raw/results visibility, disabled sharing, and the standalone reusable-assessment launch path. It checks slug/version collisions and will not overwrite a published assessment. It does not publish, place this assessment in a course, send email, or modify any participant responses. The owner can review the draft and image settings through the normal builder before publishing. Application-code deployment and assessment publication are separate release steps.

## Verification

- `npm run test:emotional-health`: section boundaries, five integer choices, no implicit answers, direct scoring including q5, invalid/incomplete payloads, all eight rendered pages, results copy, retake history, stale retakes, server-computed totals, authorization, failed persistence, completion retries, response readers, PDF content and publication registry.
- Existing APEST and Five Voices suites plus completed-result/response-library/PDF regressions.
- Next.js route generation and TypeScript checks.
- Optimized production build.
- Offline draft plan and setup-script syntax check.

Local browser review in Microsoft Edge verified the APEST-style question layout, explicit answer selection, progress navigation, disabled completion for incomplete responses, the completed fixture with scores 50/30/20/40, all interpretation bands, and retake introduction/reset to zero answers. The server ran from the primary checkout on port 3013; an existing port-3003 server belongs to another checkout and was preserved. Preview mode performs no database saves.

Live database draft/registry registration is verified; live participant saving and cross-account database tests were not performed because the assessment is intentionally unpublished. Authorization, failed saves, canonical completion and retake retry behavior are covered by the native mocked persistence suite. The live admin list is checked separately during release verification.
