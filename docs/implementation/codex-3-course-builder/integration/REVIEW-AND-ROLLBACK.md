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

## Video editor amendment — October 13

Video cards now show Header and Video Link inputs above the rendered preview. Edit contains rich header/supporting text and stacked/video-left/video-right layout controls, with shared spacing and mobile stacking. The advanced presentation fields belong to the canvas form so video source and layout save together through the existing authorized update action. Source metadata and legacy caption/description are preserved, and advanced text formatting is retained. Existing course data is not rewritten by opening the editor. Header changes update the local preview; provider URLs still use the existing validation and media renderer. The isolated rehearsal uses an inert action and remote-media placeholder.

Twenty-four focused offline tests, TypeScript, lint, the guarded production build and three local browser checks passed (basic fields/live header, left/right controls/form ownership, mobile stacking). Compatibility tests now compare the retained legacy interface to its fixed ce649fb baseline rather than moving HEAD; the repository's current HEAD is c6242f2. No push, deployment or live write was performed.

## Paragraph-sized fields and image editor

Main text fields now have a 200px minimum writing area across canvas and advanced editors. Image cards use the same simple header/preview pattern as video, with their supporting text and image-left/image-right arrangement in the grey-and-white advanced panel. Existing image selection/upload, alternative text, caption, fit, behavior and source controls remain available. Image source fields and advanced presentation share one canvas-owned save form; absent metadata is preserved. No course content was automatically changed.

Local image browser verification covered the 200px field, grey chrome, retained upload/alt controls and side-by-side preview. TypeScript, lint, 24 focused tests and the guarded production build passed. No push or live writes.

Image resource selection and upload now appear directly on the main image card above its preview, without opening Edit. Existing resources can be selected/replaced, new images uploaded with a resource title, and attachments removed. These use the original authorized asset actions and accepted image formats. An unattached image shows a helpful choose/upload message rather than Resource Source Unavailable. Local browser verification, TypeScript, lint and guarded production build passed. No live file upload or resource change was attempted; rehearsal actions remain simulated.

## PDF resources, layouts and primary-color actions

PDF cards now expose existing-resource selection/upload/replacement/removal directly on the main card, with Header and preview rather than the generic text/subtitle/caption editors. Advanced options retain reader/download/new-tab capabilities and reader/slides style, plus supporting text and stacked/PDF-left/PDF-right layouts. PDF capability fields belong to the same canvas form, and previews react to embedded-reader changes. Before opening Edit, existing capability defaults are preserved during save. File validation and authorized asset actions are unchanged.

Reader-off PDF action cards and prebuilt assessment cards use the current course primary color. Card text uses the course's computed contrasting ink; white action buttons use dark text. Embedded-reader rendering and assessment enrollment/completion logic are unchanged. The offline PDF fixture renders the same reader-off action structure, without loading participant data or performing an upload.

Local browser checks passed for main library/upload controls, absence of main paragraph editors, shared PDF form ownership, primary-color action card, preserved links and mobile side-by-side stacking. Twenty-four focused tests, TypeScript, lint and guarded production build passed. Review saves remain simulated; no push/deployment or live writes performed.

## Prebuilt assessment selector and course-card preview

The main assessment card now contains the assessment dropdown, Save Changes and the shared learner AssessmentLaunchCard preview, including not-started status and an inactive Start Assessment button. Registered assessment metadata is fetched once per server request using React cache. Selecting an assessment clears old wording overrides and uses its canonical name/description; blank stored copy continues to resolve canonical metadata at runtime. Existing deliberate wording overrides are preserved on initial load.

Advanced options expose course-card name/description overrides and Use Assessment Defaults; edits immediately update the preview and save through the existing block update action. They do not edit the canonical assessment or its responses/scoring. Existing unavailable selections are identified rather than silently replaced, and saving requires an available selection. Existing source/layout controls remain available.

Two local browser checks covered metadata selection, hidden override values, course-card preview, custom wording, reset and the inactive start button. Twenty-two focused tests, TypeScript, lint and guarded production build passed. One pre-existing source assertion was updated to accept the repository's already-existing unconditional autoStart attribute as well as its conditional form; no native assessment launch behavior was changed. No live writes, push or deployment occurred.

Assessment selection is now available in both the main card and advanced options, synchronized without extra library queries. Advanced name/description fields display the currently effective wording, including canonical defaults when there is no override. Edits update the preview immediately; Use Assessment Defaults clears stored overrides and restores the selected assessment's canonical name/description in both the fields and preview. Changing selection in either location resets old overrides. Local browser checks covered populated fields, custom wording/reset and synchronized advanced selection. Twenty-two focused tests, TypeScript and lint passed; no live changes or push.

## Short-response main editor and preview

Short-response blocks now use Question or Prompt, Supporting Text / Instructions, Placeholder and the existing Character Limit on the regular card instead of generic Optional Header / Main Text / Subtitle / Caption editors. The same response-specific fields remain in advanced options and synchronize in both directions. Advanced controls mirror draft values without duplicate named form fields; one main authoring form submits through the original updateBlockAction, keeping response definition IDs, response keys, validation, behavior and permissions intact.

The actual participant response component renders below the main form with current prompt, instructions, placeholder and character limit, with response data explicitly null and preview mode enabled. Its answer field is disabled and there are no response-submission controls. Existing layout/source controls remain advanced. No participant information was loaded or saved.

Verification: two local browser checks proved the required main fields, absence of generic text editors, preview placement and disabled state, immediate preview updates, advanced synchronization, a single prompt value in FormData, max-length updates and mobile fit. The browser recorded no external requests, runtime errors or console errors. Forty-two focused offline tests, TypeScript, lint, diff checks and guarded production build passed. Live authoring persistence remains outside the simulated review; no push or deployment performed.

### Short-response requirement selector — October 13, 2026

The main short-response card now provides Required, Optional, and Recommended. Its selection stays synchronized with advanced options and uses the existing requirement_level save contract. Character limit is visible only in advanced options; the main form retains its current value without exposing the field. Local browser checks verified both directions of requirement synchronization, hidden character-limit preservation, preview behavior, mobile fit, and no external requests. TypeScript, focused ESLint, and 11 integration tests passed. Saves in the review application remain simulated; no production push or database changes were performed.

### PDF resource-card design — October 13, 2026

Non-embedded PDFs now use a shared PdfResourceCard in the participant renderer and offline builder fixture. The card displays a PDF document icon, the configured/resource title, optional description, white text on the course primary background, and white buttons with primary lettering plus open-new-tab/download icons. Resource-only caption visibility overrides the old presentation rule that hid the name; caption/actions backgrounds are transparent to remove the blank white interior. Embedded-reader controls and existing URL/download permissions are preserved. Targeted desktop/mobile browser checks, TypeScript, focused ESLint, and diff checks passed. Browser checks verified visible title, colors, icons, actions and side-column presentation. No live services or participant records accessed, no production push; review saves remain simulated.

### Requirement radio buttons — October 13, 2026

Short-response requirement dropdowns are now native radio groups for Required, Optional, and Recommended, on both the main card and advanced panel. Group names are separated between forms; synchronized state preserves one requirement_level value in the main save payload. Browser checks verified selection synchronization and submitted value, and TypeScript/ESLint/diff checks passed. No production push or database changes.

### Inline text-formatting selection — October 13, 2026

The inline editor now refreshes toolbar state on editor transactions; both style dropdowns reflect the selected text instead of retaining an initial value. Paragraph-style changes remove standard visual-size marks that would otherwise mask the chosen heading/body size, while deliberate advanced font overrides remain intact. Formatting buttons restore the current selected range, and a non-persisted ProseMirror decoration keeps the range visible while focus enters formatting controls. Local browser checks verified heading/visual-size round trips, current labels, retained selection through Bold/Italic/Underline, and return to Body. TypeScript, ESLint, 11 text-size/save-safety tests and diff checks passed. No content conversion, live saves or deployment performed.

### Lesson-navigation state isolation — October 13, 2026

The lesson canvas is now keyed by version and selected section ID. Moving to a different lesson remounts its local title, introduction, content editors, and advanced panels rather than reusing the previous lesson's uncontrolled input state. The outline and course-wide controls remain mounted. Content cards expose their original block IDs for local verification. Browser navigation between Prepare & Overview and The Posture of a Shepherd, including return navigation, verified correct visible/input titles, introductions, current-section block identities and closed advanced panels. TypeScript, focused ESLint, 11 integration tests and diff checks passed. Existing unsaved-navigation/recovery safeguards are unchanged. No course/participant data writes or deployment performed.

### Nine-style callout editor — October 13, 2026

Added Key Insight, Remember, Reflect, Put It Into Practice, Important, Scripture, Prayer, Discuss Together and Next Step. The main card provides a three-column icon picker, title/content fields, icon/title toggles and Left Accent/Outline/None border choices, with a live preview using the participant CalloutBlock renderer. Participant cards use soft colored surfaces, matching icons and accents. Mobile picker uses two columns. Advanced layout, typography, requirement, visibility and source tools remain available. Existing info/emphasis/warning/success callouts retain their original renderer until saved through the new editor. New appearance fields are validated optional JSON configuration; original legacy forms preserve these fields when present. No schema, policy, participant or live course changes occurred.

Verification: 14 local configuration/integration tests passed, including all nine styles, three borders, legacy compatibility and invalid-value rejection. TypeScript, focused ESLint, guarded production build and desktop/mobile browser checks passed. The review server restarted on localhost:32020 with scratch /var/folders/80/8s0shk7s74gc2tbtd5z2zmpr0000gn/T/purposeos-integrated-builder-zhNznP (session 14796). Saves remain simulated. No push or deployment.

### Document/file resource cards — October 13, 2026

Document and download blocks now share the non-embedded PDF card design, with a folder icon, resource name, optional description/file metadata, primary background and white open/download actions. The main builder card uses Header plus Resources/Upload controls and a live resource preview; advanced presentation and text-beside-file layouts remain available. Generic file selection/upload now includes supported images alongside PDF/office/text assets, retaining existing course ownership checks, MIME/signature/size validation and PDF-reader-specific restrictions. External URL-only files show Open; Download remains available only when an asset download URL exists. No embedded file viewer was added.

Verification: local desktop/mobile browser checks passed for resource selection/upload availability, folder icon, name, primary/white colors and action icons. TypeScript, focused ESLint, 24 integration/presentation tests, guarded production build and diff checks passed. Review saves/uploads remain simulated. No production deployment, live services or participant data changes.

### File attachment retention and working local preview — October 13, 2026

Resolved two distinct issues. Production metadata saves for image/document/download blocks no longer relink an unchanged external URL over the current native attachment; intentionally changed URLs still use the original URL-resource path. Resource selectors show the attached asset as their default and retain its option when searching or limiting results.

The isolated rehearsal now stores selected attachments and media edits in disposable scratch-only state, and locally uploaded supported files under its temporary public directory. Revalidation updates the actual builder asset/card after selection/upload. No captured snapshot, Supabase database or Storage objects are modified. The mock database still rejects insert/update/delete; only explicit fixture actions change the scratch overlay, which is guarded to run inside the offline rehearsal directory. Non-media fixture actions remain simulated. Real authenticated Supabase save/upload flows remain untested.

Verification: local browser selection → metadata save → reload retained the selected resource and preview URL. Folder/name/colors/action checks and mobile fit passed. TypeScript, ESLint, 13 targeted compatibility/retention tests, guarded production build and diff checks passed. Browser test metadata/attachment edits were removed from the review state after verification; future runs can restore prior state with CODEX3_REHEARSAL_STATE_PATH. No push or deployment.

### External Link compact resource card — October 13, 2026

External Link blocks now show Title (resource), Link and Subtext on the main authoring card, with a live shared participant ExternalResourceCard preview. Cards use a globe icon, course-primary outline, white course surface, dark text, and a rectangular primary/white Open button with an external-tab icon. Blank subtext falls back to the website hostname. The existing custom button label remains editable in advanced options; existing presentation, requirement, visibility and source controls are retained. HTTPS validation rejects unsafe URLs and external links open with noopener/noreferrer. Only the existing external_link block/configuration contract is used. The offline rehearsal supports local media metadata saves including external links.

Verification: desktop/mobile browser checks passed for field-to-card updates, title/subtext, primary border/button, white button lettering, 4px corners, new-tab links and unsafe-link rejection. TypeScript, focused ESLint, 13 compatibility/retention tests, guarded production build and diff checks passed. No external website was opened, no Supabase/Vercel contact, no push or deployment.

### Independent authoring-column scrolling — October 13, 2026

Desktop outline, lesson canvas and Companion now each fill the viewport below the actual workspace header and scroll independently. A client wrapper measures the available height on layout/resize/header changes; the three grid children override prior sticky/max-height rules and contain wheel overscroll. This removes the premature outline cutoff/blank area while additional chapters remain. Scroll regions support keyboard focus. Mobile retains the normal stacked page layout, and the previous builder is untouched.

Verification: real CDP mouse-wheel events scrolled each column independently without changing sibling positions. All three bottoms aligned with the viewport; resizing updated the height, mobile fit and zero external-request/runtime-error checks passed. TypeScript, focused ESLint, 11 integration tests and diff checks passed. No data changes or push/deployment.

### Longer reflection editor parity — October 13, 2026

Long-text Reflection blocks now use the same main-card authoring UI as Short Response: question/prompt, supporting instructions, placeholder, Required/Optional/Recommended radio group, Save and an inert native learner preview. Character limit remains in advanced options and defaults to 8000 for long responses, preserving existing configured limits. The preview retains long_text behavior and a larger paragraph-sized answer area. Main/advanced fields and requirement controls share the existing synchronized editor; completion, definition IDs and privacy contracts are unchanged.

Verification: temporary scratch-only reflection example passed desktop/mobile browser checks for default long limit, larger answer area, requirement/advanced synchronization and one save payload. Temporary fixture state was restored after testing; captured course content and participant data were not modified. TypeScript, focused ESLint, 29 integration/privacy-policy tests and diff checks passed. No production push or live service access.

### Single Select complete editor — October 13, 2026

Open http://localhost:32020, expand Add Content in a lesson and choose Single Select. The isolated review now supports creating and saving this block in disposable local authoring state. It does not modify the captured Hub Leader Course, Supabase, participant data or published versions. The local review banner now describes this distinction clearly.

**Creator controls:** question, instructions, directly editable choices, optional choice descriptions, Add, Duplicate, Delete, Enter-to-add, drag handles and accessible up/down ordering. New options receive stable UUID-based slug keys; renames/reorders keep existing keys, including existing keys up to the original 80-character maximum. Cards/List/Dropdown use radio controls styled like the requirement controls. Cards support one/two columns and stack on mobile. Required/Optional/Recommended radios remain available. Advanced response settings start collapsed: Reflection/Preference or Knowledge Check (self-check), optional correct-answer key, optional self-check points and post-submission feedback. Layout/typography, visibility and source controls remain in the existing side panel.

**Participant behavior:** all layouts use the same named response field and stable value key. Selection/clearing is local until the existing authorized draft/final action is submitted. Native radios/selects retain accessible names, required validation and keyboard interaction. No per-option Supabase fetches, polling or subscriptions were introduced. Saved state is acknowledged only by the original server receipt; revision/CAS, duplicate protection, finalized-response locking, authorized published-version validation and privacy policy remain in place. Feedback/self-check points are shown after final submission, derived from the selected key; they are not stored as authoritative grades. Legacy blocks with no display field retain their List rendering, and older authoring interfaces preserve newer configuration fields. Existing multi-select limits/contracts are unchanged; Single Select no longer has the arbitrary 50-option limit.

**Scope deliberately deferred:** free-text Other (requires extending the response value contract and profile/facilitator/export consumers), randomized per-attempt ordering (requires stable attempt/reload semantics), configurable unlocking after submission (requires an explicit authorized amendment policy), authoritative grade/score tracking (requires a server-owned scoring contract), and conditional navigation (requires course-runtime branching). A creator can already add an ordinary choice labelled Other, but no free-text answer is silently discarded. Question labels/instructions retain their existing plain-text storage; course typography/presentation controls provide compatible formatting without rewriting published content. Correct-answer configuration is delivered with the lesson, so Knowledge Check is an informal self-check rather than a secured examination.

**Verification:** 42 focused checks passed: configuration/legacy/stable-ID tests, real authorized response-mutation tests against an in-memory fake database, participant rendering/required/final-feedback checks, save-receipt success/failure regression, builder compatibility and privacy-policy tests. Browser checks passed for creation, direct editing, duplication/deletion, Enter-to-add, drag/keyboard ordering, stable IDs, all three layouts, selection retention across layouts, required controls, knowledge settings, save/reload, and responsive one-column cards. TypeScript, focused ESLint, guarded production build and diff checks passed. Browser fixture edits were restored after verification. No live participant reads/writes, Supabase/Vercel contact, migrations, push or deployment. Real authenticated integration validation remains outstanding before production release.

### Universal content save button — October 13, 2026

New-builder content editors now share BuilderSaveButton: full-width white background, thin grey outline, 5px corners and centered Save changes text. Main and advanced content saves use this component. Media saves moved below Resources/Upload controls and immediately before the preview, keeping their original form owner via the form attribute. Inline text retains its existing autosave/manual-save/recovery behavior; its manual save now uses the shared button above the editable content. Resource selection/upload, duplication/deletion, participant submission and legacy-builder controls remain separate.

Verification: desktop browser checked shared button width/style/form ownership across short response, callout, PDF, document, image, video, assessment, external link, rich text and heading. Media button-to-preview ordering and mobile fit passed, with no external requests or runtime errors. TypeScript, focused ESLint, 11 integration tests and diff checks passed. No live data changes, push or deployment.

### Video Universal Advanced Edit — local review, October 13, 2026

Open http://localhost:32020 and choose a lesson containing a Video block, then select **Edit** on that block. The isolated reviewer uses captured authoring metadata and a local media placeholder. Changes are saved only in its temporary rehearsal state; the original snapshot, Hub Leader Course, and participant records remain unchanged.

Video now uses three sections: Text Content (optional Header, Text, Subtext), Video Settings (URL and stacked/left/right layout), and collapsed Additional Customization. A shared contextual rich-text toolbar provides H1–H6, Body, Small, marks, links, lists, indentation, undo/redo, and deliberate font overrides. Main-card Header editing displays rich text rather than its serialized markup. Both surfaces share the same edit state and preview. An explicit Video text-editor marker is written only when presentation is edited; the shared participant media configuration suppresses duplicate native titles/descriptions and identical captions without deleting their stored values. Untouched legacy Video rendering stays unchanged. Duplicate, Move, and Delete remain available through the block's action menu, outside the advanced drawer.

Existing content metadata, separate subtitle/presentation caption/native media caption, explicit appearance overrides, unknown settings, source IDs, renderer, completion rules, and Companion architecture are retained. Unchanged saves skip writes. Changed saves submit a field patch and expected block revision through the existing authorization/hierarchy/draft checks, with scoped compare-and-swap and acknowledged receipts. Failed saves retain current inputs; duplicate submits are blocked. Explicitly clearing the URL removes its block-resource links rather than continuing to display the old linked source.

Verification: 36 focused tests passed (mapping, no-op preservation, all typography tokens/layouts, resets, unsafe input rejection, baseline compatibility, failed saves, stale/CAS conflicts, and source-link failure rollback); TypeScript and focused ESLint passed. Offline desktop/mobile browser checks passed for shared formatting and retained selection, independent caption preservation, layout previews, changed-only saves and no-op resaves, mobile fit, and zero runtime/console errors or external requests. Production webpack build passed with the existing network guard. No live Supabase was contacted.

Limits before production review: actual video playback/provider traffic and real Supabase writes were intentionally excluded. Resource-link changes retain the existing multi-statement architecture; failures return an error and conditionally restore block metadata, but full atomic rollback of resource-link operations requires a separate persistence design. Draft inputs remain recoverable in the mounted editor after a failure; reloading still requires retaining/copying unsaved work. New Video defaults are tested locally; live creation and published participant flows remain subject to later approved integration verification. This release is local only, pending owner review; no push, deployment, migration, or original course edit is authorized.

### Uniform text controls — October 13, 2026

The main inline rich-text editor and shared content/advanced text fields now use matching compact toolbar styling and white outlined text surfaces. The secondary size selector displays pixel sizes derived from course typography variables, rather than another H1–H6 label. Choosing a standard size also updates the primary style label for the selected text; visual size changes preserve heading semantics and selected ranges. Explicit arbitrary-size/font overrides remain available through Font… and existing Additional Customization controls. Generic presentation text fields now reuse the same rich-text controls while retaining their original form field names, initial values, save paths, and preview events.

Local verification: TypeScript and focused lint passed; 24 presentation/integration regression tests passed. Isolated desktop/mobile browser checks passed, including 28 px → H2, returning to H3, retained selection, and outlined surfaces. No live course or participant data was changed; no push or deployment. Review at http://localhost:32020.

### Compact universal rich-text editor — October 13, 2026

The shared editor now follows the supplied compact toolbar reference: accessible icon buttons with tooltips, paragraph/heading and pixel-size selectors, a grey toolbar, and white outlined writing areas. The canvas inline editor and shared advanced/content fields use `CourseEditorToolbar` and the same icon definitions. Font controls are behind the ellipsis button; existing font family, custom size, color, and reset controls remain available. Main editor internal links, lists, indentation, undo/redo, selection retention, autosave/manual save, revision handling, and browser draft recovery retain their original implementations. Media continues through existing content blocks/resource controls rather than being inserted into rich-text strings.

TypeScript, focused ESLint, 24 regression tests, and the offline desktop/mobile browser checks passed. Browser checks cover marks, font-size/style synchronization, retained selection, outlined fields, layouts, no-op saves, and independent caption preservation. Local preview remains http://localhost:32020; no live data changes, push, or deployment.

### Alignment, font packages, and custom sizes — October 13, 2026

Shared rich-text toolbars now provide left/center/right alignment. Alignment uses an explicit Markdown block wrapper and the same extension in the editor and participant renderer; existing content is not converted. Font-size selectors include common custom sizes such as 14 px, show Custom for deliberate non-token overrides, and retain arbitrary numeric sizes through the ellipsis controls. Choosing a standard token clears only the explicit size override and preserves font family/color.

Course Customization adds four packages using the existing available font families: Editorial headings/Sans body, Sans throughout, Editorial throughout, and Sans headings/Mono body. Separate Heading (H1–H6) and Body/Small font selectors and the existing per-style controls remain available. Packages modify family defaults only, retaining size/line-height/spacing values. Explicit content overrides are unchanged. Visual headings keep heading font defaults even when correctly rendered without semantic heading tags.

Verification: 15 focused tests passed, including alignment and explicit 14 px Markdown round trips, package validation and preservation, participant rich text, and existing creator-scoped draft typography protections. TypeScript, focused ESLint, production build and offline desktop/mobile browser checks passed. Browser checks included all alignments, rendered 14 px, standard-size restoration, package selection, and independent heading/body choices. Review uses the temporary fixture at http://localhost:32020; actual course typography writes remain excluded from offline verification. No live course/participant data changes, migration, push or deployment.

### Toolbar placement refinement — October 13, 2026

Main Video headers retain their directly editable outlined field and standard course sizing, without displaying rich-text formatting controls. Existing deliberate formatting is preserved. The full toolbar remains available in Advanced Edit, and main content text editors retain their toolbar. A presentation-only toolbar option controls visibility without changing content serialization, save paths, or course data.

### Lesson Heading Universal Advanced Edit — October 13, 2026

Open http://localhost:32020, select any lesson and click **Edit** on its **Lesson heading** card. The panel uses the existing Universal Advanced Edit shell, shared rich-text controls, side panel, and course typography. It provides Lesson Information, Lesson Hero Image, Display Options, collapsed Additional Customization, and Participant Preview. The participant renderer and builder share `LessonHeadingView`: chapter/week + stored lesson-group label, semantic lesson title, optional introduction, optional hero. No “Lesson Content” eyebrow or show/hide setting is introduced.

Schema/source relationships: the visible lesson title and introduction are `experience_sections.title` and `.description`; chapter titles live on `experience_modules`, and stored lesson-group titles on `experience_lessons`. Normal heading edits never write these shared tables. An optional chapter-label display override is lesson-specific; blank uses the existing shared names. Separate shared-title controls are clearly marked under Additional Customization. Their existing rename actions remain unchanged.

Section-only saves are changed-field patches with author/course scope, draft status, section/version matching, revision CAS, success receipts, and duplicate-submit guards. Unchanged saves skip writes and preserve null/empty settings without adding defaults. The heading settings merge retains hero references, unknown/legacy fields (including existing subtitle/eyebrow fields), and all section keys, renderer/custom/hybrid configuration, requirement/completion rules, IDs, Companion, progress, and responses. Existing plain introductions remain plain unless deliberately edited as rich text. The optional subtitle proposed earlier is omitted under the owner’s refinement; any stored legacy subtitle remains intact.

Hero selection, upload, replacement and removal reuse `setLessonHeroAction`, the media library, and `uploadCourseAsset`; asset URL/cache infrastructure is unchanged. The currently selected hero is resolved in the existing resource-ID batch, rather than adding an independent signed-URL path. Hero actions are guarded against duplicate submits and require outstanding heading edits to be saved first. A stored hero that cannot be previewed remains replaceable/removable. Display hiding retains its resource reference.

Verification: 17 focused tests passed (new/default and existing no-op preservation, source-field separation, unknown settings/hero preservation, invalid input rejection, author/draft/revision guards, CAS receipts/failures, and original builder contract compatibility). TypeScript, focused ESLint and production webpack build passed. Offline desktop/mobile browser checks passed for opening/no-op saves, title/rich-introduction edits, chapter-label visibility, custom 14 px title preview, heading save/no-op resave, hero library replacement/removal/upload, one temporary upload resource, and zero runtime/console errors or external requests. Browser fixture state is restored after the checks.

Limits: no live Supabase writes, real Storage upload, publishing, or actual new-course creation were performed. New heading defaults were verified in pure tests; course creation retains the existing creation actions. The local review is a captured authoring-data fixture, and its saves/uploads affect only temporary rehearsal files. Failed heading inputs remain in the mounted editor; unsaved inputs should be retained before reloading. No migrations, original Hub Leader Course/participant edits, push or deployment. The existing builder interface fallback remains available for rollback.

### Rich lesson title and bottom text save — October 13, 2026

Advanced Edit now uses the shared rich-text editor for both Lesson Title and Lesson Introduction. The title supports standard styles, custom sizes, marks, links and alignment. Its Markdown presentation is stored under `settings.lessonHeading.titleFormatting`; `experience_sections.title` remains the canonical plain-text label derived from that presentation for navigation and shared metadata consumers. The title renderer retains a semantic H1 and renders formatting through the same safe mark/link rendering as course rich text, without nesting headings or paragraphs inside the H1. A title renamed through another interface ignores stale presentation text. Legacy punctuation is escaped in the initial editor value and unchanged saves still preserve source data exactly.

The main text-block editor's existing full-width Save changes button is now below the writing surface, with its existing save/recovery/permission behavior intact. Shared Markdown parsing is centralized in `rich-text-document.ts`; existing rich-text extensions and participant rendering behavior are retained.

Verification: 21 focused tests, TypeScript, focused lint and production build passed. Offline browser checks verify rich title/intro formatting, plain title storage, visible participant formatting, no-op saves, custom sizes, media preservation and temporary uploads, mobile fit, and the main text Save changes position. No live Supabase/Storage writes, original course or participant changes, push or deployment.

### Named Google Fonts and polished typography customization — October 13, 2026

Course Typography is now a full-width card in the Course Customization grid, using the same icon/header, borders, controls and grey/white sections as Course Shell and Course Appearance. It includes named font packages, separate heading/body selectors, rendered font-library cards, collapsible individual H1–H6/Body/Small controls, and a live preview. The application’s existing `sans` and `editorial` keys remain compatible and are displayed as Geist and Cormorant Garamond. “Existing course font” labels are replaced by specific named defaults. PurposeOS standard remains Cormorant Garamond headings with Geist body text; existing course configuration is not rewritten.

Added locally hosted Google Fonts: Lato, Roboto, Open Sans, Inter, Montserrat, Poppins, Merriweather and Playfair Display. Each font includes regular/bold and italic faces, Latin coverage, provenance and its SIL OFL license in `public/fonts/courses`. Font files are loaded when the family is used; no Google Fonts requests are needed during participant viewing. Library cards render their name and sample in the actual family. Named families are accepted by the shared course-token validator and safe inline override serializer. Font packages retain custom sizes/spacing and deliberate content overrides. Selection changes only local preview until the existing draft typography action is saved.

Verification: 15 focused tests passed, including saved-typography reload preservation, named-family serialization, package preservation, safe input checks and original typography authorization/draft/revision safeguards; TypeScript and focused ESLint passed. Offline desktop/mobile browser checks verified Lato family rendering, successful local font loading, named defaults, package selection and zero external requests. Production build passed. The owner may review at http://localhost:32020 → Course Customization. No live course/participant writes, push or deployment.

The course configuration normalizer now retains explicitly stored, validated typography, which was previously omitted during reload. Unconfigured courses still emit no typography defaults. This is a read-path correction; it does not write existing course data.

### Sixteen-choice Font library — October 13, 2026

The heading is now simply **Font library**. Cards 9–11 show the existing Cormorant Garamond, Geist and System monospace families. Added Nunito, Raleway, Libre Baskerville, Source Sans 3 and Roboto Mono as cards 12–16, with locally hosted regular/bold/italic assets and licenses. All 16 cards render in their named family, and the selectors retain the same choices. The safe inline serializer now accepts digits in approved font keys such as `source-sans-3`.

Verification: 16 focused tests, TypeScript, lint, production build and offline desktop/mobile browser checks passed, including the exact library label, 16 distinct cards, standard-font positions, named-family round trips and local font loading. No live data changes, push or deployment.

### Neutral advanced editing size — October 13, 2026

Advanced-panel writing surfaces now display text at a consistent 16 px editing size and 1.5 line height, including headings and selected-text overrides. Stored font sizes, style labels, marks and content are unchanged. Participant and builder previews remain outside this editing-only CSS scope and show actual selected typography. The offline lesson-heading browser checks passed, including a 16 px title writing surface and a separately selected 14 px preview title, no-op/save preservation and mobile fit. No live data changes or deployment.
