# Data-access and caching standard

The preferred standard is **fresh authorization, minimum task payload, explicitly scoped reuse**. Start with request-level deduplication and selective queries. Shared caching is suitable for nonpersonal immutable published content only when every delivery path enforces current access before returning it. Private answers, CRM, notes, password decisions and operational authority must never enter a public cache.

This is a proposed standard, not implemented configuration. F01–F04/F11–F12/F18–F23/F31 in [07](07-EVIDENCE-REGISTER.md) establish why it is needed.

## Data/viewer matrix

| Classification / data | Allowed viewers | Minimum payload and fetch timing | Reuse/cache scope | Invalidation and revocation |
|---|---|---|---|---|
| Public landing/catalog copy | Anonymous and signed-in users | Public titles, descriptions, safe card derivative, route; fetch with discovery page | Shared public cache/ISR eligible after root account dependency separated | Publication, visibility, lifecycle, card/theme updates invalidate. Never attach account/enrollment data to cached record. |
| Published course navigation, restricted | Currently authorized participant/facilitator; authorized creator preview separately | Keys, titles, order, visibility/requirements/completion metadata, version ID; on course entry | Server content cache by immutable version; cohort overlay separately keyed/revisioned; browser session outline | Fresh course/password/lifecycle check before delivery; content invalidation on withdrawal, delivery-plan change and version change. Do not cache “allowed.” |
| Published lesson content, restricted | Authorized viewer of that lesson/audience | Current lesson/section blocks/layout, response contract schema, resource IDs; on lesson open | Version+lesson+schema-version server content cache behind authorization; permitted audience must be represented | Withdrawal and renderer/schema changes invalidate; filter audience before serialization. No signed URLs or own answers in shared lesson content. |
| Draft authoring | Scoped authorized creator; publishers/admins as decided | Outline plus selected draft block/settings/revision; editor open | Request-local, optionally user-scoped editor memory; no shared public cache | Save changes receipt/revision; publication makes old editor read-only; permissions rechecked on every save. |
| Enrollment, entitlement, assignment, role and permission snapshot | Current user where needed; authorized managers for scoped targets | IDs, active status, dates, pinned version and necessary capability flags | Request-local only initially; sensitive authorization state | Fresh at action, API, polling and protected navigation boundaries; fail closed on read errors. Revocation must affect next protected operation. |
| Password credentials / grant validity | Trusted server; managing admin allowed to rotate | Revision/hash only for appropriate server operation; never browser hash | Request-local credential read; signed grant client cookie is separately verified capability | Credential revision rotates; next request rejects old grant. Management bypass verified freshly; do not place secrets/grants in shared cache. |
| Responses and results, private | Owner; reviewer only under explicit response-sharing policy and scope | Summary metadata for lists; one answer/artifact for detail; history projection on demand | Private request/client memory keyed to user, enrollment, version, activity; no public CDN | Successful save/finalize invalidates relevant activity/result/outline summaries; logout/user change clears; revoked reviewer access rejects future fetch. |
| Progress/resume | Owner, scoped facilitator summary where approved | Compact statuses/current location/required summary; enter and after transition | User+enrollment+version+delivery revision in memory; request-local server | Visit/complete/reset/publish-forward invalidates; never infer successful persistence from optimistic UI alone. |
| Personal notes | Owner only | Current location note/summary, paginated history on request | Owner-session memory and acknowledged browser recovery as appropriate | Save/delete/logout; admin preview must not load notes. Facilitator role does not imply access. |
| CRM profile/notes/relationships | Authorized global admin; limited Hub profile projection for authorized scope | Selected person tab, bounded page/history; no unrelated full catalogs | No shared/public cache; request-local and short user-scoped UI memory only if needed | Mutation receipts refresh affected tab; role/target membership checks repeat on fetch/write. |
| Hub/cohort member directory | Owner-approved audience: membership/leadership default recommendation pending F11 | Name/role/avatar projection, paginated; only when directory opened | Scope+viewer-session memory; no public cache until directory policy explicitly allows it | Membership/status/role changes invalidate; reject out-of-scope future reads. Profile/response links have additional permissions. |
| Facilitator-only resources/notes | Current scoped facilitator/publisher as approved | IDs + safe metadata, only relevant week | Restricted nonpersonal content cache with audience partition; fresh viewer check before signing | Role/membership loss rejects new grants; already signed file URL has bounded residual validity. |
| Resource metadata | Authorized catalog editor or authorized reader through content association | ID/title/type/size/immutable path; requested set only | Request dedupe; versioned restricted metadata may be server-cached | Resource withdrawal/association change; do not equate archived availability with public access. |
| Signed file URLs | Authorized current viewer | Current display URLs, download only on demand | User-session ephemeral cache, expiry-aware; keep outside shared DTO/cache | Refresh before expiry after access check. Revocation cannot erase bytes already downloaded; URL remains usable until expiry unless object/access mechanism changes. |
| Chat/calls/live delivery settings | Current authorized delivery-cohort member with audience permission | Current-location live module, delta bodies and bounded reconciliation IDs | No-store authenticated endpoint; in-memory window only | Membership/password/lifecycle/visibility rechecked each poll and post; clear on denied response/logout. |
| Audit / imports / operational logs | Authorized admin/operators | Bounded selected event/import projection, no credential/body logging | No public cache; paginated reads | Retention and operational policy; audit insert failure must not masquerade as a completed protected operation. |

## Server contracts

1. **Resolve identity once per server render** using request-scoped primitive-key memoization. Keep cookie refresh in proxy and independently authenticate each action/API request. Do not memoize mutation results or `ensurePlatformProfile` writes as if they were pure reads (F04/F08).
2. **Authorize the exact task:** viewer identity, participant ownership, experience lifecycle, pinned published version, active enrollment/entitlement/offering/membership, explicit cohort context, delivery visibility, password revision, audience and permission/deny precedence. No client-supplied participant ID proves ownership (F11–F13/F21–F23).
3. **Return a small DTO:** course summary, compact outline, current content, target mutation contract or selected private artifact. Avoid sending unused metadata, draft content, answer bodies, credential hashes, all-version snapshots or hidden resources.
4. **Reuse trusted context only internally within that operation.** Pass it to progress/assessment helpers without refetching; never accept it from a server-action parameter supplied by the browser. Existing internal helper pattern is useful (F02–F03).
5. **Inspect every result error.** Distinguish unavailable from empty. Permission/override failure must fail closed; optional nonsecurity panels can show a local error without preventing the main page (F07/F12).
6. **Separate current status from immutable content.** Public visibility is not open admission; enrollment is not a password grant; facilitator authority is not universal CRM/notes access (F21–F23/F31).

## Next.js version-specific guidance

Local version is Next 16.3.6 (`package.json:46`). `next.config.ts` does not enable `cacheComponents`. Local guide `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:1–45` describes the applicable model: fetch is not cached by default and explicit function/query caching is available. `.../03-api-reference/01-directives/use-cache.md:28–53` requires enabling Cache Components for `use cache`. Do not introduce that directive as a drop-in without reviewing the migration consequences. No framework change was made.

Use request-local memoization first, with primitive user/version/location keys. Cross-request content caching may use the current framework-supported cache mechanism with explicit tags/revalidation after a design review. A privileged Supabase SDK call does not automatically provide the desired cache policy. Prove cache identity and scope with different users and cohorts; do not infer safety from a response header.

A personalized route must not use `private, s-maxage` as a blanket protection. Private handlers should keep `private, no-store` where appropriate; cohort response endpoint already does (`app/api/cohorts/[cohortId]/members/[participantId]/responses/route.ts:4–15`). Shared CDN objects must contain genuinely public data only. Restricted content caching belongs behind an authorization-controlled server path unless a dedicated edge capability design is approved.

## Invalidation events

| Event | Required effect |
|---|---|
| Draft edit/reorder/move | Update revision/selected content; invalidate draft outline when titles/order/hierarchy change; preserve unsaved browser recovery. |
| Publish | Atomically validate/pin immutable curriculum and compatible response contracts; switch current-version pointer; invalidate catalog/current pointer; refresh affected follower private state and delivery overlays. Existing locked enrollment content remains addressable (F17/F23). |
| Enrollment/entitlement/offering change | Next request reevaluates access/version/context; refresh own dashboard and course entries; clear obsolete private client snapshots. |
| Password rotate/remove | Fresh credential revision invalidates grants; clear current positive gate state. Removing protection does not grant enrollment. |
| Role/permission/deny override change | No reusable positive cross-request authorization; next read/write/poll rechecks. Clear authorized panel state on denial. F12 failure handling is prerequisite. |
| Membership/delivery-plan change | Invalidate directory, outline overlay, live modules and version-context links. Retain canonical personal work; no duplicate enrollment creation. |
| Response save/finalize | Receipt provides committed answer revision/status; update only selected response and relevant progress/results summaries. Full course reload unnecessary. |
| Completion/retake/reset | Recompute summary, canonical history and results; preserve finalized historical artifact according to retake policy. |
| Resource withdraw/replace | New immutable object/reference or explicit content revision; expire cached metadata and new signing eligibility. Do not mutate file bytes under an immutable published identifier silently. |
| Logout/user switch | Clear private response/note/CRM/chat caches and queued viewer-specific operations; browser draft privacy needs account-scoped recovery behavior. |

## Browser reuse and prefetch

Use simple local task state first. Existing cursor chat and outline/box patterns demonstrate that a new caching library is not a prerequisite (F19/F10). Consider SWR/TanStack Query only if repeated interactive panels need consistent dedupe, retries, invalidation and cache isolation that local patterns cannot maintain; no dependency is proposed for this audit.

Prefetch compact outline and at most a likely next authorized lesson after current content is useful. Do not prefetch all 32 weeks, private answer history or large file bytes. Default Link behavior and actual RSC transfers need H05 verification. Disabling all prefetch can harm navigation, so change based on observed request paths and intent. Draft editor navigation should prioritize reliable saves and avoid repeated full-tree loads (F14–F15).

## Acceptance gates for later implementation

Two different users and cohorts cannot receive each other's answers, notes, private CRM, grant decisions or facilitator assets. Warm content cache followed by password/role/membership revocation still rejects the next protected read/write. Access data failure produces an unavailable/denied result, not implicit role permission. Long sessions can renew authorized signed URLs without losing PDF position unnecessarily. Save receipts, conflict detection and version history survive interrupted navigation and retries. These checks are proposed future work; none was executed.
