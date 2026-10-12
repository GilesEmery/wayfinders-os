# Release readiness checklist

**Inference — disposition:** conditional go for separately authorized synthetic staging verification of the implemented private-only patch. No authorization has been given to execute staging. Not production-ready. Creator, context-attributed reporting and shared-body features remain deferred/denied and cannot be included as accepted features.

## Completed locally

| Classification | Gate | Status / evidence |
| --- | --- | --- |
| Verified from local code | Prior work preserved, owner decisions translated and old proposals distinguished | 20 previous reports unchanged; approved matrix in 01; file-hash delta in 03. |
| Verified from local code; verified by isolated test | No new private/admin bypass; independent Super Admin general precedence retained | Owner-only bodies/results/private CSV; disabled adapter; complete-read guards. `lib/platform/response-sharing-policy.ts:21`; `lib/platform/response-library.ts:246`, `:305`; `lib/platform/effective-access.ts:34`. |
| Verified from local code; verified by isolated test | Minimal exact-Hub directory and independent scoped contact gate | Pre-query directory denial and count completeness; explicit contacts. `lib/platform/hub-directory.ts:8`, `:20`, `:34`. |
| Verified from local code; verified by isolated test | Operational metadata distinct from bodies/contacts | Separate CSV allowlist; LMU contact queries removed; truthful UI. `lib/admin/wayfinders/operational-export.ts:17`; `app/admin/life-mapping-u/page.tsx:12`; LMU detail `:15`. |
| Verified from local code | No unverified cohort attribution / invented creator ownership | Scoped feature gaps kept denied. `supabase/migrations/20260918112528_canonical_enrollment_multiple_cohort_contexts.sql:29`; `lib/experiences/admin/block-mutations.ts:87`. |
| Verified by isolated test | Security/save/copy/publish regression suite | 184 passed, zero failure/skips/cancellations; 148 retained +36 new. Exact command in 03. |
| Verified from local code / static execution | TypeScript/diff check | Both final checks exited 0. Eight reports complete. No schema/network/deploy/CODEX 2 activity. |

## Before synthetic staging execution

**Inference:** obtain explicit authorization for the named nonproduction project/deployment, operator, artifact and synthetic fixture operations in [05](05-STAGING-VALIDATION-PROPOSAL.md). Agree on caps, observable counters and manifest-only cleanup. Review the 17 code/test-file delta independently of unrelated dirty-tree work. Accept that ordinary creator and scoped progress are expected-denial cases, not implemented feature acceptance. Do not seed durable sharing or grant real contact permissions.

**Requires live verification:** confirm project identity, schema/grants and exact-count support only after that authorization. Do not start if target/counters are uncertain. Existing counted SDK calls need real receipts; a count mismatch must stay restrictive, even if it blocks a legitimate page.

## Production release blockers and sign-off

| Classification | Blocker / required sign-off |
| --- | --- |
| Requires live verification | Security: denied audiences have no raw/result/contact/roster payloads; direct anonymous/authenticated RLS/grants and service-role app mediation match the approved matrix. |
| Requires live verification | Operational acceptance: global Journey, ID-based LMU progress search, separate CSV, owner result/export parity, three Hub modes and explicit contact permission behave correctly. Essential blocked workflows must be acknowledged; no answer-access workaround. |
| Requires live verification | Integrity: generic CAS/unknown receipts, LMU session/cross-tab/navigation, Storage withdrawal and copy/publish/order partial outcomes are understood and recoverable. Stop on cross-identity writes or missing acknowledged data. |
| Requires live verification | Completeness: actual catalog/override/roster counts and large-history/global total limits; do not represent capped results as complete. |
| Inference | Technical scope: deferred creator/context reporting/sharing cannot be advertised or enabled. A release needing those capabilities requires coherent follow-up implementation and tests first. |
| Inference | Product scope: closed-Hub discoverability is unchanged and separately undecided; no new small-group analytics or threshold. Accept current non-directory behavior or authorize a specific later change. |
| Inference | Release operations: reviewed safe commit/artifact, operator, rollback preserving private guards, redacted monitoring and separately approved production smoke scope. Staging success does not approve production. |

**Inference:** suggested production triggers for immediate stop are any unauthorized disclosure, cross-account mutation, missing acknowledged save, false partial-operation success, or broken essential operational path. Choose a baseline-relative error-rate trigger and operator during the later release approval; no fabricated numeric production threshold is asserted here. Preserve evidence, disable affected entry paths, and roll back only to privacy-safe code. Rollback cannot recall exports/URLs or undo committed/in-flight writes/publication.

**Inference:** next action is review of this local package and separate approval of the bounded synthetic staging plan. No additional approval of D1–D8 is requested. The application is ready to be investigated under that limited plan, not to be declared secure or deployed from offline test results alone.
