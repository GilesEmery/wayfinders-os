# Purpose OS LMS foundation

The generic LMS domain supports `builder`, `custom_code`, and `hybrid` experiences. Supabase stores curriculum data and renderer keys; executable renderers and route adapters remain source-controlled in the runtime registries.

## Draft curriculum authoring

The Admin version workspace authors `Experience → Version → Module → Lesson → Section`. Structural mutations are server-mediated, capability-checked, and limited to draft versions; published and archived versions remain inspectable but immutable.

Module, Lesson, and Section keys are stable slug-style identifiers unique within their immediate parent. New siblings append at the end, and create, delete, move, and reorder operations normalize integer `sort_order` values. Sections may move between Lessons and Modules only inside the same Version; the mutation updates both `lesson_id` and denormalized `module_id`. Cross-Module Lesson moves are deferred because Section parent integrity would require an atomic multi-table operation.

Generic hierarchy remains optional for `custom_code` Experiences, including Life Mapping U. Blocks, deep Version cloning, publishing, participant rendering, and progress are intentionally deferred. A Section may still exist without a Layout until an Admin configures one.

## Section layouts and Columns

Draft builder and hybrid Sections may configure one `section_layouts` record with one, two, or three ordered Columns. Presets establish sensible defaults, while persisted custom widths must remain positive and total 100%. Desktop `sort_order` and unique `mobile_order` are independent; column position carries no semantic meaning.

Each Column may be labeled and configured as sticky, collapsible, collapsed by default only when collapsible, and `stack`, `collapsible`, or `hidden` on mobile. `participant_resizing_enabled` authorizes future temporary resizing without overwriting Admin defaults. Custom and route-handoff Sections are not forced to create layouts. Blocks and participant runtime remain deferred to CODEX 8.

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
