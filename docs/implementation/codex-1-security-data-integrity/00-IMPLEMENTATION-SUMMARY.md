# CODEX 1 implementation review

October 10, 2026. Local changes only; **not deployed or approved for rollout**. The user approved execution of the attached CODEX 1 brief. The completed eight-report audit remains the baseline. No production/staging traffic, live Supabase/Vercel access, secret reads, dependency installation, application build, migration execution or deployment occurred.

## Completed changes

| Audit | Change | Evidence and limit |
| --- | --- | --- |
| F12 | Fail closed on participant, admin-role, assignment, catalog and override errors, including rejected transport promises. Reject invalid override effects and scopes; preserve successful empty reads and explicit-deny precedence. | Isolated failed-read, scope, administrator, grant/deny and fresh-revocation tests. Super Admin's existing policy precedence remains intact only after a complete successful load. Both effective-access page consumers show a non-sensitive unavailable message. |
| F21/F22 | Central content decision; restrictive legacy reads enforced before answer queries. Owner check added to admin Journey, CSV export, shared assessment-result loader and LMU admin results. | Private definitions, archived snapshots and embedded assessments are excluded from nonowner review. No global-admin content exception. Completion summaries remain separate. |
| F03/F15 | Generic response form supplies rendered revision; update uses timestamp CAS and requires a returned row. Duplicate inserts/zero-row updates fail visibly. Separate “response saved, progress unconfirmed” outcome. Visit retries and manual completion feedback. | Input retained in the mounted form, duplicate submission guarded, pending/confirmed/error states. Existing editor CAS, debounce and recovery files were not changed; regression tests pass. Generic form has no new durable offline text recovery. |
| F30 | LMU debounce returns actual acknowledgement, writes serialized per section in one browser session; 15-second fetch timeout, visible status and unload warning. Ambiguous transport failures block newer writes/reset for that section until reload verification. Drafts retained on device; local completion set only after acknowledgement. | Fake timers/fetch and local-storage tests. Old failures cannot roll back a newer save or another module. Cross-tab/server ordering remains deferred. |
| F32 | Duplicate validated resource associations, including uploaded PDFs/images; reuse objects, independent links. Validate resource availability/course path; reject another course's private upload. | Actual duplication and cleanup tested with fake database. No Storage calls added to duplication. Library assets remain reusable. |
| F16/F17 | Existing order failures remain errors. Failed Companion continuity read now stops publication follow-up. Publication ambiguity reports “verify state,” rather than promising no state change. | Fake partial-publish, activation and reorder failures. No new transaction/RPC redesign. |

**Verification:** 93 isolated tests passed: 36 new CODEX 1 cases plus 57 focused existing regression cases. TypeScript static checking passed; `git diff --check` passed. Exact commands and files are in [02](02-CHANGED-FILES-AND-TESTS.md).

## Required scope correction and deferred work

The canonical enrollment migration `20260918112528_canonical_enrollment_multiple_cohort_contexts.sql` explicitly says enrollment `cohort_id` and `offering_id` are legacy compatibility pointers. They cannot prove a response's sharing scope. Current response rows have no authoritative sharing-cohort/consent binding. **The production adapter therefore supplies no verified sharing cohort: facilitator and group content sharing remain unavailable.** The pure policy tests demonstrate assigned-facilitator rules with explicit verified scope; they do not claim that current persisted records supply that scope.

The three audiences are approved. Their historical mapping, durable scope/consent representation and operational exceptions remain unresolved. Default `participant_only` / `disabled` content stays private; no historical metadata was rewritten. The former facilitator UI disclosure was corrected. Admin CSV/private-result access now requires respondent ownership; this is a deliberate high-risk narrowing and must be reviewed before rollout.

Hub directory visibility and scoped creator authority were inventoried, not changed. Hub pages changed only to fail closed and show authorization-unavailable feedback. See [01](01-PRIVACY-AND-ACCESS-MATRIX.md) and [04](04-OPEN-DECISIONS.md).

## Remaining acceptance limits

- No claim that all three sharing levels are available. Owner access and restrictive legacy protection are implemented; facilitator/group activation is blocked on durable scope and historical mapping.
- Generic response CAS protects stale rendered revisions and same-row races; duplicate first inserts require reload rather than creating another row. A lost network receipt remains ambiguous and requires verification.
- Progress/reorder/publish and LMU server writes remain multi-step. Database atomicity, LMU cross-tab revision checks, and reliable navigation/unload flushing are not implemented. Timeout cancellation cannot undo an already-running server write.
- Live historical metadata, deployed RLS/grants, row-cap completeness, real browser behavior and actual Storage signing were not verified. They require separate approval and isolated test data.
- No changes to canonical IDs, schemas, published content, enrollment history, existing assessment content or editor recovery formats. Start Something and the native assessment mutation workflows remain unchanged.

Review the code and [rollout plan](03-MIGRATION-AND-ROLLOUT-PLAN.md) before any deployment. CODEX 2/3 were not started.
