# Residual risks and deferred features

## Release gates, not certified offline

| Outstanding item | Required disposition |
| --- | --- |
| Deployed schema/grants/RLS/Auth/counts/Storage unknown | Owner verifies report 03; incompatible/missing schema or exposed private table is NO-GO. Do not auto-apply every checked-in migration. |
| Production build unrun | Successful exact-artifact build in owner-approved environment required. Typecheck/lint are insufficient. |
| Browser/integration paths unrun | Bounded synthetic report 04 gate must pass: unauthorized content, wrong-account write, false acknowledgement or missing acknowledged value stops release. |
| Exact-count guard availability | Unknown/truncated count rejects; catalogs and large operational datasets can become unavailable rather than misleading. Confirm real counts and current scale. If essential reporting is unavailable, defer push or fix correctly; do not remove completeness guards. |
| Owner residual-risk acceptance | Record explicit private-only scope and accepted risks below. No blanket production certification from 264 checks. |

## Remaining limitations requiring acceptance and bounded validation

- Generic response + progress are separate writes. A response may save while progress fails; UI reports partial success. Reload authoritative state before retry, preserve text. CAS guards stale same-row writes and duplicate insert but is not a complete transaction/idempotency protocol.
- LMU assessment header now prevents a delayed request being applied to another current assessment/account. Single-client queues and local generation guards are not cross-tab server revision locks. Draft/finalize/reset still perform multiple writes. Timeout/invalid receipt does not imply rollback; blocked session must reload and inspect. Concurrent requests on the same assessment can still race. If synthetic gate shows silent loss/false success, NO-GO; durable transactional/idempotent design remains separate work.
- Local LMU drafts use device storage, not guaranteed storage durability/account isolation on a shared device. Generic unsaved text survives only mounted form, with unload warning; internal navigation and account switch recovery need real-browser validation. Do not use shared browser profiles for private assessments; verify account-switch UI before approving release.
- Discard/clear invalidates local acknowledgements but cannot undo already sent server writes. Module reset goes through ordered delete; completed server assessments refuse reset. Ambiguous reset requires authoritative reload, not repeated delete. Copy user draft before reload; do not delete data to reconcile uncertainty.
- Block/resource copying and order cleanup are multi-step. Cleanup returned errors report uncertainty; transport failures abort without success. New partial draft copy may remain; identify and inspect it, preserving source and physical object. Reorder can leave temporary positions on failure.
- Publication RPC is atomic within its contract, but Companion continuity/activation afterward is not. An error can mean published-but-partial or receipt unknown. Inspect version status/current pointer before any retry; never blindly publish/reset pointers.
- Storage signing grants a bearer URL for 15 minutes. Revocation prevents future signing only when the caller's current runtime authorization fails; it cannot recall already issued URLs/downloads. Historical archived resources can still serve authorized history; newly selecting archived resources remains denied. Catalog cards are an existing authorized public/discovery asset surface; do not attach private response artifacts as card images.
- General authoring/admin helpers are not a complete effective-permission rewrite. Global admin guards intentionally constrain scoped creators; no private-response override is implemented. Validate actual authorized admin operations and revocation, not an imaginary creator workflow.
- Global CRM has separately privileged contact/note workflows and older best-effort audit/error behavior; CODEX 1 does not recast all CRM as anonymous metadata. New operational reports/exports are checked and body-free. No fresh grant was added to legacy CRM.

## Deferred features (excluded from release)

Facilitator/group private sharing and durable consent/revision/recipient binding; purpose-specific time-limited audited private exceptions; owned/assigned Course Creator entry and distinct publish/enroll/report contract; canonical cohort-attributed scoped progress; interpreted-result/free-text/small-group analytics; closed-Hub description/discoverability policy; server transactions/cross-tab ordering; pagination/egress optimizations; course-builder redesign. No approval to activate these is inferred from D1–D8 or the owner push. CODEX 2 and 3 resume separately on Monday.

No new migration, remote schema change, data cleanup, backfill or grant is required for this private-only patch. Discovery of deployed drift changes that conclusion and requires a concrete separately reviewed remedy before push.
