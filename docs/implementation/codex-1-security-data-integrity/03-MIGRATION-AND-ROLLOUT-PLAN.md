# Migration and rollout plan

**SQL written: none. SQL applied: none.** The bounded changes use existing columns and uniqueness constraints. No schema, RLS, grants, RPC, canonical IDs, history or published curriculum data changed. No Supabase CLI, live service, application build or deployment was run.

## Review and deployment ordering

1. Review this diff, privacy restrictions and open decisions. Confirm acceptance of temporarily unavailable facilitator content and unrelated-admin response exports/results; they narrow legacy behavior. No product-directory/creator policy changes are included.
2. Separately authorize historical **metadata-only** inventory: counts by raw/result visibility, sharing mode, version and settings shape; find ambiguous scopes and any explicit activity disclosures. Do not export answer bodies. Verify deployed migration order/constraints and direct Data API grants/RLS with controlled test identities. This step was not executed.
3. Run a separately approved isolated local database/browser verification with synthetic participant data and network isolation. Check current schema compatibility, returned-row update behavior, owner history/results, password gates, actual resource links/signing and publication validation. No build is approved merely by this plan.
4. Once reviewed and integration-verified, release server checks and participant UI together. The hidden generic-response revision field is now required; old open forms must reload and retain/copy text first. Do not enable sharing selectors or rewrite historic definitions.
5. Verify with bounded authorized test accounts: owner versus unrelated admin/facilitator/member, removal/revocation, same ID direct URL/API/export, archived/embedded assessment privacy, two tabs, lost receipt, refresh after save, LMU module completion/unload and copied media independence. Stop if any content leaks or a UI claims saved before confirmation.

CODEX 1 is a reviewable local patch, not a claim that every acceptance gate has been proven in a deployed system.

## Follow-on transaction contracts (not migrations)

- **Response + progress:** authoritative actor/target/version verification, rendered expected revision and request idempotency key, canonical unique response constraint, locked response transition and required progress writes in one transaction. Preserve finalized/started/completed timestamps. Return committed response revision and progress receipt. Before that, use the explicit partial-success error and reload; never blindly resubmit different text over a finalized answer.
- **LMU ordering:** add server-enforced expected revision/idempotency semantics per assessment section, protecting completed snapshots and draft/finalize/reset transitions in the same transaction. Client per-section serialization protects normal ordering in one session only. A timed-out request may still commit server-side, and concurrent tabs still race; do not treat client abort as rollback. Retry after verifying server state.
- **Reorder:** lock the full affected draft column/lesson, validate complete IDs and current revision, allocate collision-free temporary slots, write final slots atomically, return a new revision. Reject stale input rather than writing partial order. A failure today requires reload and inspection; do not assume original order survived. Never run an arbitrary cleanup against published content.
- **Publish continuity:** retain atomic publication RPC. Reconciliation of post-publication Companion overrides/activation must identify source/target release and stable module keys, preserve explicit target settings, and be idempotent per target module/offering. A retry must reconcile an already-published release, not call draft publication again. On unknown transport outcome, inspect release pointer/status first. A transaction/outbox design belongs in a separately reviewed change.
- **Sharing:** design durable response sharing-cohort/group binding and explicit consent/disclosure provenance; preserve owner-only legacy reads and leave ambiguous rows private. Grant only narrowly necessary server-mediated access. Do not assume the legacy enrollment pointers provide consent or sharing scope.

Future migrations must be authored, ordered, compatibility-tested and reviewed separately before application; no code here depends on one.

## Recovery and rollback

- Restore code by reverting only the CODEX 1 changed files listed in [02](02-CHANGED-FILES-AND-TESTS.md). No destructive database rollback is needed. Preserve all responses and new independent block/resource links.
- Reverting privacy/fail-closed checks restores the audited vulnerabilities. Prefer retaining those server safeguards and addressing UI compatibility independently; any rollback that reopens content needs explicit review.
- Generic failed saves retain text only while the form is mounted; unload warns for pending/failed/unsaved work. Copy unsaved text before reload. Confirm server row/revision after lost acknowledgement. Successful response with failed progress is explicitly reported and must be reconciled separately.
- LMU failed drafts remain in the existing device store; pending completion does not unlock downstream modules until acknowledged. Real navigation and resume behavior must be checked across all ten modules. Existing local-storage recovery is device-local, not guaranteed across account/device changes or storage failures.
- Media duplicate link failure attempts removal of the new block/links only. Cleanup failure reports uncertainty. Order failure after insertion may leave a linked new draft block: reload, identify by its new key and inspect/remove that copy if appropriate; keep source and physical objects. No transaction guarantee is claimed.
- Publication errors after RPC may mean published but incomplete delivery. Inspect lifecycle/current version and reconcile continuity before sharing the course; preserve published version/history. Do not casually reset the published pointer, which can trigger enrollment-forward behavior.
