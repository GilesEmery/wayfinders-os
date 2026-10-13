# New course builder — local integration review

Status: implemented locally; uncommitted and unpushed. No production deployment, migrations or live course writes were performed.

## Open and review

- Integrated interface rehearsal: http://localhost:32020
- Previous interface: http://localhost:32020/?builder=legacy
- Restore new interface: http://localhost:32020/?builder=modern
- Full captured learner course: http://localhost:32016/dev/hub-leader-builder

The rehearsal uses the actual integrated presentation components, captured published authoring content, local media and inert server actions. It contains 16 chapters, 16 lessons, 68 pages and 194 blocks. It contains no participant records. Saves are simulated and do not persist course changes. Remote media is represented safely. Preview explains the distinction and links to the captured learner review. Database authorization/save/publish round trips are not certified by this rehearsal.

Review weeks 0–2 first: outline navigation, heading/content Edit panels, drag handles and up/down controls, media/settings controls, Course Customization, typography and Companion. Then inspect later weeks. Publication remains a separate confirmed action in the real interface. Do not use the rehearsal as proof of database persistence.

## Implemented

The original authoring actions, IDs, curriculum hierarchy and permission checks remain in place. Existing editor forms are presented in shared content cards and right-side panels. Course Customization and Companion remain available. Closed panels keep editor state mounted. Text edits update the canvas immediately. H1–H6, Body/Small visual styles, underline and explicit font overrides serialize through the existing rich-text format. Course typography is opt-in, draft-only, validated and revision-checked; unconfigured courses receive no typography overrides. Existing text is not converted.

All original block types and advanced settings/source controls are retained; custom source is inspectable rather than executed by the editor. Participant response, enrollment, completion and publishing logic is unchanged. The only existing block mutation expansion permits H5/H6 values.

## Interface fallback and recovery

1. On the real version builder URL, append `?builder=legacy` (or `&builder=legacy` when a query already exists). This selects the previous interface; its presentation-only cookie remembers the choice for one day on `/admin/trainings`. Authentication and authorization still run first.
2. Use “Use new builder interface” or `builder=modern` to restore the new interface.
3. A future authorized deployment may set `PURPOSEOS_COURSE_BUILDER=legacy` to force the previous interface globally. No environment setting was changed during this work.
4. The original workspace and blocks are retained as `LegacyCourseBuilderWorkspace.tsx` and `LegacyBuilderBlocks.tsx`, verified against baseline commit `ce649fb03dd5f1d919431e5824a748cec6b21360`.
5. A Git-ignored local backup of the 17 originally modified tracked files is `.local/course-review/builder-interface-baseline.zip`, with SHA-256 manifest beside it. This is a source recovery aid, not a database backup. Do not blindly restore it over subsequent work.

Switching interfaces does not require restoring course data. If creators later save new font marks or typography, keep the compatible decoder/renderer when falling back; reverting all code to a pre-formatting release could expose markup or change presentation. There is no automatic deployment rollback configured or performed. Existing published course versions and participant references must remain intact.

## Verification and release boundary

- 80 focused offline tests passed: original interface equality, guarded typography writer, rich-text round trips, recovery, response policy, private notes, completion and participant/cohort navigation.
- 10 integrated browser checks passed: immediate rendering, H6/underline/font overrides, mounted sidebar recovery, customization, settings, remembered fallback, read-only published controls and mobile layout. Zero external requests, runtime exceptions or console errors.
- Existing demonstration: 24 browser checks passed after shared sidebar changes, including drag/reorder, customization, mobile and conflicts; zero external requests/errors.
- TypeScript and focused ESLint passed.
- Local Node 24 webpack production build passed. Only public font downloads were permitted; provider service traffic was blocked.
- Both development review routes return 404 in local production mode.

Remaining release gates: owner review, authenticated draft save/reload and asset/drag/publish validation in a separately authorized environment, and explicit final production approval. No push is authorized by this review. Published restrictions and database writer authorization have offline coverage, but no live authenticated integration test was attempted. Weeks 0–2 retain their existing IDs and response contracts; saved participant records were not inspected or modified.

## Owner review amendments — October 12

Added optional subtitle, rich supporting text, caption/help text, bounded alignment/padding/width/background/border and image-fit controls through the existing settings save contract. Existing type-specific asset, PDF, response/choices, assessment and source controls remain in their right-side editors. Presentation changes update the canvas before save and use the shared participant renderer. Unsafe CSS and invalid dimensions are excluded; additional text and unrelated settings survive legacy form saves.

The sidebar is now portaled to the document body, above the admin shell, with a sticky 44px close button and Escape support. Course CSS variables are copied from its source context. Panels remain mounted when closed.

Removed outline Edit buttons and exposed Chapter → Lesson → Content in the modern interface. Existing database modules, lesson groups and sections are preserved. A visible Lesson corresponds to an existing content section; the stored grouping remains available under Advanced in the main lesson editor and in the legacy interface. Chapter renaming is in that editor as well. No curriculum rows or response references were moved.

Amendment verification: 35 focused tests, 12 integrated browser checks, 24 original-demo browser checks, TypeScript, focused lint and guarded production build. Live persistence remains untested and no push/deployment is authorized.

## Direct-editing and styling amendment

Text and heading blocks use the existing inline editor directly in the canvas, without opening Edit. Its autosave, recovery and revision conflict checks remain in place. Lesson titles and introductions are also editable in the main heading card. Published versions remain read-only.

Other registered content exposes presentation text fields on the canvas. Its advanced layout controls use HTML form ownership to share a single text/presentation form across the portaled sidebar. A separate content-settings form retains media source, choices, assessment and other original controls; it does not contain a second presentation-text writer. These canvas fields use explicit Save text / Save text & appearance; the offline rehearsal simulates both.

Appearance-only saves for ordinary inline text use validated `blockAppearance` JSON in the existing settings field. They preserve source text and never create an overriding text presentation. The shared participant presentation renderer also reads these settings. No schema change or existing course conversion occurs.

Canvas and sidebar controls now share borders, spacing, typography, focus styles and toolbar styling, scoped to the new interface. The legacy fallback retains its original interface.

Verification: 45 focused tests, 13 integrated browser checks (including typing before Edit, one text editor, direct lesson fields, media text and shared form ownership), TypeScript, lint and guarded production build passed. Browser verification used no external requests and reported no runtime/console errors. No live save, push or deployment was performed.

Chapter names (including Pre-Working and Week 1) are now editable directly in the outline through the existing rename action. Enter or blur submits the name; Escape restores the saved value. Published versions remain read-only. The rehearsal simulates these saves.

All modern Add Content library/insertion controls and both development demos now use a full-width, 50px-high dashed rectangle with centered Add Content label and a disclosure arrow. The existing menus, insertion positions and authorized creation actions are unchanged. Legacy fallback styling is preserved.

## Curriculum outline styling amendment

The modern outline now uses collapsible chapter cards, six-dot drag handles, separated lesson rows with content-type icons, direct chapter renaming, Add Lesson footers and a chapter overflow menu. Chapter up/down actions and advanced lesson-group creation remain in that menu; lesson up/down controls appear on hover/focus and remain visible on touch devices. Existing IDs, drag actions, navigation and creation actions are retained. Chapter headers toggle without navigating away.

Icons use one batched authoring-metadata query restricted to this version's section IDs (`section_id,block_type` only), rather than fetching lesson bodies per row. No participant data is requested. Local fixture verification confirmed all 16 chapters / 68 lesson rows, collapse, retained reorder controls and mobile fit. TypeScript and lint passed. No live writes or deployment performed.

## Companion design and clean selection marker

Removed lesson-type icons and their metadata query, and cleared the old marker attached to selected link text. Active lesson rows retain a light course-primary tint and one left accent line. Companion cards now follow the same collapsible-card design with dotted handles, tidy headings/chevrons and a matching add footer. All original Companion forms/actions, scope/audience/availability controls, resources, visibility and removal/reordering remain intact; no permissions or learner data changed. Four local browser checks, TypeScript and lint passed.

Companion cards now open the shared right-side editor when clicked, with no disclosure arrow or in-card expansion. Only one editor opens at a time; close/Escape retain mounted draft controls. Desktop workspace reserves 400px for the editor; narrow screens use the existing drawer. Companion and outline columns use matching widths. All original Companion controls/actions remain inside the panel. Local browser checks, TypeScript and lint passed; no live writes or push.

Text advanced options now use light-grey panel chrome and white sections. Removed the nested Edit Settings wrapper; Typography, Layout & Appearance and Behavior remain directly accessible. Plain heading/text blocks hide media positioning. Added bounded per-box family, size, line-height, letter-spacing and text-color settings with typography reset. Blank controls inherit course defaults; explicit inline marks remain available. The shared renderer consumes validated appearance JSON. Twenty-one focused tests, TypeScript, lint, a guarded production build and the final grey/24px browser preview check passed. No live data changes or deployment.

## Text-column controls

Layout & Appearance now provides one, two or three text-flow columns plus a 0–120px gap. Settings are opt-in and validated in existing block settings JSON; existing content receives no changes. Desktop authoring and the shared participant renderer use the same definitions, with one column below 700px. Semantic headings span columns and explicit text formatting remains intact. These controls flow a text area across columns; existing lesson section/column controls continue to arrange independent blocks side by side.

Eleven presentation tests, TypeScript, lint and the local browser's three-column/32px-gap/mobile-fallback checks passed. No database, participant data or deployment changes.
