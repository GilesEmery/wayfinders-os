# PurposeOS comprehensive assessment

October 10, 2026 · Offline, static, read-only application audit.

PurposeOS has a substantial foundation: canonical enrollments, version history, explicit runtime registries, server-side authorization, private media, and an editor with inline saving and recovery. Its main architectural weakness is **loading broad contexts for narrow tasks**. A single lesson location still brings the full course tree and response context into the server, and a small response mutation uses much of that same structure. Platform pages compound this with broad dashboard, saved-work, resource-library and result-summary loaders.

**Preferred direction:** keep normalized authoring and existing custom assessments; simplify the creator interface; deliver compact course navigation with on-demand versioned lesson content and separately authorized private state. Start with narrow reads and request-level reuse. Introduce immutable delivery packages only if later measurements justify their additional publish/invalidation responsibilities.

The reported egress warning establishes overage, not causation. No live health score, request totals, latency, deployed policy state, billing attribution or percentage improvement can be established by this audit. Findings and hypotheses are separated in [07-EVIDENCE-REGISTER.md](07-EVIDENCE-REGISTER.md).

## Top 10 risks

| Rank | Risk | Evidence / status | Consequence |
|---|---|---|---|
| 1 | Permission override errors silently treated as absence | F12; confirmed error handling, inferred failure consequence | A deny may disappear during partial data failure. |
| 2 | Hub names visible to signed-in nonmembers | F11; confirmed behavior, policy decision pending | Directory privacy may exceed intended scope. |
| 3 | Participant-only response metadata vs facilitator review | F21; confirmed mismatch | Sharing contract is not explicit or uniformly enforced. |
| 4 | Full-course reads for one section/save | F01–F02; confirmed | Work grows with course size rather than current learner task. |
| 5 | Resource library scans all curriculum usage | F05; confirmed | Large transfers and incomplete results under service row caps. |
| 6 | Nonatomic reorder and multi-step progress writes | F03, F16; confirmed | Partial state and uncertain retry outcomes. |
| 7 | Post-publication continuity/activation can fail | F17; confirmed | Course published while delivery settings remain incomplete. |
| 8 | Scoped creator paths blocked by global admin gate | F13; confirmed | Unnecessary admin authority may become an operational workaround. |
| 9 | Cloud-save feedback inconsistent across runtimes | F03, F30; confirmed | Participant may mistake scheduled save for acknowledged persistence. |
| 10 | Duplicating uploaded media loses resource links | F32; confirmed | Copied PDFs/images can be incomplete and PDF publication blocked. |

## Top 10 opportunities

| Rank | Opportunity | Evidence | Mechanism / tradeoff |
|---|---|---|---|
| 1 | Explicit authorized context + narrow mutation target | F01–F02 | Reduce read scope while retaining authoritative checks. |
| 2 | Compact navigation + current lesson reads | F01, F23 | Avoid loading every week; preserve requirement and history logic. |
| 3 | Fail-closed authority loading and explicit privacy policies | F11–F13, F21, F31 | Correctness first; some UI may show temporary unavailable states. |
| 4 | Request-level identity/access reuse | F04, F31 | Remove repeated work within a render; never persist positive grants globally. |
| 5 | Paginated resource usage and deferred CRM tabs | F05–F07 | Bound transfer; new aggregation/query contracts need tests. |
| 6 | Summary-only result/history and own saved-work outline | F08–F10 | Avoid transferring answers until asked; retain compatibility checks. |
| 7 | Reuse existing editor outline/autosave; hide advanced hierarchy | F14–F15 | Improve creator clarity without schema migration. |
| 8 | Atomic, idempotent progress/order operations | F03, F16–F17 | Fewer multi-call failure windows; database changes require careful migration. |
| 9 | Current-page media/signing, derivatives, expiry refresh | F18, F26 | Reduce signing work and possible Storage bytes; preserve privacy. |
| 10 | Small Kaleo pilot plus existing opt-in diagnostics | F23, F29 | Validate real requirements before committing to 32-week delivery changes. |

## Course architecture decision

Retain Experience → Version → Module → Lesson → Section → Layout → Column → Block in storage. Expose **Course → Week/Module → Lesson → Content** as the default creator vocabulary. An ordinary lesson starts with one implicit content page and one column; multiple pages and advanced layouts remain available. The existing Hub Leader content demonstrates that multiple pages can be instructionally useful; flattening them destructively would lose meaningful boundaries. This is interface simplification, not a mandate to collapse existing data.

For delivery, prefer a hybrid read model implemented initially through selective normalized queries. Cache only immutable, nonpersonal content behind a fresh access decision. Keep cohort visibility, password grants, enrollment/version selection, answers, notes and progress outside shared caches. The tradeoff is maintaining explicit read contracts and completion metadata rather than relying on the convenience of one full tree.

Life Mapping U and Start Something stay in their existing custom experiences. Personal Impact Statement, Circle of Influence, Activate Your Purpose, Wayfinders Ethos and Launching Your Wayfinders Hub are inventoried as existing native/custom-component experiences; none is assumed to require migration.

## Decisions needed from owner

1. **Privacy and authority:** who may see Hub directories and each response type? Do facilitator privileges override participant-only fields? What can a scoped creator edit, preview and publish without global admin access?
2. **Kaleo learning/version policy:** validate actual content and facilitator needs, sequential vs browse-ahead navigation, optional practices, self-guided mode, and whether active cohort enrollments should stay locked to a release.
3. **Optimization gate:** approve a separate bounded measurement phase and UI prototype before delivery-package or schema changes. Define cost/UX acceptance criteria and decide Pro capacity using billing evidence.

## Reports

- [01-FULL-SITE-ASSESSMENT.md](01-FULL-SITE-ASSESSMENT.md): subsystem and route map, UX and maintainability.
- [02-SUPABASE-AND-PERFORMANCE.md](02-SUPABASE-AND-PERFORMANCE.md): data paths, schema, egress hypotheses.
- [03-DATA-ACCESS-AND-CACHING-STANDARD.md](03-DATA-ACCESS-AND-CACHING-STANDARD.md): permissions, scope, invalidation and revocation.
- [04-COURSE-BUILDER-ASSESSMENT.md](04-COURSE-BUILDER-ASSESSMENT.md): hierarchy, workflows and alternatives.
- [05-KALEO-COURSE-ARCHITECTURE.md](05-KALEO-COURSE-ARCHITECTURE.md): delivery options and full participant flow.
- [06-ROADMAP-AND-DECISIONS.md](06-ROADMAP-AND-DECISIONS.md): phased backlog, acceptance and rollback.
- [07-EVIDENCE-REGISTER.md](07-EVIDENCE-REGISTER.md): classifications and exact source references.

No network calls, Supabase requests, application builds, tests, migrations, deployments or application code changes were performed. Reports are the only new files. This assessment stops at review; it does not implement fixes.
