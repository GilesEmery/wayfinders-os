# Owner push and rollback runbook

**Do not push until the CONDITIONAL GO gates pass and you authorize production release.** These commands are for your review, not commands run by this agent. Inspected locally: branch `main`, remote `origin` → `https://github.com/GilesEmery/wayfinders-os.git`, HEAD `363a542` (`questions`). Remote branch state and automatic deployment hooks were not contacted/verified. If pushing main auto-deploys, treat the push itself as production deployment and satisfy every gate first.

## Build and bounded integration gate before production push

Privately confirm correct nonproduction configuration; authorize any necessary network/font downloads and server initialization. In that approved environment only:

```sh
NEXT_TELEMETRY_DISABLED=1 npm run build
```

Do not run that as a claimed offline check. No dependency installs are part of this runbook. Require exit 0 and inspect route compilation/server-client boundary output. If failing, stop and repair locally; do not substitute typecheck. Preserve artifact/commit, runtime Node/package versions, build log without secrets and approved environment identity.

Use [CODEX 1.2 bounded proposal](../codex-1-2-policy-alignment/05-STAGING-VALIDATION-PROPOSAL.md) for the owner-authorized synthetic gate: eight test identities + anonymous; three Hubs, two courses/two concurrent cohorts, six generic answers, one ten-section LMU assessment; synthetic nonsensitive fixtures only. Maximum **1,000 backend requests, 25 MiB transfer, 100 mutations, eight Auth users, 500 fixture rows, one asset ≤512 KiB, 60 minutes**. Count setup/failure/retry/signing/cleanup; stop new cases at 900 requests/80 mutations to reserve cleanup. If counters/project/fixture scope cannot be confirmed, do not start. No polling, Realtime, load/performance tests or real answers.

Required passes: owner positive and all nonowner private/CSV negatives (including Super Admin/history/embedded); exact membership/leader directory without denied RSC payloads; explicit contact allow/deny; global operational projections/checked audit; complete versus unknown/truncated count; actual generic revision/duplicate and partial-progress behavior; LMU captured header, missing/stale account/retake 409 before writes, discard/reset/late receipt/navigation/two-tab/refresh; authorized resource links and future-signing revocation; synthetic publish/order error recovery. Creator/sharing/scoped reporting remain expected denials. See role matrix in report 01. Take sanitized status/counters, not private bodies/tokens or signed URLs.

Any unauthorized read/write, missing acknowledged value, false saved/completed state, incompatible schema, audit failure receipt, essential report unavailable or unexpected global creator access is **NO-GO**. Stop, inspect authoritative synthetic state, repair and rerun only affected scenarios with authorization/caps. Clean only recorded fixture IDs under approved cleanup, preserving unknown partial state for review. No broad delete.

## Local review and selective staging

```sh
cd '/Users/gilesemery/Documents/Websites - Portals/Wayfinders/wayfinders-portal'
git status --short
git diff --stat
git diff --check
git branch --show-current
git remote -v
git diff
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Rerun the exact test commands in [02](02-CODE-CHANGES-AND-TEST-RESULTS.md). Confirm the current branch/remote still match your intention and no unexpected staged paths exist. Review new file contents too (`git diff` alone omits untracked files). Preserve all unrelated edits. Do not use `git add .`, reset/clean/stash or automatically include secrets/build output/migrations.

The allowlist below contains 45 code/test files and 27 CODEX implementation reports. The pre-existing eight untracked original audit reports are excluded; preserve/archive them separately, not silently stage all `docs/`. No migrations/package/config files are staged. If any listed file acquired unrelated hunks after this review, use `git add -p -- 'that/path'` in place of its whole-file entry. Do not run this on an unexpectedly changed tree.

```sh
git add -- \
  app/admin/analytics/page.tsx \
  'app/admin/life-mapping-u/[assessmentId]/page.tsx' \
  app/admin/life-mapping-u/page.tsx \
  'app/admin/users/[userId]/page.tsx' \
  'app/admin/users/[userId]/results/[kind]/[resultId]/page.tsx' \
  'app/api/admin/wayfinders/[participantId]/export/route.ts' \
  'app/api/lmu/sections/[sectionKey]/finalize/route.ts' \
  'app/api/lmu/sections/[sectionKey]/route.ts' \
  'app/hubs/[hubSlug]/members/[participantId]/page.tsx' \
  'app/hubs/[hubSlug]/page.tsx' \
  components/admin/WayfinderJourney.tsx \
  components/experiences/builder/ParticipantProgressControls.tsx \
  components/experiences/builder/ParticipantResponseBlock.tsx \
  components/experiences/builder/ParticipantResponseForm.tsx \
  components/experiences/lmu/LMUPersistenceHydrator.tsx \
  docs/implementation/codex-1-1-privacy-predeployment/00-EXECUTIVE-REVIEW.md \
  docs/implementation/codex-1-1-privacy-predeployment/01-PRIVACY-AND-ACCESS-DECISIONS.md \
  docs/implementation/codex-1-1-privacy-predeployment/02-DURABLE-SHARING-DESIGN.md \
  docs/implementation/codex-1-1-privacy-predeployment/03-ADMIN-HUB-CREATOR-BOUNDARIES.md \
  docs/implementation/codex-1-1-privacy-predeployment/04-CHANGED-FILES-AND-TESTS.md \
  docs/implementation/codex-1-1-privacy-predeployment/05-STAGING-AND-ROLLOUT-GATES.md \
  docs/implementation/codex-1-1-privacy-predeployment/06-OPEN-OWNER-DECISIONS.md \
  docs/implementation/codex-1-2-policy-alignment/00-EXECUTIVE-REVIEW.md \
  docs/implementation/codex-1-2-policy-alignment/01-APPROVED-ACCESS-MATRIX.md \
  docs/implementation/codex-1-2-policy-alignment/02-ROUTE-AND-DATA-ACCESS-REVIEW.md \
  docs/implementation/codex-1-2-policy-alignment/03-CHANGED-FILES-AND-TESTS.md \
  docs/implementation/codex-1-2-policy-alignment/04-REGRESSION-AND-ROLLBACK-RISKS.md \
  docs/implementation/codex-1-2-policy-alignment/05-STAGING-VALIDATION-PROPOSAL.md \
  docs/implementation/codex-1-2-policy-alignment/06-OPEN-TECHNICAL-DECISIONS.md \
  docs/implementation/codex-1-2-policy-alignment/07-RELEASE-READINESS-CHECKLIST.md \
  docs/implementation/codex-1-final-release/00-FINAL-EXECUTIVE-DECISION.md \
  docs/implementation/codex-1-final-release/01-POLICY-AND-ACCESS-VERIFICATION.md \
  docs/implementation/codex-1-final-release/02-CODE-CHANGES-AND-TEST-RESULTS.md \
  docs/implementation/codex-1-final-release/03-SUPABASE-OWNER-ACTION-SHEET.md \
  docs/implementation/codex-1-final-release/04-PUSH-AND-ROLLBACK-RUNBOOK.md \
  docs/implementation/codex-1-final-release/05-RESIDUAL-RISKS-AND-DEFERRED-FEATURES.md \
  docs/implementation/codex-1-final-release/06-OWNER-FINAL-CHECKLIST.md \
  docs/implementation/codex-1-security-data-integrity/00-IMPLEMENTATION-SUMMARY.md \
  docs/implementation/codex-1-security-data-integrity/01-PRIVACY-AND-ACCESS-MATRIX.md \
  docs/implementation/codex-1-security-data-integrity/02-CHANGED-FILES-AND-TESTS.md \
  docs/implementation/codex-1-security-data-integrity/03-MIGRATION-AND-ROLLOUT-PLAN.md \
  docs/implementation/codex-1-security-data-integrity/04-OPEN-DECISIONS.md \
  lib/admin/auth.ts \
  lib/admin/wayfinders/export.test.mjs \
  lib/admin/wayfinders/export.ts \
  lib/admin/wayfinders/journey.test.mjs \
  lib/admin/wayfinders/journey.ts \
  lib/admin/wayfinders/operational-export.ts \
  lib/assessment-results.ts \
  lib/experiences/admin/block-mutations.ts \
  lib/experiences/admin/resource-copy.ts \
  lib/experiences/admin/version-release.ts \
  lib/experiences/builder/progress-actions.ts \
  lib/experiences/builder/response-actions.ts \
  lib/experiences/builder/response-mutations.ts \
  lib/experiences/lmu/acknowledged-save-queue.ts \
  lib/experiences/lmu/persistence.ts \
  lib/experiences/lmu/server/completion.test.mjs \
  lib/experiences/lmu/storage.ts \
  lib/platform/authorization.ts \
  lib/platform/effective-access-policy.ts \
  lib/platform/effective-access.ts \
  lib/platform/hub-directory.ts \
  lib/platform/hub-membership.ts \
  lib/platform/response-library-policy.test.ts \
  lib/platform/response-library-policy.ts \
  lib/platform/response-library.ts \
  lib/platform/response-sharing-policy.ts \
  scripts/security/codex1-1.test.mjs \
  scripts/security/codex1-2.test.mjs \
  scripts/security/codex1-final.test.mjs \
  scripts/security/codex1.test.mjs

git diff --cached --name-only
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Inspect every staged path/hunk against this allowlist and the approved scope. Files excluded from the release must remain unstaged. To unstage a mistaken path without discarding its edits: `git restore --staged -- 'exact/path'`. New docs may reference preserved local original audits; do not treat that as authority to include unrelated documents.

## Commit and push after sign-off

Owner-only remote review after explicit network/push approval:

```sh
git fetch origin
git log --oneline --left-right main...origin/main
```

If origin/main has unexpected changes, stop and review; do not force push or casually merge into the reviewed artifact. Revalidate any reconciliation locally and the resulting build. Verify the branch, staged diff, report 03 inspection, synthetic results, residual-risk acceptance and rollback artifact before committing:

```sh
test "$(git branch --show-current)" = main || exit 1
git commit -m 'Complete CODEX 1 security and data integrity safeguards'
CODEX1_RELEASE_COMMIT=$(git rev-parse HEAD)
git show --stat "$CODEX1_RELEASE_COMMIT"
git status --short
git push origin HEAD:main
```

These commands neither imply that main is safe to deploy nor authorize remote actions for this agent. Record the commit and build artifact in owner sign-off; do not include unreviewed work to make the tree appear clean.

## Post-deployment smoke / monitoring

Only after separately authorized deployment, using the named synthetic owner/unrelated/Admin/Super Admin/leader accounts: one own-result read and one nonowner denial, directory/contact denial and allowed case, one metadata CSV verifying only whitelist fields + audit, one generic save/reload, one LMU save/reset/context rejection, and one fixture signing withdrawal. Cap smoke at **100 backend requests, 5 MiB, 10 fixture mutations, 20 minutes**, no polling; stop on scope/cap/receipt/privacy failure. This is a subset gate, not full regression or performance measurement. Inspect bounded sanitized server errors/audit receipts and missing saves immediately and next day; use fixed time windows and ≤50 log events per review, no answer logging. Record unavailable report/count/audit errors explicitly.

## Stop and rollback

Before push, identify a known safe rollback artifact that retains CODEX 1 server privacy guards; the pre-CODEX HEAD restores audited privacy defects and is not an automatically safe fallback. If none exists, stop/restrict affected surfaces and prepare a reviewed minimal corrective artifact instead of blindly reverting. Record artifact ID and owner-approved deployment rollback procedure privately before release. No Vercel action is run here.

Inspect the recorded release commit locally:

```sh
git show --stat "$CODEX1_RELEASE_COMMIT"
git show "$CODEX1_RELEASE_COMMIT" -- 'lib/platform/response-sharing-policy.ts' 'lib/assessment-results.ts'
```

If the variable was not preserved, set it to the exact recorded SHA first. Prefer a focused corrective commit retaining owner-only gates and complete-read checks. A reviewed code reversal can be prepared with `git revert --no-commit "$CODEX1_RELEASE_COMMIT"` only in an owner-managed clean checkout; inspect and retain the privacy safeguards before any commit/push, then repeat build/security verification. Do not run a blanket revert in this dirty shared workspace or deploy the unreviewed result.

Stop access/release on any privacy leak or wrong-account write; preserve sanitized evidence and notify the responsible owner/operator. Code rollback cannot recall exports/downloads/signed URLs or undo committed/in-flight response/progress/publication writes. No SQL data rollback, deletion, pointer reset or grant broadening is authorized by this runbook. Any repair of real data/grants requires separate concrete approval and a reviewed reversible plan. Reload old forms after preserving drafts; missing LMU assessment headers and stale generic revisions intentionally fail.

## October 12 completion execution and owner staging decision

The owner explicitly chose to skip staging setup on October 12 and continue release preparation. This is acceptance of the disclosed untested integration risks, not evidence that staging passed. No staging resources, costs, migrations, fixture writes, credentials changes, production data reads or writes were performed. Production push/deployment still requires separate final approval.

- CODEX 1 code/test files are unchanged since the 264-check passing run; the 72-path selective list covers all pending tracked release edits. Prior suites were not unnecessarily repeated. Read-only production Supabase contract evidence from October 10 is retained; no evidence of a contract change prompted repetition.
- Local and remote `main` match `363a542c0df69f64f98c15286112cbe82b877387`. Vercel's latest READY production deployment is `dpl_Ds3DAazwS1PEXMDnemMcbhJAHixe`, built from that same `main` SHA. GitHub integration links `GilesEmery/wayfinders-os`.
- Production target: Vercel project `wayfinders-os` / `prj_569lm7OPIHhr7pAoMmxEWb2xDrcp`, team `gilesemerys-projects` / `team_cgPcgpCMTyiMoDSjgSjNxipT`; public alias `https://wayfinders-os.vercel.app`. Treat a `main` push as a production deployment. Both existing Preview and Production Supabase URL settings point to `xxjiiqrhnniccnxujmnv.supabase.co`; Preview is not an isolated test database. No environment setting was changed.
- Vercel runtime is Node `24.x`. A checksum-verified official Node `v24.21.0` was downloaded into temporary storage, without modifying dependencies or system runtime. A new guarded Next production build on that runtime passed, exit 0: compilation, Next TypeScript, 95/95 page generation. Build ID `zIOrb9D12yZOMHDhwmBHA`. The temporary guard blocked 8 Supabase requests and allowed only font hosts/loopback. This verifies build compatibility, not production data/runtime integration. Deployment must build the reviewed source through Vercel; do not upload this guarded local build as a certified live artifact.
- Still NOT TESTED: live authenticated owner/nonowner payloads, real save/reload/CAS/reset/cross-tab behavior, permission revocation, resource signing, and synthetic publish/reorder recovery. Auth URL/session settings and configured Data API maximum remain unverified. No code/grant workaround is introduced to claim a pass. Sharing, scoped creator/reporting, privileged private exceptions, schema changes, CODEX 2/3 stay deferred.

Recommendation: **CONDITIONAL GO with owner-accepted staging waiver**. No known reproducible critical leak remains in the reviewed local patch, but unperformed integration checks cannot be certified. Before commit/push, show the release gate table and exact file list, obtain explicit final approval, and verify that the approved file contents and remote HEAD are unchanged. Commit title: `Complete CODEX 1 security and data integrity safeguards`. Scope: the runbook's 72 paths only; exclude original audits, ZIPs, secrets, migrations and build artifacts.

After separately approved push, monitor the matching Vercel deployment for READY and inspect sanitized build failure evidence if needed. Proposed production smoke scope: at most 10 anonymous read-only HTTP requests to public landing/admin-login/anonymous-denied API surfaces, at most 2 MiB transfer and five minutes; no accounts, answers, synthetic records, uploads or writes. Authenticated save/owner/Storage smoke remains NOT TESTED under the staging waiver. Ask separately before any broader test.

Recovery preserves privacy: do not automatically roll back to the pre-CODEX deployment, which restores audited weaknesses. On a new privacy/identity failure, stop testing; request incident approval to pause production access, then prepare a focused forward correction retaining owner-only gates. On build failure before promotion, leave the existing live deployment untouched and ask before correction/redeployment. No SQL rollback/delete/pointer reset is authorized.

### External Actions Required

**None before final approval:** Codex can perform the selective commit, push and deployment monitoring with existing connections. The required involvement now is your explicit commit/production-push approval in this conversation; do not paste credentials.

**Emergency fallback only if Codex's Vercel connection becomes unavailable:** after explicit incident approval, an authenticated operator or ChatGPT HAL can pause the production project. In a terminal with the Vercel CLI already installed and logged into the correct team, first confirm the command with `vercel project pause --help`, then execute:

```sh
vercel --scope gilesemerys-projects project pause wayfinders-os
```

This blocks the active production deployment and disables automatic production-domain assignment; it does not alter Supabase data or restore older vulnerable code. Verify `https://wayfinders-os.vercel.app` no longer serves the application, with one anonymous request. Do not execute this as part of normal release preparation. Resuming/promoting requires a reviewed safe artifact and separate approval. If login is required, use the provider's browser login flow; never share a token in chat.
