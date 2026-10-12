# Durable participant sharing — design only

October 10, 2026. **Proposed policy:** the model below is a reviewable design, not executable SQL, a migration, an enabled adapter, or authorization to change existing records. The three audience principles are approved; lifecycle, result exceptions and exact group rules still need the owner decisions in [06](06-OPEN-OWNER-DECISIONS.md).

## Why a durable binding is necessary

**Verified from code:** canonical enrollment is unique by participant/experience; enrollment cohort/offering fields are compatibility pointers, not response scope (`supabase/migrations/20260918112528_canonical_enrollment_multiple_cohort_contexts.sql:22`, `:29`, `:32`). Definitions hold audience labels but participant responses have no consent/scope proof in the reviewed schema (`supabase/migrations/20260914190032_reconcile_a2_themes_privacy_delivery_plans.sql:64`; `supabase/migrations/20260907140629_purpose_os_foundation.sql:312`). The current adapter deliberately passes null scope (`lib/platform/response-library.ts:249`).

**Verified from code:** the new `participantSharingConfirmed` flag is only a trusted policy input. It is not persisted evidence, a form input, or sufficient to activate sharing by itself (`lib/platform/response-sharing-policy.ts:15`, `:25`). Never populate it from `share_mode`, enrollment, a client checkbox alone, or a role.

## Smallest reliable records

**Proposed policy:** use one optional context binding and a consent grant for each independently shareable content resource. Missing records mean Private. Keep existing native and custom answer payloads untouched.

| Conceptual record | Required fields / constraints | Purpose |
| --- | --- | --- |
| Response context binding | Canonical response ID; respondent participant ID; enrollment and experience ID; response-definition/version ID; exact cohort ID; optional exact subgroup ID; verified offering/context provenance; creator actor/time | Prove the scope belongs to that response, course and respondent. Composite relationships must prevent mixing another participant/course/version. A subgroup must belong to the cohort. No default copied from legacy pointers. |
| Consent grant | Binding ID; audience facilitator/group; content kind raw/result independently; participant actor ID; consent timestamp; policy/disclosure version; revision/content fingerprint shared; grant revision; revoked timestamp/actor | Prove the respondent intentionally shared a particular revision and audience. Actor must equal respondent; timestamps server-generated. Distinguish no grant from revoked grant. Require uniqueness of each active binding/audience/kind/revision. |
| Sharing audit event | Resource/binding/grant IDs; actor; action share/revoke/rebind/read/export; server timestamp; previous/new grant revision; exact scope; purpose where relevant | Append-only history without answer text or raw result payloads. Sharing/revocation changes and audit writes atomic. Reads/exports need reliable audit handling. |

**Proposed policy:** for generic answers, use foreign keys to `participant_responses` and its canonical ownership/version identity. For LMU, add a separate typed reference to the assessment/section result or response record, with foreign keys proving owner and resource type; do not use an unconstrained arbitrary polymorphic ID. Start Something uses its existing canonical native response reference. An adapter for custom LMU sharing is a separate future work item. Authorize generic sharing first; do not rewrite custom schemas or try to share a whole LMU assessment by inference.

## Binding and saving semantics

**Proposed policy:** capture candidate context at creation only when the participant explicitly selected a verified cohort/group. Creation does not grant sharing. Standalone answers have no binding. Each ordinary save validates the existing binding but never silently changes it or creates consent.

**Proposed policy:** at an explicit sharing action, show the exact cohort/group name, recipient class, raw versus interpreted content, and revision to be disclosed. Reverify identity, ownership, membership, offering/course/version and recipient assignment server-side; bind and grant atomically with the consent event. A course configured as `required` may prompt for explicit sharing, but must not manufacture consent from submission or deny access without an approved product rule.

**Proposed policy:** initial rollout shares immutable submitted/finalized revisions only. Editing/reopening produces a new revision that stays private until the participant explicitly shares it. Old revision access is revoked on replacement unless the owner approves a clearly disclosed archival rule. This avoids secretly streaming subsequent edits to recipients. Draft sharing would require a separately approved “future edits also shared” disclosure.

**Proposed policy:** one answer remains canonical even if a person joins two cohorts. Initial rollout binds a grant to one explicitly selected context. Multiple concurrent audience contexts require separate affirmative grants with separate revocation; do not duplicate answer records or replace canonical enrollment IDs. If recipients differ by subgroup, bind the exact subgroup; whole-cohort membership is insufficient.

## Lifecycle and revocation contract

| Event | Recommended future behavior — proposed policy |
| --- | --- |
| Participant revokes sharing | Deny every subsequent nonowner body/read/export immediately upon committed revocation. Keep owner access and consent audit. Invalidate authorized views/caches; UI refresh is not enforcement. |
| Membership withdrawal/inactivity | Deny nonowner reads when respondent or recipient membership is inactive, regardless of stored grant. Preserve respondent ownership/history. Rejoining does not resurrect a revoked grant. |
| Facilitator reassignment/revocation | Former assignment loses access immediately; new assignment does not inherit old consent automatically. Require renewed participant sharing if the recipient class changes. Assignment-at-grant or recipient-set provenance must make this detectable. |
| Move response to another cohort/group | Revoke old grants; verify new context; new participant consent. Never mutate scope silently on an enrollment pointer update. |
| Cohort completion | Owner remains; recommended nonowner grants expire at cohort completion. Continued follow-up needs a new time-limited participant grant. Owner decision required. |
| Version transition/publish-forward | No grant copied to a new version/definition or archived snapshot. Old authorized revision expires/revokes according to approved lifecycle; archived bodies stay private by default. Require explicit consent for any historical sharing. |
| Account deletion/disable | Fail closed for recipients and facilitators; follow separately approved retention/deletion rules without erasing consent audit prematurely. |
| Lost share/revoke receipt | Do not claim success; reread authoritative grant revision before retry. Use an idempotency key and compare-and-set grant revision. |

**Proposed policy:** immediate revocation means future server-authorized access. Previously downloaded CSVs, screenshots, copied text and already-issued signed URLs cannot be recalled. For any future shared attachments, use mediated short-lived signing after fresh consent checks; choose TTL and explain residual exposure. Do not imply revocation erases recipient copies.

## Application and RLS enforcement

**Proposed policy:** authenticate first; verify owner or fetch fresh grants and context metadata; evaluate raw/result separately before answer queries. The consent check must cover actor, timestamp, unrevoked grant, shared revision, audience and exact binding. Require active respondent/recipient membership and current facilitator assignment; do not accept client-supplied proof. Query only authorized resource IDs and minimal columns. No shared global permission or answer cache.

**Proposed policy:** RLS should enforce the same predicate on underlying answer/result tables and grants, with read access to metadata restricted appropriately. Participants may grant/revoke only their own bound resource. Assignment administrators cannot consent on participants' behalf. Any security-definer function needs a pinned search path, narrow grants, validated ownership and audited purpose. Direct REST, archived snapshot, export, embedded-result and service-role server paths must all be considered; service-role bypass requires equivalent application checks, not UI hiding.

**Proposed policy:** operational summaries use separate tables/projections/functions that never materialize private answer bodies to derive a completion label. Deidentified analytics must not expose free text or small groups. Privileged result exceptions, if approved, require a distinct purpose/expiry/audit path and do not become general raw-answer sharing grants.

## Minimal future migration/backfill plan and gates

**Proposed policy:** after approval, design additive context/grant/audit structures and required composite foreign keys/indexes. Validate constraints against synthetic data first; tighten application and RLS together. Do not alter response JSON, canonical ownership, enrollment uniqueness, or legacy pointers. No executable migration is included here.

**Proposed policy:** backfill no sharing grants. All historical `optional`, `required`, leader, administrator, custom and cohort labels stay private unless a separately reviewed durable consent record can be proven. Prefer no binding for ambiguous rows; only verified provenance may create a private candidate binding. Never backfill consent timestamps/actors from enrollment or submission.

**Proposed policy:** phases: owner approves contract → additive schema/RLS reviewed → private-only adapter compatibility tests → synthetic consent/revocation tests → separately authorized staging → tightly bounded pilot → future wider release. Keep facilitator/group feature disabled until every phase passes. Each phase requires proof that owner/history access survives and revoked/private content is denied before reads.

**Requires live verification:** existing deployed grants/RLS, real revocation races and transaction semantics are unknown. Approval of this design does not authorize staging traffic, schema application, or production rollout. See [05](05-STAGING-AND-ROLLOUT-GATES.md).
