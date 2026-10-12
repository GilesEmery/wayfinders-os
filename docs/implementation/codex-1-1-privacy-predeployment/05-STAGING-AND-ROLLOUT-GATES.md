# Staging and rollout gates

October 10, 2026. **Proposed policy:** this is a future execution proposal. No staging, production, Supabase or Vercel authorization is implied. The current assignment explicitly prohibits those activities.

## Gate 0 — local evidence

**Verified by isolated test / local static validation:** 93 baseline checks and 55 new cases pass; combined 148 pass, zero failures. TypeScript and diff checks pass. Exact commands, source delta and test isolation are in [04](04-CHANGED-FILES-AND-TESTS.md). Two former mocked route/page checks are now static; no actual route/page executed.

**Verified from code:** sharing is disabled in the current adapter, even for facilitator definitions (`lib/platform/response-library.ts:246`; `lib/platform/response-sharing-policy.ts:25`). Local receipt protection guards discarded LMU state but does not bind/cancel the server queue (`lib/experiences/lmu/storage.ts:110`; `lib/experiences/lmu/persistence.ts:64`).

**Proposed policy — stop/go:** local review can proceed. No deployment recommendation until owner choices and remaining validation gates are resolved. Do not ship a broad dirty working-tree diff; select and review the CODEX 1 plus CODEX 1.1 changes independently of unrelated work. Verify the intended Next version against its repository-local docs before any future integration changes. No migration or feature activation in this release proposal.

## Gate 1 — owner policy and change review

**Proposed policy — OWNER APPROVAL REQUIRED:** record answers in [06](06-OPEN-OWNER-DECISIONS.md), with role/resource/scope and effective date:

- Operational admin progress scope, aggregate reporting rules and individual-result exception policy.
- Signed-in nonmember directory exposure, exact leader/admin exceptions, profile field rules and closed-Hub discoverability.
- Course Creator role mapping, ownership/assignment and separate publish/enrollment/reporting authority.
- Facilitator progress scope and completion/reassignment lifecycle; raw/result consent independence.
- Super Admin override semantics, exceptional access auditing and content scope.
- Durable-sharing design and separate later implementation authorization, if sharing is desired.

**Proposed policy:** owner may choose a security-only private release while leaving sharing/creator feature activation disabled. That still requires accepting the documented blocked nonowner CSV/result workflows and resolving or accepting the Hub directory exposure with a concrete mitigation; silence is not approval. If an essential operational workflow needs nonowner answers, stop until a narrowly approved solution exists. Do not restore convenience with a global role grant.

## Gate 2 — separately authorized synthetic staging

**Requires live verification:** deployed RLS/grants, Auth identity/membership revocation, real CAS and receipts, browser sessions, Storage withdrawal and RPC outcomes cannot be inferred from these source/test results. Request separate staging authorization only after the owner reviews a concrete plan and scopes the project, actor, synthetic namespace, cost cap and allowed operations. Do not use production accounts or enrollments.

**Proposed policy:** fixture budget: eight synthetic authenticated identities (respondent, exact facilitator, same-cohort member, unrelated member, Hub leader, Course Creator, Admin, Super Admin), plus anonymous; two test courses/versions; two cohorts and one subgroup; three minimal Hubs for open/approval/invite modes; at most six generic responses and one synthetic LMU assessment with ten section records. Use nonsense answers, synthetic emails under an approved test domain, stable test-only prefixes, and a recorded fixture manifest. No real participant text, names, private course content or secrets in logs/screenshots. Use a small non-sensitive resource at most 512 KiB; no video uploads.

**Proposed activity estimate and hard operational cap:** approximately 60 sequential browser/action scenarios at 5–8 backend requests each, plus 100 setup/cleanup requests: **400–580 expected Supabase HTTP/SDK requests**. Allow headroom for auth/session checks and middleware: stop at **1,000 total requests**, **25 MiB total transfer**, **100 mutation requests**, **8 Auth identities**, **500 synthetic rows total**, **1 uploaded object**, or **60 minutes**, whichever occurs first. Count Auth, REST/RPC, Storage signing/download and cleanup; include unsuccessful/retried requests. No Realtime subscriptions, load tests, concurrency benchmark, automated polling or unlimited retries. Each large read must use an explicit synthetic scope and limit at most 50 rows. Fixture creation counts toward mutation/row budgets.

**Proposed policy:** counters must be observable in an approved browser network log/test proxy or project metrics before starting; if counts or byte usage cannot be measured, do not begin. Reserve 100 requests/20 mutations within the cap for cleanup; stop new scenarios at 900 requests/80 mutations. Actual app fan-out may exceed estimates. Stop earlier if unrelated rows appear, credentials/project identity are uncertain, or a request approaches production. Cleanup only fixture-manifest IDs, never bulk-delete by partial name. Retain unresolved fixture IDs for an approved later cleanup if the cap is exhausted.

| Sequential staging scenario | Required outcome / stop condition |
| --- | --- |
| Verify project/fixtures and deployed grants/RLS with approved actor | Test project positively identified; no production data. Direct authenticated/anonymous access cannot bypass private application guards. Service-role server paths enforce ownership before bodies. |
| Full 27 role/level body matrix plus independent raw/result scopes | Current adapter: nonowner denies for every level; owner works. Future sharing model is tested only in a separately authorized implementation; do not fabricate grants in today's schema. |
| Role deny/revoke and identity failure | Revoked assignment/permission is effective on next request; failed reads never become successful empty grants. Confirm existing Super Admin exception matches approved policy. |
| Owner-admin parity and nonowner operations | Owner result pages, CSV and Journey work; nonowner operational progress remains, private bodies blocked. Essential nonowner workflows either use an approved projection or remain visibly blocked. |
| Hub modes/directory/profile and direct URLs | Anonymous/nonmember/pending/invited/withdrawn members match approved policy; names/contact absent from denied network payloads, not merely hidden. Stop if current directory exposure lacks an accepted mitigation. |
| Creator create/edit/preview/publish/enroll/progress | Owned/assigned scope works only after approved scoped patch; another course/org denies. Draft preview contains no real answers. No creator CRM/Hub escalation. Current global gates are a known blocked case. |
| Generic two-tab CAS, duplicate first insert/submit, lost receipt, partial progress | Only one authorized current revision commits; no false save confirmation. After ambiguous receipt, reread authoritative state before retry. Inputs/recovery preserved. |
| LMU debounce/finalize/reset, disconnect and navigation | Pending until real acknowledgement; drafts survive failure. Account switch, assessment switch, reload, tab race and delayed receipt do not overwrite another identity or resurrect reset server state. Unload warning checked in real browser, not assumed reliable flushing. |
| Resource copy/signing and withdrawal | Copied independent associations reference approved course/library assets; cross-course private object denies. Withdrawal stops new signing; document issued URL TTL and residual downloads. Cleanup failure is visible and leaves inspectable state. |
| Publication ambiguity/continuity/activation | Inspect authoritative version status after any lost receipt. Use synthetic version only; no published participant course mutated. Partial outcomes recorded rather than retried blindly. |

**Proposed stop/go:** any unauthorized private read, cross-identity save, lost acknowledged data, silent partial outcome, mis-scoped directory/contact query, cap breach or failed essential operational workflow stops verification. Preserve non-sensitive evidence and fix/review locally before separately reauthorizing continuation. Do not retry until state is known. A passed gate requires a dated record of identities, exact cases, resource scope, actual activity and unresolved limits.

## Gate 3 — later production proposal

**Proposed policy — separate authorization required:** prepare a reviewed, bounded commit and release artifact; retain sharing disabled. Use a small staff/synthetic pilot or a designated approved subset; do not seed response grants or backfill historical consent. Monitor authorization failures, denied bodies, save receipt failures and operational page errors with redacted IDs; never log answer payloads. No new metrics integration is authorized here.

**Proposed policy:** perform one minimal smoke pass for owner read/save/result, owner-admin export, unrelated-admin denial, operational progress, approved Hub behavior and course preview. Use only separately approved accounts/records; cap activity in the deployment authorization. Confirm privacy-copy accuracy and support instructions for “saved response, progress unconfirmed” and unknown publication status before widening rollout.

**Proposed rollback triggers:** any unauthorized read/export, private payload in an aggregate/directory, cross-account write, acknowledged save missing on reread, repeated silent partial completion, critical admin operational regression, or sustained error rate above the pre-agreed baseline (suggested >2% failed save/authorization operations over 15 minutes, with any privacy incident triggering immediate stop). Agree on measurement and owner/operator before release; if telemetry cannot establish it, do not claim monitoring is adequate.

**Proposed rollback:** disable affected entry points/sharing, restrict to owner-only and stop writes if integrity is uncertain. Roll back application code only to a reviewed version that preserves privacy guards; blindly reverting CODEX 1 would restore known private-access risk. Record server state before retrying saves/publication. No schema rollback is expected in this iteration because no schema change is proposed for this patch.

**Proposed policy:** app rollback cannot undo submitted responses, already-running requests, published versions/activation, issued signed URLs, downloaded exports, screenshots or disclosed text. It does not revoke database grants or delete persisted data automatically. Any corrective data operation, grant change, migration or published-content repair needs a separate concrete review and authorization. Keep incident evidence and support recovery bounded; never erase participant history to make rollout look successful.

## Risk register

| Risk / evidence classification | Code evidence | Current mitigation / remaining gate |
| --- | --- | --- |
| Verified from code: no durable sharing authority | `lib/platform/response-library.ts:249` | Sharing disabled; design approval and future schema/RLS work required to enable. |
| Verified from code: nonmember directory names remain | `app/hubs/[hubSlug]/page.tsx:39` | Owner decision + targeted query gate or explicit accepted mitigation before rollout. |
| Verified from code: creator entry/policy mismatch | `lib/experiences/admin/block-mutations.ts:87`; `lib/platform/effective-access-policy.ts:51` | No escalation; scoped patch separately reviewed if needed. |
| Verified from code: old LMU request can remain in network queue despite local reset | `lib/experiences/lmu/persistence.ts:64`; `lib/experiences/lmu/storage.ts:110` | Local stale receipt rejected; account/context binding and cross-tab server outcomes require verification and potentially a narrow follow-up fix. |
| Verified from code: some duplicate cleanup receipts ignored | `lib/experiences/admin/block-mutations.ts:422` | Do not assume atomic copy; inspect synthetic failure; local follow-up required if acceptance depends on reliable cleanup. |
| Verified from code: publish/reorder follow-up multi-step | `lib/experiences/admin/version-release.ts:47`, `:56`; `lib/experiences/admin/block-mutations.ts:142` | Error messages truthful; real partial-state/recovery tests before relying on atomicity. |
| Verified from code: historical privacy labels do not prove consent | `supabase/migrations/20260914190032_reconcile_a2_themes_privacy_delivery_plans.sql:64` | Default private; no consent backfill. |
| Requires live verification: deployed grants/RLS may differ from repository | `lib/platform/response-library.ts:2` uses server client; application checks do not prove DB policy | Separate staging project/role tests, direct access coverage. |
| Requires live verification: unload/signing/server atomicity | `components/experiences/lmu/LMUPersistenceHydrator.tsx:16`; `lib/experiences/admin/preview.ts:44` | Real bounded browser/storage tests; no offline certification. |

**Proposed policy:** the next authorized action is owner review of [06](06-OPEN-OWNER-DECISIONS.md) and the local diff. Staging or production work must follow a new, explicit authorization; this document does not grant it.
