# Roadmap and decisions

Preferred architecture: **normalized authoring + fresh authoritative access + compact outline + selected versioned content + separate private state**. Preserve custom LMU/Start Something experiences, canonical enrollment/version history and current editor recovery. Prioritize policy/correctness before shared caching. Packages, a new query library, a schema collapse or connection pooling are conditional options, not prerequisites.

This roadmap is future work only. Relative complexity is qualitative; no estimates of days, cost reduction or latency gains are asserted. Evidence is in [07](07-EVIDENCE-REGISTER.md), contracts in [03](03-DATA-ACCESS-AND-CACHING-STANDARD.md) and delivery alternatives in [05](05-KALEO-COURSE-ARCHITECTURE.md).

## Architecture decisions

| Area | Decision | Main tradeoff |
|---|---|---|
| Authoring source | Keep normalized hierarchy and immutable releases | More internal entities, but preserve FKs, current routes, progress and delivery plans. |
| Creator UX | Simplify default course/module/lesson/content flow; optional advanced pages/layout | Need explicit default/advanced mapping and preservation of meaningful existing pages. |
| Delivery | Replace full-tree task loaders incrementally with explicit DTOs | Multiple small contracts require clear ownership and compatibility tests. |
| Private persistence | Keep canonical participant/course journey and historical artifacts | Cohort-specific response semantics need explicit requirements; do not duplicate enrollment by convenience. |
| Authorization | Consolidate policy contracts with fresh operation checks | Requires resolving role vs effective permission differences before refactoring guards. |
| Caching | Request-level dedupe first; immutable nonpersonal content behind fresh authorization | Fewer cache opportunities for sensitive state; easier revocation/isolation reasoning. |
| Media | Keep private immutable resources; scope signing and derivatives | Signed capabilities retain bounded access until expiry; downloads cannot be undone. |
| Packages | Defer derived manifest/package layer pending selective-read measurements | Avoid early operational overhead; may leave multiple small reads initially. |
| Custom experiences | Keep LMU, Start Something and other native component contracts | Shared-efficiency changes need cross-runtime regression checks, not generic migration. |
| Scaffolding | Remove misleading placeholder destinations from primary tasks or label them clearly | Owner decides product exposure; no removal in this audit. |

## Prioritized backlog

Ratings: impact = user/privacy relevance; confidence = source evidence strength; risk = chance of functional/security migration consequences; complexity = relative implementation scope.

| Priority | Work / evidence | Impact / confidence | Egress/latency or correctness mechanism | Risk / complexity / dependency |
|---|---|---|---|---|
| P0 | Fail closed on authority catalog/override errors F12 | High / high | Prevent incomplete deny snapshot from granting | Medium / small–medium; decide unavailable behavior |
| P0 | Decide/enforce Hub directory and response sharing F11/F21 | High / high behavior evidence | Restrict data reads to intended audience | Medium / medium; owner privacy policy |
| P1 | Resolve scoped creator guard F13/F31 | High / high | Enable intended creator tasks without broad CRM admin authority | High / medium; permission catalog/role decisions |
| P1 | Bounded opt-in cost/UX baseline H01–H05/F29 | High / high need, unknown causes | Establish categories, bytes, frequency and slow task sources | Low operational risk if bounded / medium; explicit later approval |
| P1 | Narrow course/mutation/context DTOs F01/F02 | High / high | Avoid all-course content/answer reads for one task | Medium-high / medium–large; compact requirement semantics |
| P1 | Scope editor reads and reuse selected hierarchy F14 | High / high | Eliminate duplicated full/selected data stages | Medium / medium; preserve recovery/selection |
| P1 | Atomic/retry-safe response/progress/order/release transitions F03/F16/F17 | High / high | Remove partial-success windows and sequential write loops | High / medium–large; schema/transaction design |
| P1 | Preserve native resource associations when duplicating blocks F32 | High creator impact / high | Copy existing links without reupload; prevent broken media/publication | Medium / small–medium; atomic copy/cleanup contract |
| P2 | Resource library SQL filtering/paging and usage aggregation F05 | High / high | Bound global scans; avoid row-cap incorrect usage | Medium / medium; define usage semantics and role scope |
| P2 | Dashboard/results/profile DTOs F08–F10 | High / high | Summary projections, parallel independent reads, lazy artifacts | Medium / medium; historic/legacy result validation |
| P2 | Defer CRM tabs, paginate notes, move filter existence server-side F06/F07 | Medium-high / high | Bound catalogs/ID lists and unrelated detail work | Medium / medium; scoped access and count accuracy |
| P2 | Current-page signing, expiry and media variants F18/F26 | Medium-high / high mechanism, H01 cost unknown | Fewer signing operations; possible smaller Storage transfer | Medium / medium; resource withdrawal and range/cache behavior |
| P2 | Chat body query deltas/read-side provisioning F19/F20 | Medium / high | Smaller repeated DB windows and no render provisioning on normal path | Medium / medium; deletions/ties/history/membership |
| P2 | Save acknowledgement and contextual errors F03/F25/F30 | High / high | Reduce silent cloud-save/progress failures | Medium / medium; local recovery and completion invariants |
| P3 | Plan-supported indexes/region/prefetch/bundle refinements H03–H05 | Unknown measured impact / low–medium | Address verified hotspots only | Variable; approved measured baseline first |

## Phase 1 — Static baseline and separate opt-in measurement

**Prerequisites:** review these reports; confirm intended baseline course; choose directory/response privacy and revocation expectations; explicitly approve any subsequent service/browser activity. The current audit supplies static baseline only.

**Affected systems:** `lib/experiences/builder/performance-measurement.ts`, SDK wrappers, route/task trace plan, billing category review. Existing scripts/tests are sources to inspect, not commands authorized by this audit.

**Complexity:** small for reviewing static findings; medium for bounded measurement coverage. **Risks:** egress incurred by sampling, accidentally logging private payloads or identifiers, attributing inclusive nested counts twice, missing proxy/Auth/media costs.

**Proposed bounded sampling:** a few consenting/test-account sessions for dashboard → baseline outline → one lesson → save → next → return, CRM page/detail, resource-library page and result list/detail; fixed maximum sessions/operations, no load testing or media crawling. Record category, status, count, duration and aggregate body bytes only; no answers, tokens, signed URLs or raw headers. Include browser asset/RSC traffic separately from backend SDK categories. Compare anonymous/public vs signed-in, participant vs facilitator and cold vs warm session. Billing breakdown and deployed read-only plans/catalog review are separately approved operations. Region/saturation checks only when evidence warrants them.

**Acceptance:** identify database vs Storage vs other usage and sampling limitations; retain actual baseline distributions with operation counts/conditions; report no percentage savings before comparative evidence. **Test plan:** review instrumentation privacy/coverage with fixture requests before production enablement; cross-check nested operation attribution. **Rollback:** diagnostics flag off and stop sampling; remove temporary capture sink by its retention policy. No behavior-changing optimization required in this phase.

## Phase 2 — Low-risk site-wide efficiency and policy corrections

**Prerequisites:** privacy/authority decisions; Phase 1 approved measurement baseline; define required vs optional panel errors. Security corrections may precede broader performance changes once authorized.

**Affected systems:** `lib/platform/auth.ts`, `authorization.ts`, `effective-access.ts`, `dashboard.ts`, `training-catalog.ts`, `response-library.ts`, `lib/assessment-results.ts`, `lib/admin/wayfinders/data.ts`, `lib/resources/resource-library.ts`, Hub pages and account provider.

**Complexity:** medium, split into small reviewable changes. **Risks:** caching positive access decisions, dropping historical metadata needed for completion, miscounted pagination/usage, profile linking repeated as read-only memoization, incomplete deny state.

**Acceptance:** permission load failure cannot grant; nonmember directory matches agreed policy; result/catalog summaries omit unnecessary answer bodies; CRM/resource pages are bounded and errors are explicit; request-local read reuse preserves fresh action checks; independent reads do not wait needlessly; private data never enters shared cache. **Test plan:** two-user/two-scope fixtures, permission read failures, password rotation, membership revocation, >row-cap library data, pagination/filter errors and historic results/LMU special cases. Approved before/after measurements bound to the same tasks. **Rollback:** feature-switch individual DTO consumers/queries; keep previous reader callable; rollback cache use without changing stored answers or enrollment.

## Phase 3 — Editor workflow prototype and redesign

**Prerequisites:** scoped creator/edit/publish model; approve default implicit page/column behavior and terminology; review visual prototype before application implementation.

**Affected systems:** future HTML prototype; `CourseBuilderWorkspace`, `BuilderBlocks`, customization/layout panels, inline editor/save status, training/version actions and selected workspace data. No prototype produced in this audit.

**Complexity:** medium–large UI/workflow work. **Risks:** hidden advanced settings lose discoverability; unsaved text overwritten; keyboard alternatives removed; published data accidentally editable; scoped creator granted unnecessary admin rights.

**Acceptance:** creator can build teaching/video/resource/reflection lesson, use optional two-column/multipage layout, reorder/copy, preview and publish with clear draft/save/privacy state; no mandatory column setup for normal lesson; existing multipage course preserved. Compact outline plus selected editor data replaces F14 duplication. **Test plan:** creator walkthrough, keyboard/narrow screen/focus review, two-tab CAS/conflicts, failed/offline save and local recovery, publish while editing, scoped creator vs publisher vs unrelated user. **Rollback:** restore previous editor route/component; same normalized storage; retain recovery format compatibility or version it with explicit recovery path.

## Phase 4 — Selective course delivery, safe reuse and atomic transitions

**Prerequisites:** define compact requirement/outline schema; decide course navigation policy, response compatibility and version pinning; Phase 2 authorization errors fixed. Selective reader compared before adopting packages.

**Affected systems:** `participant-runtime.ts`, `data.ts`, section route, course runtime/navigator, response/progress/assessment actions, resource resolver, Companion loaders/updates, release/clone/move/order RPCs if needed.

**Complexity:** large but incremental. **Risks:** omitting requirement gates, audience leakage, stale password access, mismatched pinned versions, losing historical fallback, partial writes, derived package drift if introduced.

**Acceptance:** lesson read excludes unrelated block/response bodies; mutation validates only target plus compact completion context; response save produces a committed receipt and does not reload full curriculum; outline/private progress coherent; latest cursor chat respects deletions/ties; private file renewal is authorized; release failure states are recoverable and explicit. No private state in content cache. **Test plan:** completion consistency, embedded/standalone canonical assessment, legacy result, section move, clone/publish-forward, locked enrollment, removed response history, two cohorts/users, facilitator-only resources, warm-cache revocation, save/finalization race, reorder interruption and release fault injection. Tests and builds would run only in that separately authorized implementation phase. **Rollback:** feature-gated normalized legacy reader retained; preserve same response/enrollment/version IDs; new RPCs additive and reversible in clients; no destructive cleanup until rollout stable. Package decoder/schema rollback if packages approved.

## Phase 5 — Small real Kaleo pilot

**Prerequisites:** actual approved curriculum subset and facilitator/participant requirements; decide self-guided support, cohort lock policy and response audience; Phases 3–4 review passed.

**Affected systems:** Kaleo draft/content/import workflow, current enrollment/offering/cohort plans, reusable template copy, participant/facilitator routes; existing assessments referenced rather than rebuilt.

**Complexity:** medium for bounded content; full 32-week import deferred. **Risks:** imported links/content incomplete, unsupported facilitator-only media, semantic response mapping, unnecessary external asset transfers, accidental publication or follower migration.

**Acceptance:** real selected weeks demonstrate creator → publish → participant save/resume → facilitator approved review; no full 32-week body fetch for one lesson; draft/published/history and locked cohorts remain correct; accessible resources and privacy instructions understood. **Test plan:** content owner review, task-based pilot, return visit and failed-save retry, self-guided vs cohort audience, template copy/provenance and revision/rollback rehearsal. **Rollback:** withdraw pilot offering/entry visibility, return reader to previous implementation; retain pilot answers/history, do not delete enrollments or overwrite an existing course. Publication/curriculum import requires separate authorization.

## Phase 6 — Extend proven standards

**Prerequisites:** pilot/task measurements demonstrate improvement with no privacy/completion regression; agree ownership and shared data-access standard.

**Affected systems:** CRM, Hubs, dashboard/catalog/results, LMU persistence and Start Something/native assessment shared infrastructure, resource/media and operational logs. No generic-builder migration for custom assessments.

**Complexity:** medium per subsystem. **Risks:** broad “shared loader” recreates overfetch, client caches mix viewers, custom autosave/results regressions, claimed savings not sustained as data grows.

**Acceptance:** bounded per-task payloads, explicit error states, acknowledged save/retry, stable history and viewer isolation across all touched paths; documentation describes actual roles/ports/workflows. **Test plan:** subsystem-specific regression and role tests, approved bounded comparison traces, accessibility/task review; run only affected checks and expand when new evidence warrants it. **Rollback:** independently switch back subsystem readers/UI; keep data schema/history compatible. Remove obsolete loaders only after callers and rollback window are verified.

## Open decisions and uncertainty register

| Decision | Owner input needed | What static evidence does / does not establish |
|---|---|---|
| Directory policy | Can any signed-in user see active Hub names, or members/leaders only? | F11 establishes behavior; no external privacy policy examined. |
| Response privacy | Do facilitators see raw answers/results despite participant-only/share-disabled fields? Which assessments are exceptions? | F21 shows mismatch; intent unknown. |
| Creator roles | Distinguish creator, builder, course admin and publisher; account/profile prerequisite? | F13/F31 show dual models and global gate, not agreed role policy. |
| Revocation | Next operation vs immediate active-session UI removal; signed asset capability TTL tolerance? | Fresh server checks exist; downloaded bytes cannot be recalled. |
| Kaleo sequence | Required/optional practices; browse-ahead, late join and self-guided support? | Hub Leader exception exists; Kaleo requirements not inventoried. |
| Release policy | Lock active cohorts? Allow compatible corrections to followers? Handling major changes? | Existing locked/follow-current capabilities F23, not course-specific owner choices. |
| Response compatibility | When must prompt/choice/scoring changes create a new identity? | Current key mapping preserves data mechanically, not semantic equivalence. |
| Package threshold | What measured query/byte/runtime evidence warrants derived artifacts? | Full reads confirmed; packages not automatically superior. |
| Cost/hosting | Pro capacity, region alignment and actual egress category/source? | Warning supplied in brief; billing/services not inspected. |
| Template behavior | Copies sufficient, or explicit versioned library required? | Clone/block copy infrastructure exists; module template management not established. |
| Baseline completeness | Current built course, real content, required resources and unresolved imports? | Local import proposals/runtime support; no current DB or curriculum archive inspection. |

## Stop point

Eight audit Markdown reports are the only deliverables. No fixes, prototype, network calls, Supabase requests, builds, tests, migrations, deployments or application code changes were performed. Subsequent implementation or live verification must be separately authorized after review.
