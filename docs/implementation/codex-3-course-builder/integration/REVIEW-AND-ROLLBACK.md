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
