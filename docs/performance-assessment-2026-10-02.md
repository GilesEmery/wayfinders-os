# Wayfinders performance assessment and implementation plan

Assessment date: October 2, 2026.

The strongest opportunity is reducing repeated work between the application and Supabase. Course navigation, assessment saves, companion updates, and some administrative screens load substantially more data than they need. The sampled database reads are generally fast inside Postgres, so reducing network round trips, fetching less content, and reusing published curriculum should come before purchasing more database capacity.

This is an assessment and proposed implementation plan. No application behavior, database schema, project configuration, or deployment was changed for this assessment.

## Scope and evidence

Reviewed the repository's route and component inventory, shared authentication and access checks, participant course runtime, course structure and resource loaders, dashboard and training catalog, assessments and progress mutations, companion and chat loading, saved response library, Life Mapping U persistence and media, administrative resource and user loaders, and deployment configuration. Repository searches covered 475 files under app, lib, and components; the deeper review focused on shared functions that affect many routes. This is not a claim that every source line was individually audited.

Read the installed Next.js 16.3.6 documentation for CSS, caching, and lazy loading, and consulted official Supabase documentation. Inspected the connected Supabase project's performance advisors, indexes, table statistics, accumulated query statistics, and one read-only course-content query plan.

The database is healthy and located in us-east-1. Table statistics estimate approximately 8,916 content blocks, 3,167 sections, 3,169 layout columns, and 823 participants. These are estimates, not exact business totals. One published Hub Leader Cohort version contains 67 sections and 199 content blocks; its content JSON alone occupies approximately 96 KB before transport compression and other row fields.

Accumulated Postgres query statistics show:

| Read pattern | Calls | Mean database execution |
| --- | ---: | ---: |
| Content blocks by lesson IDs | 8,906 | 4.29 ms |
| Sections by version | 8,911 | 1.08 ms |
| Layout columns by layout IDs | 8,909 | 0.72 ms |
| Layouts by section IDs | 8,909 | 0.57 ms |
| Lessons by version | 8,911 | 0.40 ms |
| Modules by version | 8,911 | 0.33 ms |

These statistics were collected since August 31, 2026 and mix production, development, administrative, and other requests. They do not measure page load time, HTTP latency, concurrent-user behavior, or the number of queries in a particular navigation. A representative SELECT plan used existing lesson/version indexes, returned 199 blocks, and executed in approximately 17.8 ms in that sample; it was not an end-to-end route benchmark.

No authenticated production browser benchmark was performed. There are no verified current route-level JavaScript transfer budgets, Core Web Vitals, or request latency percentiles. Existing local build output was inspected only as supporting context and may be stale. The Vercel project connector failed due to an argument-schema mismatch, so the live function region and runtime configuration remain unverified.

## Prioritized work

| Priority | Change | Expected benefit | Relative effort |
| --- | --- | --- | --- |
| P0 | Establish route and database request measurements | Makes the improvement measurable and prevents optimizing the wrong layer | Small |
| P1 | Remove redundant course loads from assessment cards and mutations | Fewer Supabase reads and Storage requests during launches, saves, and completion | Small to medium |
| P1 | Replace whole-page companion polling with targeted updates | Removes recurring full-course work while a learner is reading | Medium |
| P1 | Load current-page content separately from the course outline | Largest structural reduction in course read volume | Large |
| P1 | Batch resource lookup and URL signing | Faster media-heavy course pages and catalogs | Medium |
| P1 | Deduplicate request identity, authorization, and access reads | Faster common route paths with the same access decisions | Medium |
| P2 | Cache published curriculum and shared catalog metadata | Faster repeated navigation and less database traffic | Medium |
| P2 | Split dashboard loaders and defer secondary panels | Earlier useful dashboard and profile content | Medium |
| P2 | Move resource-library filtering, usage lookup, and pagination into SQL | Better admin load times and accurate behavior as data grows | Medium to large |
| P2 | Defer heavy browser libraries and split route styles | Less browser transfer, parsing, and execution | Medium |
| P3 | Resolve measured index issues and slow administrative RPCs | Lower write overhead and improved scaling | Medium |

Benefit rankings are based on code structure and database evidence. They are hypotheses until route measurements confirm the size of the improvement.

## Course loading and assessment saves

`lib/experiences/builder/participant-runtime.ts` loads identity and authorization, access rows, the published version, the entire curriculum, delivery overrides, progress, all response definitions and participant responses for that curriculum, appearance assets, all course assets, and companion data. Several independent stages run sequentially. The course section route uses this loader even though it displays one page.

`lib/experiences/builder/data.ts` loads the entire version in eight database requests across three dependency stages. It re-reads the experience and version already fetched by the runtime. It then assembles the tree with nested array filtering. That CPU work is a secondary opportunity after reducing the network work.

`components/experiences/builder/PrebuiltAssessmentBlock.tsx` calls `resolveParticipantCourse` again to obtain the parent enrollment and participant. Every visible prebuilt card can repeat the surrounding page's full course load. Pass the already-authorized parent identifiers and batched assessment statuses from the page instead. Resolve shared assessment display metadata once per render.

Assessment and response mutations also call the full runtime. For example, `ethos-assessment-mutations.ts` resolves the course, then `recordParticipantSectionVisit` resolves it again through `progress-mutations.ts`. Finalization can add another resolution. That means a small answer update can load curriculum, assets, and companion history repeatedly.

Introduce three explicit data paths:

1. An authorized course context containing identity, access, pinned version, cohort context, and requirement-bypass decision.
2. A lightweight outline containing identifiers, titles, ordering, required flags, and progress information needed for navigation and completion.
3. A page-content loader containing only the current section's layout, blocks, definitions, responses, and resource links.

Use a separate mutation context to verify the target block and response contract. Pass trusted context between internal helpers within the same operation instead of resolving again. Actions must still authenticate and verify ownership, pinned versions, cohort visibility, password protection, and finalized-response rules. Client-supplied identifiers must not become proof of access.

After access and version are known, start independent progress, content, appearance, and applicable companion work together. Keep required course navigation and completion information available; fetching only one page must not accidentally remove requirement gating or historical-navigation fallbacks.

## Companion and chat

`components/experiences/builder/LiveCompanionInteractions.tsx` calls `router.refresh()` every 12 seconds while the page is visible and chat polling is enabled. This repeats the server-rendered page's data loaders, not just the chat query. The interval equates to roughly 300 refreshes per visible browser hour while enabled.

Replace it first with an authenticated endpoint that returns messages after a cursor and current call state. Fetch only for applicable companion modules, pause when hidden, and update the local chat state. Supabase Realtime is a later alternative if subscription access and reconnect behavior are verified.

`companion-data.ts` loads modules, notes, resource links, delivery configuration, chat history across course versions, author names, and sometimes group members before the course page finishes. Resolve module metadata early, but defer inactive panels and query only modules applicable to the current page. Share cohort-plan and membership results already obtained for course access.

Provision missing chat delivery overrides when an offering or delivery plan is created, with a safe fallback for older data. This removes insert-and-reload work from ordinary page reads.

Chat currently orders ascending and limits to 200, which selects the oldest messages when more than 200 exist. Load the newest window, reverse for display, and paginate older messages. The existing delivery/created_at/id index provides a useful starting point; test the actual cursor query plan before adding another index.

## Storage and media

`resolveResourceIds` already deduplicates resource IDs in a single metadata lookup, but creates separate display and download signed URLs for each private file. Those two calls are sequential within each resource; resource jobs run concurrently. Cover and logo helpers perform additional metadata lookups and signing, and the header can resolve the same course logo again.

Gather current-page, appearance, and applicable companion resource IDs before fetching metadata. Sign display URLs by bucket in batches using Supabase's supported [createSignedUrls API](https://supabase.com/docs/reference/javascript/storage-from-createsignedurls). Generate download URLs only when required, preserving original filenames. Request-level reuse should include bucket, path, download behavior, and relevant transformation options. Resolve repeated cover/card images once per catalog request.

Private signed URLs currently expire after 15 minutes. Cache metadata separately from signed URLs, and use an expiry-aware refresh path for long sessions. Do not turn private course files public as a performance shortcut. Since `ParticipantPdfReader` keys its state by the signed URL, repeated URL replacement can reset the reader and reload the PDF; targeted chat updates and stable valid URLs should prevent that unnecessary reset.

Several images use `next/image` with `unoptimized`, including course cards and participant images. Deliver correctly sized compressed thumbnails for cards and responsive variants for larger images. Evaluate Supabase image transformations or a controlled image delivery path; preserve access to private files and avoid feeding large originals into small cards.

The contour artwork is sizable: Start Something's SVG is 502 KB raw and approximately 198 KB with a local gzip calculation. A large LMU SVG is 445 KB raw and approximately 164 KB gzip. Simplify path geometry or evaluate an equivalent compressed background image, checking the white map lines visually at desktop and mobile sizes. These compression figures are estimates of representation size, not observed production network transfers.

## Authentication and password protection

`app/layout.tsx` awaits `getPlatformAccount` for every initial document render, including the public landing page. That function validates the user and reads profile and admin membership. Pages separately call `getPlatformUser` and authorization helpers. The root account read makes a shared critical path and prevents a wholly static anonymous page with the current structure.

Use React `cache` for read-only identity, participant, and authorization helpers during a server render, with stable primitive arguments. Deduplicate course resolution during rendering as an interim improvement. Request memoization does not replace cross-request caching and should not be applied blindly to mutation paths that require fresh post-write data.

Password protection is checked in the proxy, experiences layout, and participant runtime. Preserve protection on navigation, direct API requests, actions, and reused layouts, but reuse verified reads inside a request. The server's `needsExperiencePassword` evaluates admin authorization whenever credentials exist, even when the signed grant might already be sufficient; short-circuit valid grants before additional authorization reads while preserving admin bypass for other requests. Combine experience and credential metadata lookups where practical.

Consider a static public shell with a small dynamic account region, or route-group layouts appropriate to public and authenticated experiences. This needs session/login testing. Do not globally cache authenticated HTML or permission results across users.

The browser auth provider fetches `/api/account` for every auth event containing a user, including the initial session event after server account initialization. Reuse the initial account when appropriate and refresh on meaningful identity/profile changes; retain correct sign-out, token-refresh, and role-change behavior.

## Caching and loading feedback

No explicit application `use cache`, `unstable_cache`, React request cache, `Suspense`, or `loading.tsx` usage was found in the source search. This does not imply that Next.js and the browser have no built-in caching or code splitting.

Cache published curriculum and response-definition metadata by experience/version, with a revision or explicit invalidation for operations that change a supposedly stable version. Keep draft preview live. Shared public catalog and theme metadata are also candidates. Keep participant responses, enrollment/progress state, password grants, and authorization decisions fresh or specifically scoped to their owner.

The installed Next.js guide requires `cacheComponents: true` for `use cache`; that option is currently absent. Adopt caching deliberately: a focused data-cache implementation can be evaluated before a broader Cache Components migration. Pass serializable keys into caches and create clients inside loaders rather than passing Supabase clients as cache keys. Document invalidation for publish, archive, theme/card edits, and credential changes.

Add route loading states and nested streaming boundaries so the course body or dashboard essentials do not wait for secondary panels. An ancestor root-layout await must also be addressed; a page skeleton alone cannot make that blocking work disappear. Streaming improves the time to useful content; fewer queries improves total work. [Next.js loading conventions](https://nextjs.org/docs/app/api-reference/file-conventions/loading) describe the supported route behavior.

## Dashboard and saved work

`getWayfinderDashboard` is a broad loader shared by Dashboard, My Journey, and Purpose Profile. It includes memberships, tags, role assignments, historical artifact snapshots, catalogs, themes, signed card assets, and admin network counts. Some of those pages need only a fraction of this data. It also reads role assignments after authorization has already read them.

Create smaller loaders for dashboard essentials, journey summaries, community panels, and admin network statistics. Start independent capabilities and participant-data reads together where their prerequisites allow it. Load only the history JSON fields needed for completion summaries instead of full snapshots, preserving old completion records. Batch card and cover assets. Stream secondary panels and measure whether exact network counts justify their request cost.

Purpose Profile loads this entire dashboard primarily to check identity, then loads its saved response library. `loadOwnResponseLibrary` processes enrollments and versions sequentially and can reconstruct multiple historical courses. Use a lightweight identity context and an outline-first response library, following the existing lazy box/member-response pattern. Load answers on expansion; use bounded concurrency for independent course summaries to avoid overwhelming the database.

Keep the existing response-library improvements: selected history fields, skipping empty history, outline views, and lazy response boxes. Extend those patterns rather than discarding them.

## Admin lists and the resource library

`loadResourceLibrary` makes twelve broad table reads, reconstructs resource usage in JavaScript across the curriculum, and only then filters and slices to the visible page in `app/admin/resources/page.tsx`. Curriculum tables already exceed 1,000 rows. The project's actual PostgREST row limit was not verified, so unpaginated requests also need a completeness audit; this is a potential correctness issue as well as a performance issue.

Move filtering, usage joins, counts, and pagination into authorized database queries. Query visible resource details first and load usage details for those IDs, or expose an appropriately secured view/RPC. If usage relationships in JSON require too much repeated computation, consider maintaining a normalized usage index when curriculum/assets change. Verify associations across archived versions and themes before switching implementations.

The Wayfinders list already uses server pagination and batched reads for the current page. Keep that. Its multi-filter path fetches membership ID lists then intersects them in JavaScript; at larger scale, an authorized SQL query with EXISTS filters can eliminate large ID transfers. Substring name/email search may merit pg_trgm only after measuring query plans. Person-detail screens load global assignment catalogs and extensive notes/history: defer edit-only catalogs and paginate history where needed.

Admin curriculum and block editors should request the visible section and shared asset/assessment catalogs once. Avoid building editors for every collapsed item up front. Preserve drag/drop ordering and draft-edit access checks.

## Browser JavaScript and styles

There are 84 client components in the scanned source. That count alone is not a problem; the concern is what is included in a particular route's initial load.

`BunnyVideoAdapter` statically imports hls.js. `LifeMapPdfDownload` statically imports @react-pdf/renderer. LMU module routes reference many module components, and the participant renderer references all native assessments. Confirm initial browser requests with a production bundle report before claiming every referenced component downloads on every route.

Load hls.js only when the chosen provider needs it and playback begins; keep native HLS where supported. Load PDF generation on explicit download/open rather than ordinary report viewing. Defer admin rich-text editors until editing starts. Keep server-side rich-text conversion server-side. `ParticipantPdfReader` already dynamically imports pdfjs-dist and media iframes already use lazy loading; those are good existing choices.

The installed Next.js documentation warns that dynamically importing a Client Component from a Server Component does not currently provide automatic code splitting. Put deferred behavior behind an appropriate client boundary or route-specific entry, then confirm its actual network effect. Follow the [official lazy-loading guide](https://nextjs.org/docs/app/guides/lazy-loading).

`app/globals.css` is 581,890 bytes raw, approximately 91 KB under local gzip, and imported by the root layout. Split admin, LMU, and assessment styles into scoped route/component files while retaining shared foundations. There are many historical overrides, so do this incrementally with visual checks for layout, print output, course shells, map backgrounds, and mobile behavior.

## Database and hosting

Supabase performance advisors reported 78 foreign keys without fully covering indexes, 51 unused indexes, two tables without primary keys, and four duplicate index pairs. These are diagnostics, not proof that all listed objects cause slow pages.

The duplicate pairs are on experience_enrollments, experience_lessons, experience_modules, and experience_versions. Inspect constraint dependencies before removing a duplicate: unique indexes can support foreign-key integrity. Preserve the surviving constraint/index relationship and verify migration behavior in a development database. [Supabase duplicate-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index) explains the finding.

Prioritize missing foreign-key indexes involved in high-volume joins, deletes, and cascades. Existing key read indexes already cover common content, version, enrollment, and progress lookups. Do not add another copy of those indexes or remove unused ones solely from current usage counters. [Supabase index guidance](https://supabase.com/docs/guides/database/query-optimization) recommends checking plans and balancing read improvements against write overhead.

Most reviewed application reads use the server admin client, so optimizing RLS expressions alone is unlikely to solve those read paths. Preserve explicit application authorization, and inspect authenticated-role plans separately where the browser or API uses RLS.

Accumulated query statistics show administrative cloning at approximately 699 ms mean database execution and publishing at approximately 425 ms. Profile these functions, their triggers, and repeated row operations after the participant improvements. They affect editing/publishing, not necessarily ordinary learner page reads.

Confirm the Vercel function region near Supabase us-east-1 and measure connection/request latency. Check production resource utilization, cold-start behavior, and response compression before considering capacity upgrades. Supabase's Data API calls use HTTP, so changing a Postgres connection-pool setting is not a direct fix for this application's request waterfalls. Development has compression disabled and compilation overhead; compare production builds and deployments rather than treating localhost timings as production evidence.

## Implementation sequence and acceptance checks

### Phase 1 Measurement and repeated work

Instrument Dashboard, My Journey, Purpose Profile, a Hub Leader Cohort content page, a page with a prebuilt assessment, an assessment save/finish, and the admin resource library. Record total duration, auth/access/structure/Storage/companion durations, request counts, payload bytes, and p50/p95 over repeat runs. Separate cold and warm requests and direct loads from client navigation. Avoid logging answers, cookies, secrets, or signed URLs.

Remove repeated course resolution from cards and internal mutations; add request deduplication for read helpers. Replace 12-second full-route chat refreshes with focused updates. Batch current asset lookups and signing. Add useful loading states and defer heavy HLS/PDF generation where confirmed in the bundle.

Acceptance: one course context resolution per relevant render/operation; a chat update does not reload curriculum or re-sign course files; answer saves do not load unrelated assets or chat history; signed downloads preserve filenames. Measure and report before/after figures.

### Phase 2 Focused course loading and caching

Introduce outline and current-section loaders plus a minimal mutation context. Cache published metadata with explicit keys and invalidation. Split dashboard/profile loaders and make saved-response details lazy. Restrict companion reads to relevant modules and paginate chat.

Acceptance: the course page's content/response/asset query size scales with the current page rather than the entire version; repeat navigation reuses eligible published metadata; drafts reflect edits; requirements, pinned versions, cohort delivery, password revision changes, and historical completions remain correct. Compare two users and two cohorts to detect cache scope mistakes.

### Phase 3 Admin scaling and asset cleanup

Implement resource-library database pagination and usage lookup; verify completeness beyond the configured API row limit. Improve assignment/catalog loading, responsive image derivatives, route CSS, and SVG backgrounds. Remove verified redundant indexes and address measured slow plans. Review cloning/publishing separately.

Acceptance: admin lists retrieve only the requested page and accurate counts; resource usage includes later pages and historical versions; edited or moved content invalidates the right cache; visual and print checks pass; database write plans preserve integrity.

### Performance goals

After collecting a baseline, use provisional goals of 30–50% fewer Supabase/Storage requests on common course interactions and a meaningful reduction in p95 navigation and save latency. These are targets, not promised speedups. Aim for p75 LCP at or below 2.5 seconds, INP at or below 200 ms, and CLS at or below 0.1 on representative devices; agree route-specific TTFB and payload budgets from the measured starting point. These browser thresholds follow [Google's Core Web Vitals guidance](https://web.dev/articles/vitals).

Run the existing completion, cohort-context, participant-navigation, saved-response privacy, password-access, and asset tests for touched paths. Add targeted verification for new loader boundaries and cache invalidation, then exercise the full learner flow in a production-mode browser. Roll out each phase separately so gains and regressions can be attributed to a specific change.
