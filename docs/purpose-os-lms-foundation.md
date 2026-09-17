# Purpose OS LMS foundation

The generic LMS domain supports `builder`, `custom_code`, and `hybrid` experiences. Supabase stores curriculum data and renderer keys; executable renderers and route adapters remain source-controlled in the runtime registries.

## Authoritative schema reconciliation

The authoritative source for the A1/A2 LMS database shape is the live Supabase catalog export captured on September 14, 2026. The export covers columns, defaults, nullability, constraints, indexes, RLS state, policies, triggers, relevant functions, grants, enums, ownership, and persistence. Repository migration history is reconciled to that evidence in the append-only A1 Core LMS Foundation and A2 Themes / Privacy / Delivery Plans reconciliation migrations; the generated TypeScript contract was checked against the same live column metadata.

The authoritative tables have RLS enabled without forced RLS, and the exported policy query returned no rows. The reconciliation therefore enables RLS and preserves the server-only grant posture without inventing browser policies. Both live update-trigger functions remain distinct: existing foundation tables use `set_updated_at()`, while the restored A1/A2 tables use `purpose_os_set_updated_at()`.

Every Supabase schema change that is applied manually must also be represented in `supabase/migrations`. No hosted-schema-only change is considered complete. Future changes should add migration history at the same time they are applied so a fresh database remains reconstructable from source control.

Atomic publish and deep-clone RPC work remains blocked until both reconciliation migrations have been applied and their no-op/live-safe behavior has been verified against the hosted project.

## Draft curriculum authoring

The Admin version workspace authors `Experience → Version → Module → Lesson → Section`. Structural mutations are server-mediated, capability-checked, and limited to draft versions; published and archived versions remain inspectable but immutable.

Module, Lesson, and Section keys are stable slug-style identifiers unique within their immediate parent. New siblings append at the end, and create, delete, move, and reorder operations normalize integer `sort_order` values. Sections may move between Lessons and Modules only inside the same Version; the mutation updates both `lesson_id` and denormalized `module_id`. Cross-Module Lesson moves are deferred because Section parent integrity would require an atomic multi-table operation.

Generic hierarchy remains optional for `custom_code` Experiences, including Life Mapping U. Deep Version cloning, publishing, and participant progress remain intentionally deferred. A Section may still exist without a Layout until an Admin configures one.

## Section layouts and Columns

Draft builder and hybrid Sections may configure one `section_layouts` record with one, two, or three ordered Columns. Presets establish sensible defaults, while persisted custom widths must remain positive and total 100%. Desktop `sort_order` and unique `mobile_order` are independent; column position carries no semantic meaning.

Each Column may be labeled and configured as sticky, collapsible, collapsed by default only when collapsible, and `stack`, `collapsible`, or `hidden` on mobile. `participant_resizing_enabled` authorizes future temporary resizing without overwriting Admin defaults. Custom and route-handoff Sections are not forced to create layouts.

## Block registry and draft administration

### Response Block authoring (CODEX 14.6)

### Simplified Course Builder (CODEX 14.7)

Builder and Hybrid course releases now carry `experience_versions.shell_mode`: `standard` renders the automatically generated curriculum Navigator beside Content; `enhanced` adds an optional Companion Rail. It defaults to Standard. The setting is release-pinned, so changing a successor Draft does not alter older Published Versions or participant pins. The clone RPC copies the source shell choice. `experience_offerings.group_mode` remains delivery context and does **not** select the shell. Custom-code experiences, including Life Mapping U, ignore this generic course-shell selector and retain their bespoke adapters.

Normal course authors start at **Edit Course**. It opens an existing Draft, clones the current Published Version when no Draft exists, or creates the first Draft for a new course. Automatic Drafts use a timestamp-based internal label; Version History remains visible as an advanced record of current/historical Published and Draft releases. Preview and Publish still use the existing read-only Preview and atomic Publish RPC; Published curriculum is immutable. The normal Builder surface presents Weeks → Lessons → Pages, then Add Content and the CODEX 14.6 response editor. Stable keys and Page-level layout/column controls are hidden in this mode. New Builder Pages still create a single internal Content layout and column, satisfying placement constraints. Existing legacy multi-column Pages remain visible as content areas; advanced layout controls are retained for repair/Hybrid work. Mobile Content precedes the collapsible Navigator, with Companion below rather than squeezing three columns together.

The Enhanced Companion is intentionally a placeholder; course/group context can populate it later without changing the shell selector. CODEX 15 media/resource Blocks should enter the same Content surface, reuse the CODEX 14.6 content-first authoring fields, and add source-controlled registry validators and participant renderers. Do not put media Blocks into the Navigator or revive ordinary Page-level column building.

The existing Block editor now starts with participant-facing content: a question/prompt and supporting instructions from the linked `response_definitions` row, followed by type-specific fields in validated `content_blocks.content`. All response Blocks use the existing requirement level and `response_submitted` completion rule. The shared editor field pattern is the starting point for CODEX 15 media/resource authoring; extend its title/description primitives and registry validators rather than adding another editor architecture or raw JSON controls.

Single and Multi Select use an accessible choice editor with Add, Remove, and Up/Down controls. Labels and help text are visible; stable keys are retained internally when labels change, and new keys are generated server-side. Existing response-history protection still prevents changing choice identities after participant responses exist. Multi Select also exposes the existing minimum/maximum selection configuration. The Checkbox / Yes-No registry contract is a **single acknowledgement checkbox** with an editable affirmative label, not two mutually exclusive Yes/No buttons; a distinct two-choice Block would require a future registry/runtime contract. Short Response and Reflection share placeholder and character-limit editing; `structured_response` is the current Short Response kind, not a general form builder.

Authoring remains Draft-only in the server mutation context. Published Versions stay read-only. Registry validation rejects unsupported content/configuration, and application publication validation rejects blank required response prompts or broken choice configuration while preserving older fallback labels. Preview and participant runtime already read the same response definition and validated Block configuration; Preview never writes response state. Before expanding to media/resource Blocks, reuse the common content-first editor presentation, create a source-controlled configuration validator and runtime renderer, and keep preview, published immutability, and response persistence boundaries intact.

`content_blocks` stores stable Block instances, placement, lifecycle fields, and validated JSON configuration. Executable behavior remains in the source-controlled Block registry: authoring labels, categories, default factories, strict validators, editor/preview keys, participant-renderer keys, and capability metadata. Database values never become import paths, components, CSS, HTML, or executable code.

The first authorable registry entries are `heading`, `rich_text`, and `callout`. Rich Text is deliberately a safe text-area baseline and React renders it as text; arbitrary HTML and scripts are not accepted. `divider` is deferred because the checked-in `block_type` constraint does not currently permit it and CODEX 8 makes no schema changes.

New Blocks always receive `lesson_id`, `section_id`, `column_id`, and a stable slug-style `block_key` unique within the Section. They append to the selected Column. Draft-only Admin mutations can edit validated configuration, set the existing requirement and visibility values, delete after dependency checks and explicit confirmation, duplicate without runtime state, reorder accessibly, and move within the same Section. Source and target Column orders are normalized after structural changes. Layout changes refuse to remove named Columns containing Blocks.

The Admin canvas uses the existing Version → Experience → PurposeOS theme resolver and a source-controlled preview mapping. Unknown registry types and invalid stored configuration render a preserved unavailable card instead of crashing or being rewritten; safe move, reorder, and guarded deletion remain possible. The existing runtime renderer registry provides the allowlisted-key boundary for future `custom_component` and `system_component` definitions, with unknown keys failing closed.

Legacy lesson-level Blocks without Section or Column placement continue through the implicit single-column compatibility adapter. Builder administration never creates that legacy shape. The read-only participant runtime now renders published builder and hybrid structure, including the initial Heading, Rich Text, and Callout Blocks; Block completion, responses, media/resources, navigation/system Blocks, and publishing remain deferred.

## Participant runtime

`/experiences/[slug]` is the stable Experience entry point. Custom-code registrations continue to their approved source-controlled route. Builder and hybrid Experiences require an authenticated canonical participant plus access from an eligible enrollment, current entitlement, active offering assignment, or an active offering whose open/Hub/cohort rule matches that participant. All decisions are made server-side with the service-role client; the browser receives no broad curriculum or authorization query capability.

The selected Version is pinned by enrollment first, then by the applicable offering, then by the Experience's `current_published_version_id`. The resolved Version must belong to the Experience and be published. Draft Versions never render to participants. The entry route resumes at a valid `current_section_id` from progress for that enrollment and Version, otherwise it opens the first published Section.

Deep links use `/experiences/[slug]/course/[moduleKey]/[lessonKey]/[sectionKey]`. Each key is checked against its full hierarchy in the resolved published Version. The shell's baseline navigator uses native disclosure controls and lists Modules, Lessons, and Sections; it can later be replaced or repositioned by the planned Navigator system Block without changing these URLs or the hierarchy loader. Generic Sections respect saved desktop widths, safe desktop sticky/collapsible settings, mobile ordering, mobile collapse, and mobile hiding. Theme tokens pass through the existing validated resolver and source-controlled class mappings. Participant resizing remains configuration-only, and theme logo/cover assets remain deferred until the resource domain provides approved participant URLs.

Participant Block rendering is registry-driven and validates stored configuration again before rendering. Heading levels are constrained, Rich Text is rendered as plain React text rather than executable HTML, and Callout treatments are source-controlled. Unknown optional Blocks are omitted; unknown required or recommended Blocks show a neutral unavailable placeholder. Unknown custom renderers and route handoffs never execute stored code or arbitrary paths.

Previous/Next navigation follows the canonical Module → Lesson → Section sort order, and the final Section displays an end state without marking anything complete merely because controls were rendered.

## Participant progress and resume

Generic progress belongs to the authenticated participant's Version-pinned enrollment. Entitlement and offering access may still open an Experience, but the runtime does not silently create or pin an enrollment; progress remains unavailable until the surrounding enrollment workflow provides one. Every progress mutation re-resolves the signed-in Wayfinder, current Experience access, published Version, and full Module/Lesson/Section ownership. Client-supplied participant, enrollment, Version, and database IDs are never trusted.

Opening a canonical generic Section idempotently creates or updates `experience_progress`, sets its current Module, Lesson, and Section, moves new Section progress to `in_progress`, and starts an enrolled enrollment. A `view` Section completes on that visit. A `manual` Section presents a server-action control. `response_submitted` completes only after every required linked response definition in the Section has a submitted/finalized participant response. The safe initial `all_required_blocks` evaluator treats static `none`/`view` Blocks as satisfied on visit and requires linked response Blocks to be final; unsupported required interaction/media signals keep the Section incomplete. Existing completed rows are never downgraded by revisiting content.

## Response and interaction foundation

The first generic interaction Blocks use schema-supported `structured_response` (Short Text Response) and `reflection` (Long Text / Reflection) identities. Block configuration owns presentation details such as placeholder and maximum length. A linked `response_definitions` record owns the prompt, instructions, response type, required state, and privacy policy. The source-controlled response registry owns validation and renderer behavior; database JSON is never executable.

Creating or duplicating either interaction creates a fresh linked definition and never copies participant responses. Deletion removes an unused linked definition before the Block, refuses any Block with participant response history, and attempts to restore the definition if final Block deletion fails. These coordinated service operations are application-level because this increment intentionally adds no SQL function or schema change.

Participant responses are scoped on every read and write by the signed-in participant, Version-pinned enrollment, published Experience Version, canonical route hierarchy, Block key, and linked response definition. Draft saves remain editable. Final submission stores `finalized` with `finalized_at`, is idempotent, and becomes read-only. Raw and result visibility default to `participant_only`; sharing is disabled, and no facilitator, group, or cohort answer surface is introduced.

Generic response Blocks apply only to builder Sections and hybrid Sections using the generic renderer. Custom renderers and custom-code Experiences—including Life Mapping U—retain their separate source-controlled response systems. Unknown response types fail closed. Assessment scoring, interpretation, response sharing/reopening, and Journey/Profile mappings remain deferred.

Selection interactions reuse the same response-definition and participant-response lifecycle. `card_selection` provides source kind `single_select` over the schema's `choice` response type; `checklist` provides `multi_select`; and `check_in` provides source kind `boolean` over `choice`. Options use ordered, unique slug-style keys so labels can change without rewriting saved answers. Single selections store `{ value: "option-key" }`, multiple selections store `{ values: ["option-key"] }` in canonical option order, and checkbox confirmation stores `{ value: true|false }`.

Draft authoring exposes structured option fields rather than raw JSON. New blank-key options derive deterministic slug keys from their labels. Explicit duplicate keys are rejected. Once any participant response exists for a definition, adding, removing, or changing option keys fails closed; label, help-text, and ordering edits remain non-destructive. Runtime and server mutations reject unknown or removed option keys, enforce configured selection limits on final submission, and preserve the existing private, Version-pinned, final-read-only contract. These interactions carry no score, correctness, assessment, form, or interpretation semantics.

The runtime derives Lesson and Module state from canonical child Sections rather than storing duplicate summaries. Required descendants determine completion; recommended and optional descendants remain visible but do not block parent or Experience completion. A parent with zero required Sections may move to `in_progress` through engagement but does not auto-complete. Experience completion similarly requires at least one required Section and all required Sections completed, then timestamps both Experience progress and enrollment completion.

Legacy implicit Sections remain renderable but cannot own canonical `section_progress` foreign keys, so they are excluded from completion math and receive no generic progress writes. Custom-code Experiences, including Life Mapping U, retain their existing progress systems. Hybrid Sections participate only when they are using the generic renderer without a custom renderer key.

The current activity log is Admin-change-oriented, so participant progress does not write misleading Admin audit entries. A unified participant activity contract remains deferred alongside responses, assessments, prerequisites, delivery-plan overlays, certificates, analytics, and notifications.

## Applied A1 model

The shared hierarchy is Experience → Version → Module → Lesson → Section → Layout → Column → Content Block. A Section owns its renderer and completion rules, while columns own responsive layout behavior. `section_progress` is the section-level resume/completion record. Existing cohorts, offerings, enrollments, and entitlements remain the surrounding access model.

Published versions are immutable application-side: editing helpers must call `assertVersionEditable` and publishing actions must require `canPublishExperience`. Database constraints remain the final integrity boundary.

## Compatibility and runtime behavior

Lessons with pre-A1 blocks and no Sections are adapted in memory to an implicit single-column Section. No legacy rows are rewritten. Life Mapping U remains custom code at `/experiences/life-mapping-u`; its registry entry only identifies the existing route.

Unknown renderer or adapter keys must fail closed with a visible unavailable state. Never evaluate code or import paths stored in database JSON. Each registered renderer validates its own JSON configuration before rendering.

## Authorization and progress

All generic LMS data access is server-only. Global admins retain broad access; `course_builder` may author, while `course_admin` may author and publish within its explicit global, experience, or known owning-organization scope. Organization scope is never inferred.

Progress helpers currently return validated insert/update payloads. A server action applying one must first authenticate the user and verify that the enrollment belongs to that participant. This prevents generic helpers from turning the service-role client into an authorization bypass.

## Deferred work

Builder UI, learner UI, theme editing, delivery-plan editing, publishing transactions, and block-level progress are intentionally deferred. Before exposing direct browser reads, add narrowly scoped grants and RLS policies in a separately reviewed migration.

## A2 operational administration

A2 adds approved theme records, response privacy vocabulary, offering group modes, delivery-plan templates, and cohort course plans. Theme configuration is validated against explicit Purpose OS tokens; database configuration cannot supply CSS, classes, fonts, HTML, scripts, or import paths. Delivery-plan readers preserve ordering, visibility, title overrides, repeated/moved Section occurrences, release times, and group-mode overrides without creating plans automatically.

`public.experiences` is now the canonical identity and metadata registry for the admin and public Experience index. The source registry remains authoritative only for executable custom runtime adapters and as a compatibility fallback if the database registry cannot be read. Life Mapping U remains a `custom_code` adapter at its existing route.

The `/admin/trainings` workspace supports database-backed listing, creation, guarded metadata updates, and draft version metadata. Builder and hybrid creation adds an initial draft version in the same server operation; custom-code creation does not require generic curriculum. Slug and delivery mode changes, curriculum cloning/editing, course-plan editing, and atomic publishing remain intentionally unavailable.

## Theme configuration and revisions

Theme configuration V1 accepts only named Purpose OS tokens: selected image-resource IDs, eight semantic colors, approved typography and heading treatments, button/card/navigation treatments, and small spacing/corner presets. The parser rejects unknown keys, invalid UUIDs and colors, and therefore provides no path for database-supplied CSS, class names, fonts, HTML, scripts, URLs, or executable code. Admin mutations also verify that referenced resources are active image records.

An Experience default theme is the fallback for new draft work. A draft Version may inherit that default or pin a specific available theme; the pinned revision takes precedence and becomes immutable when the Version is published or archived. Active and archived theme revisions are immutable snapshots. Continued design happens through a copied draft revision, and existing Experience/Version references never move automatically.

The reusable theme resolver converts validated tokens into a fixed set of safe CSS custom properties and source-controlled treatment classes. Invalid or absent configuration resolves to the source-controlled Purpose OS fallback theme. The Admin preview uses this same resolver so a later generic participant runtime can share its token behavior without treating the preview as the runtime itself.

## Template-first course contract

Course templates are source-controlled composition contracts, not saved page-builder documents. `standard_course` provides Navigator + Content, `group_course` adds an optional Group Companion extension, `hybrid_course` keeps the editable shell with approved custom extensions, and `custom_experience` delegates to a registered source runtime.

Builder Experiences use generic curriculum, layout, Content, progress, and response renderers. Hybrid Experiences retain that editable foundation and may use approved custom renderers. Custom-code Experiences use a source-controlled runtime; Life Mapping U remains custom code and is not refactored by this template system.

The Navigator is generated from Module → Lesson → Page hierarchy. A new Page receives a generated stable key, builder renderer, and one-column Content layout. Authors see Page and Content language while renderer identifiers and keys remain advanced settings. Columns organize content within a Page and never replace the course Navigator.

## Codex-assisted custom course contract

Codex-assisted courses use the same durable primitives available to human authors: Experience, Version, Module, Lesson, Page, layout, column, Content, response definition, theme, offering, enrollment, and progress. Generated work must preserve stable keys, draft-only mutation, approved renderer registries, response privacy, and published-Version immutability.

Bespoke behavior belongs in reviewed source adapters, while editable copy, prompts, ordering, requirements, and supported Content configuration remain in the builder model. Human authoring parity means administrators can inspect and change supported content without Codex. Future custom interactions should pair a registered participant component with an Admin editor and validated configuration contract; without that editor, content must be visibly unavailable rather than deceptively editable.

## Draft Preview and Version lifecycle

Admin Preview is a separately authorized route under `/admin/trainings/[experienceId]/versions/[versionId]/preview`. It loads exactly the requested Draft or Published Version and reuses the generic participant shell, Navigator, layout, Content renderers, and theme. It does not resolve enrollment or entitlements. Preview progress is an in-memory empty snapshot, response records are never loaded or created, response activities render as read-only preview states, and progress/response server actions are not attached.

The intended lifecycle is Draft → validated publication → immutable Published Version → cloned successor Draft. Publishing must validate ownership, draft status, curriculum presence, layouts, registered renderers, Content configuration, and response definitions; then it must atomically mark the Version Published and point the Experience at it. Existing Published Versions and explicitly pinned enrollments remain unchanged. Stable curriculum keys survive a clone while every database ID is newly generated. Participant responses, progress, enrollments, entitlements, and completion records never clone.

The applied `publish_experience_version` RPC owns the atomic Draft → Published transition, publication timestamps/actor, current-Version pointer, and Admin audit event. The applied `clone_experience_version` RPC owns the atomic Published → new Draft deep clone, UUID mappings, stable keys, theme pin, Resource-link reuse, and Admin audit event. Both are service-role-only `SECURITY INVOKER` functions; the authenticated Admin identity and scoped Publish/Build authorization are checked in each server action before invocation. The application also validates source-controlled Block configuration and participant renderer availability before Publish; SQL independently checks structural readiness. The Admin Version workspace presents an explicit publication confirmation and a Published-only Create New Draft form. An empty Draft shell is still available from the Experience workspace, but it cannot claim to copy a source Version.

Published curriculum controls are view-only across the Version workspace and Page/Column/Block editor. Server mutations continue to enforce Draft status, so hiding controls is not the security boundary. The Published Version workspace links directly to its Version-pinned single-participant enrollment view. Existing pinned enrollments are not repointed when a successor Version becomes current.

## Version-pinned enrollment

The initial Admin enrollment path accepts one canonical participant and one Published Version belonging to the Experience. It creates an individual enrollment explicitly pinned through `experience_version_id`. An existing active enrollment for the same participant, Experience, and Version is reused; an active individual enrollment pinned elsewhere is rejected rather than creating competing progress chains. The normal participant access resolver remains authoritative and no preview/testing bypass exists.

## CODEX 14 manual test

1. Open TEST COURSE Version 0.1 and its Admin Preview route.
2. Confirm Navigator, Content, theme, layouts, Previous/Next, responsive behavior, and read-only response states.
3. With the applied RPC available, confirm publication of 0.1 and check Published/current state, `published_at`, and the absence of Builder edit controls.
4. Open the Version enrollment route, select an authenticated test Wayfinder, and create the pinned enrollment.
5. Sign in as that Wayfinder and open `/experiences/testing-course`.
6. Exercise Save Draft, refresh persistence, finalize/read-only, selection validation, Page completion, aggregate progress, leave/return resume, and final enrollment completion.
7. Use Create New Draft on Published 0.1 with an unused label; confirm new UUIDs, preserved stable keys, copied theme/Content, `based_on_version_id`, editable Draft controls, unchanged Published content, and absence of cloned participant state. Retry the same label and confirm a clear duplicate-label message.

These steps require an authenticated human Admin and test Wayfinder. Do not fabricate response/progress results or create destructive fixtures automatically. Through the normal `/experiences/testing-course` route, manually verify Save Draft → refresh persistence → Finalize/read-only for Short Response, Reflection, Single Select, Multi Select, and Checkbox; view, manual, and response-submitted Page completion; leave/return resume; and final required-Page/enrollment completion. Admin Preview must remain read-only and must not be substituted for this participant test.
### CODEX 15 URL-backed media and Resources

The simplified Builder offers Video, Image, PDF / Document, File / Download, External Link, and formatted Text Blocks. Media and Resource Blocks accept public HTTPS URLs only; uploads, private Storage objects, and arbitrary embed HTML are not supported by this editor. YouTube, Vimeo, and ScreenPal player URLs are converted to constrained iframes; direct `.mp4`, `.webm`, and `.ogg` URLs use native video controls; other video URLs become external links. Documents and downloads open an external URL in a new tab, so the browser and host determine whether a file is displayed or downloaded.

Each authored URL is saved in the Block configuration and linked to an active `resources` row. A matching active Resource with the same URL and type is reused. Deep clone copies `content_block_resources` links by Resource ID while preserving the Block's release-pinned URL snapshot. Resources are not copied, modified, or deleted when a Block is edited or deleted. The server validates HTTPS sources and required media before publishing. Text is rendered with a safe, limited Markdown-style subset (headings, lists, emphasis, HTTPS links); raw HTML is never executed.
## Course UX + extension model

PurposeOS normal Builder courses use one course workspace: a Week/Lesson outline, a selected lesson Content canvas, and top-level Preview, Publish, and secondary Settings. A single-Page Lesson is shown as one item in the outline; multi-Page Lessons retain their nested Pages. The Builder displays the same safe Text and Media renderers used by participants, with contextual authoring forms around Content. Changes still use explicit Save/Done-style server actions, not speculative autosave. Draft-only mutation, confirmation-based atomic Publish, Version pins, response privacy, and lesson-wide Content ordering remain in their existing data layer. Version labels and clone ancestry are secondary administration, not the creator's primary task.

The Standard player is Navigator + Content with a restrained outline, release-pinned progress and a spacious editorial lesson surface. Enhanced adds a visually subordinate Companion rail; CODEX 16 does not claim Notes, Community, or Resource tabs are live. On small screens, Content remains primary, the outline is expandable, and the Companion follows below. Course-theme tokens may alter presentation without replacing shared progress, responses, Blocks, or access rules.

Standard PurposeOS courses consume shared Block Registry and participant runtime capabilities. Flagship courses such as a future Kaleo theme should extend them through a Course Theme/adapter or approved custom Page renderer, not fork generic Text, Media, Resources, responses, progress, or navigation. A useful flagship-only capability should be generalized into the shared registry and reused by the flagship; likewise, a new shared Block should be available to compatible flagship and Hybrid courses unless deliberately disabled. Life Mapping U remains a separate custom-code experience and was not redesigned here. The next refinement can address drag-and-drop only after its lesson-wide ordering semantics are safely maintained, plus richer Companion features when their data and privacy architecture exists.

### CODEX 16.1 Version-owned course choices

The append-only `20260915235913_version_course_configuration.sql` migration adds `experience_versions.course_configuration` as a non-null JSON object defaulting to `{}`. It is local-only until reviewed and applied. Its contract contains `terminology.group_label` (`module`, `week`, `section`, `unit`, `stage`, `session`, `chapter`, `phase`) and `appearance.header_treatment` (`minimal`, `image`, `color`), `reading_width` (`focused`, `standard`, `wide`), and optional six-digit hex `accent_color`. Unsupported or malformed values normalize to Module, minimal, standard, and no override. Creator-facing labels are capitalized in the application. These are curated release choices, not raw CSS or arbitrary style tokens.

Version appearance overrides remain separate from reusable Themes. The accent fallback order is Version override → explicit Theme primary accent → existing Experience accent → PurposeOS fallback. Image header treatment uses a validated existing Theme cover Resource only when it is an active image with a public HTTPS URL; otherwise it shows an honest gradient fallback. No upload path is stored in configuration. Uploaded Course Covers remain pending an authorized Storage bucket, policies, and URL/access design. The new migration replaces only Clone so a successor Draft copies its source Version's `course_configuration`; Publish remains unchanged and older Published Versions retain their choices.

Admin Preview and participant playback share the same runtime. The Navigator is opened by default, and preview response controls are disabled without fake submission or persistence actions. Normal Builder courses use a focused shell without the global Admin sidebar, curriculum terminology from the Version, and a contextual lesson inspector. The Builder's Appearance form saves only Draft Version configuration after `requireAdmin()` and scoped build authorization.

The continuation adds Desktop, Tablet, and Mobile visual Preview controls; these frame presets are not substitutes for real viewport/device testing. Text-oriented Blocks open their edit form by clicking the learner-like content; media and response settings can be edited in a selected-Block inspector. Block overflow contains secondary actions, while Add Content remains categorized at the lesson end. The normal Course overview keeps live/Draft/access/learner status primary and places lifecycle/version internals behind an advanced disclosure. Admin-safe View Live Course points to the Published Version's Preview route, preserving participant enrollment checks. The single-enrollment picker now searches its loaded, bounded participant list; full-directory server-side search remains a separate improvement.
## Native course assets

CODEX 17 reuses `public.resources` as the canonical asset record and
`content_block_resources` as the reusable Block relationship. File bytes live in
one private `purposeos-assets` Storage bucket. Admin Server Actions validate files
(allowlisted MIME plus signature, 25 MiB maximum), generate collision-safe paths,
upload without upsert, and persist the Resource record. Participant and Admin
Preview loaders issue 15-minute signed URLs only after their existing Course
authorization checks have succeeded; no `anon` or `authenticated` Storage object
policy is added.

Uploaded Resources are immutable file identities. Replacing media in a Draft
means linking a different Resource, never overwriting an object used by a
Published Version. Course Covers use
`experience_versions.course_configuration.appearance.cover_resource_id`; Lesson
Heroes use `experience_sections.settings.hero_resource_id`. Both references are
copied naturally by the existing deep clone while continuing to reuse the same
Resource and Storage object. Removing an asset from a Block, Cover, or Hero only
unlinks that usage. Orphan discovery and deletion remain a future Admin-library
operation; this phase does not automatically delete shared files.

Native video upload/transcoding is deliberately excluded. Video and external-link
Blocks continue to use validated HTTPS sources.
