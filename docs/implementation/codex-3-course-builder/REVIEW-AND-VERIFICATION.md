# CODEX 3 owner review and verification — October 12, 2026

## Scope and evidence

An isolated fictional four-week course creator is implemented. The user’s typography amendment governs the prototype’s editor and learner presentation. Existing Hub Leader Course content, themes, Companion, participant data, progress, enrollments and all existing tracked application files remain unchanged. No database query, migration, live write, push or deployment was performed for CODEX 3.

The bounded inspection reused the earlier course-builder audit, current builder routes, InlineTextBlockEditor, CourseCustomizationWorkspace, theme resolver/validation, block registry, Companion library/scope functions, ParticipantRichText, CourseTextSize and the historical Hub Leader import plan. The previously documented source ZIP is absent from this workspace. Its historical 16-module / 18-lesson / 67-page / 197-block proposal does not establish the current live curriculum. **Full current Hub Leader Course parity is unverified.** No live course or participant data was fetched to fill that gap.

## Creator workflow comparison

| Existing source workflow | Prototype for review |
|---|---|
| Existing outline, inline editing, draft/version and detailed page/layout controls coexist. | A persistent collapsible chapter/lesson outline, one selected lesson editor and inline Add content controls; deeper hierarchy is revealed deliberately. |
| Heading/font controls include legacy H1–H4 text-size conventions and independently styled wrappers. | H1–H6, Body and Small share course-scoped tokens; semantic headings and equivalent visual paragraph styles are distinct. |
| Draft shell, appearance, branding, palette and theme configuration are managed by Course Customization. | The same authority is retained: Companion maps to `version.shell_mode`; reading width/accent map to existing `course_configuration.appearance`; display branding maps to `card.headline`. Typography/theme demo extensions stay under Customization. |
| Live saves and releases use established authorization, CAS/save receipts and published-version protections. | Local-only browser receipts and cross-tab conflict handling are demonstrated; production controls are disabled and no real mutation adapter is called. |
| Custom/hybrid blocks, layout columns, resource relationships, theme overrides and Companion have their own model/registries. | Same `BuilderCourseStructure` hierarchy and Companion record/scope definitions; nested/custom data stays intact, with explicit Advanced Editor and safe unsupported-content fallbacks. |

The comparison is source-level and demonstrative. No creator task-time or production request-speed gains are claimed.

## Typography contract

Theme → course token override → explicit selected-text override. Semantic H1–H6 nodes use real heading tags. A paragraph may carry an H4 visual token without becoming an H4 heading. The editing surface, standard headings/media captions/reflection labels/download titles and learner renderer import the same token definitions and scoped CSS; bold and italic are independent marks with inherited font size. Underline, safe links, ordered/bullet lists, quotations and supported rich-text structure are retained. Default normal weight is 400; bold is 700, with italic orthogonal to weight/size.

| Style | Desktop px | Mobile px | Line height | Space before px | Space after px |
|---|---:|---:|---:|---:|---:|
| H1 | 32 | 26 | 1.20 | 24 | 14 |
| H2 | 27 | 24 | 1.25 | 22 | 12 |
| H3 | 23 | 21 | 1.30 | 20 | 10 |
| H4 | 20 | 19 | 1.35 | 18 | 9 |
| H5 | 17 | 17 | 1.40 | 16 | 8 |
| H6 | 15 | 15 | 1.45 | 14 | 7 |
| Body | 16 | 16 | 1.65 | 0 | 14 |
| Small | 13 | 13 | 1.55 | 0 | 8 |

Letter spacing defaults to 0. Mixed uses editorial/Georgia headings and the available sans font for Body/Small; Sans uses sans throughout; Editorial uses the editorial family throughout. Per-style family controls and selected-text custom fonts remain available. These are **proposed prototype defaults**, not approved live theme replacements. The real course’s existing font configuration and inline formatting are not converted.

At viewport widths up to 640px, or inside the explicit mobile learner preview, mobile sizes apply consistently across standard blocks. Explicit font-size spans retain their own size. Reset to course style clears explicit font marks only. Course token changes never rewrite block documents or custom/legacy configuration.

## Compatibility and preservation

- One existing course hierarchy: Experience → Version → Module → Lesson → Section → Layout → Column → Content. No replacement curriculum engine or production schema is introduced. The launcher is a temporary rendering shell around the same source components.
- No-op serialization tests preserve nested layouts, custom renderer/source, legacy raw HTML/CSS, metadata, order, resource references and Companion records exactly.
- Selected-content edits leave other lessons, custom columns, resource references and metadata unchanged. Duplication remaps known hierarchy IDs; opaque configuration/resource IDs stay intact. Unloaded duplicated lessons receive unique hydrated child IDs.
- Week 4 demonstrates two content columns, a hybrid section, known custom interaction and opaque system/integration configuration. Arbitrary source/HTML is never executed by the demo.
- All current block categories remain representable: heading, rich text, callout, image, video, PDF reader, document, download, external link, reflection, checklist, check-in, card selection, structured response, prebuilt assessment, custom component and system component. Ordinary editors are provided for representative standard content; advanced types use preserved JSON and safe fallback presentation. Native assessment launch/integration/media resolution remain intentionally disconnected.
- Companion remains the participant’s third column, never a creator settings sidebar. It reuses existing type, availability, audience and scope definitions; future/call/group integration modules remain explicit placeholders. Private notes stay separate from exported course data.
- Existing live custom runtimes, route handoffs, Advanced Editor, branding/asset upload controls, theme/version behavior and CODEX 1/2 security/performance code are untouched. Their full interoperability with a future redesigned editor is **not established by this prototype**.

### Future integration gates — not authorized in this phase

New demo rich text uses an additive `demoDocument` JSON sidecar in the existing block configuration to exercise semantic/visual tokens. It does not reinterpret or rewrite legacy Markdown or inline HTML. A future approved integration must provide a versioned serialization/validation adapter, extend existing H1–H4-only paths safely, preserve old inline styles and custom CSS, connect existing response/resource mutations and save receipts, and use these same typography definitions in the published participant renderer. **The published participant experience is not modified or claimed verified here.** Actual Hub Leader Course regression data, fresh role checks, drafts/published immutability, privacy, resource signing and rollback gates remain required before live integration.

## Local verification

- **11 offline tests passed:** fictional outline/body loading, 40-week/80-lesson scalability, exact no-op round trip, isolated edits, duplication IDs and references, reorder/no-op boundaries, typography precedence, local receipt/conflict/quota behavior, development-only route, no service/mutation imports, malformed recovery and existing customization authority mapping.
- **20 real headless Chrome checks passed:** chapter/lesson add/rename/copy/reorder, active rich-text formatting and semantics, H4 consistency, token/theme changes, override/reset, safe/executable links, lists, save/reload, Advanced Editor round trip, hybrid map interaction, Companion visibility, real cross-tab conflict, quota failure/retry, 32-week/64-lesson navigation, mobile typography/overflow and reset keyboard Escape.
- Browser evidence: **0 external requests, 0 runtime exceptions, 0 console errors** using disposable signed-out profiles. The final run used the isolated launcher with no platform auth/proxy/credentials. The launcher also blocks non-loopback server network requests.
- Synthetic 40-week fixture: 80 lesson outlines, one hydrated lesson, 72445 serialized JSON bytes. The UI mounts only the selected body and active rich-text editor. This is not a production latency or request benchmark.
- TypeScript and prototype ESLint passed. The full local Node 24.21.0 production webpack build passed with all non-loopback requests blocked. No package dependencies changed.
- Real local HTTP checks: production build prototype route **404**; isolated developer demo **200**.
- Full live save/publish, real private resources, real cohort integrations, assistive-technology walkthrough and current actual-course parity remain unverified. No deployed Preview was requested or created.

Reproduce:

```sh
node --test scripts/prototypes/codex3.test.mjs
npx tsc --noEmit
npx eslint components/course-builder-prototype lib/experiences/builder/prototype app/dev/course-builder-prototype
node scripts/prototypes/open-demo.mjs
# In a second terminal, with Google Chrome installed and the demo running:
node scripts/prototypes/codex3-browser.mjs
```

The browser script uses a disposable profile and blocks external destinations. Optional `CODEX3_LOCAL_URL`, `CODEX3_CHROME_PATH` and `CODEX3_ARTIFACT_DIR` customize local-only verification. Browser/HTTP results are included beside this report.

## Owner review checklist

- [ ] The Chapter → Lesson → Content workflow is clear, including add/rename/copy/reorder.
- [ ] The proposed desktop/mobile heading scale and three font themes look right.
- [ ] An H4 matches across ordinary text and callouts; bold/italic/underline keep its assigned size.
- [ ] Changing course typography updates standard content while deliberate font overrides remain.
- [ ] Semantic headings versus visual paragraph sizes are understandable.
- [ ] Custom/hybrid/unsupported content remains discoverable in Advanced Editor without flattening.
- [ ] The three-column learner view and mobile Companion presentation preserve the intended architecture.
- [ ] Local save/recovery wording is clear and cannot be mistaken for live publishing.

No live integration is approved by the existence of this prototype. Owner design review is the stop point; a subsequent implementation scope needs explicit approval.

## Screenshots from real local interaction checks

[Builder](screenshots/builder-desktop.png) · [Learner preview](screenshots/learner-desktop.png) · [Mobile](screenshots/mobile-preview.png). Screenshots include deliberate fictional test edits, not real curriculum or participant work.

## Modified-file list

All files below are new. No existing tracked application file was modified. Unrelated pre-existing untracked CODEX 1/audit artifacts were preserved.

- `app/dev/course-builder-prototype/page.tsx`
- `components/course-builder-prototype/CompanionPreview.tsx`
- `components/course-builder-prototype/CourseBuilderPrototype.tsx`
- `components/course-builder-prototype/Customization.tsx`
- `components/course-builder-prototype/LessonContent.tsx`
- `components/course-builder-prototype/Prototype.module.css`
- `components/course-builder-prototype/RichText.tsx`
- `components/course-builder-prototype/Typography.module.css`
- `lib/experiences/builder/prototype/fixtures.ts`
- `lib/experiences/builder/prototype/model.ts`
- `lib/experiences/builder/prototype/storage.ts`
- `lib/experiences/builder/prototype/typography.ts`
- `scripts/prototypes/codex3-browser.mjs`
- `scripts/prototypes/codex3.test.mjs`
- `scripts/prototypes/open-demo.mjs`
- `docs/implementation/codex-3-course-builder/README.md`
- `docs/implementation/codex-3-course-builder/REVIEW-AND-VERIFICATION.md`
- `docs/implementation/codex-3-course-builder/browser-verification.json`
- `docs/implementation/codex-3-course-builder/http-verification.json`
- `docs/implementation/codex-3-course-builder/screenshots/builder-desktop.png`
- `docs/implementation/codex-3-course-builder/screenshots/learner-desktop.png`
- `docs/implementation/codex-3-course-builder/screenshots/mobile-preview.png`

## External Actions Required

**None for local review.** The server is running at `http://localhost:32013/dev/course-builder-prototype`. Restart with the launcher command if necessary. No Supabase/Vercel login, migration, production data change, paid resource or deployment is required. Remote Preview or live integration needs separate explicit approval.

### Owner review follow-up: drag and universal text editing

Added native desktop drag handles for chapters, lessons and blocks, retaining accessible up/down alternatives. Drops reorder before their target within the existing chapter/column; external and mismatched drag targets are ignored. IDs, nested layout relationships, resources, custom configuration and Companion records are preserved.

Chapter, lesson and optional section heading formatting uses additive demo metadata, synchronizes plain navigation titles, and renders through the shared preview renderer. Ordinary content string fields use additive `configuration.demoTextFields` sidecars; original field values remain synchronized. Editors mount only while expanded. All 17 content categories and block Advanced Editor remain. Raw source, resource IDs/URLs, structured data and image alt descriptions retain their existing advanced/plain controls. Published runtime and participant data remain untouched.

Verification: 13 offline tests pass; TypeScript and lint pass. All 22 browser checks pass, covering drag ordering and heading formatting controls alongside the prior full demo flows; zero external requests, runtime exceptions or console errors. Native drag uses desktop HTML drag-and-drop; touch users can use the retained arrow controls. No live integration or deployment is authorized by this follow-up.

### Advanced-panel and fifth-section follow-up

- Added a consistent right-side Advanced panel, responsive mobile drawer, Escape/close behavior and immediate font-size updates without input blur. Font selections keep their assigned typography token and explicit overrides.
- Added named per-block title/prompt/instruction editors, optional subtitle/supporting-text/caption documents, alignment/padding/width/background/border controls, and appearance reset. These use additive `demoAdvanced` / `demoTextFields` sidecars and retain all opaque configuration fields.
- Media controls include source URL, image alt/fit, video poster/transcript and resource button label. Remote assets remain unrequested. Responses expose required/type and item-label controls; actual production response definitions, permissions and persistence remain untouched. Block visibility/requirement/completion options are draft values only.
- Chapter/lesson Advanced controls include heading typography, supplemental text, appearance and existing requirement fields. Existing customization, Companion and nested-layout architecture remain unchanged.
- Section 5 is appended idempotently to existing local demos. Its 17 on-demand example lessons cover all content types, with advanced presentation features visibly applied. The original four weeks and existing browser edits are preserved.
- Source remains separately expandable, validates objects before applying, and preserves block hierarchy IDs. Ordinary named controls are live local edits; closing does not roll them back. Unsupported external runtimes are explicitly identified as placeholders.
- New components: `AdvancedOptions.tsx`, `SidePanel.tsx`; enhanced `TextField.tsx`, `RichText.tsx`, `LessonContent.tsx`, workspace, styles, fixtures, and prototype tests. No published renderer, migration or existing course is changed.

Verification for this follow-up: production webpack build, TypeScript, lint and 14 offline tests pass. The 24-check browser suite covers all 17 showcase examples, side-panel layout, live font sizing, named video title editing, local persistence, mobile drawer, and the existing regression flows. Browser evidence is refreshed after the final run; no external requests or participant data are involved.

### Standardized Edit entry point

All chapter/lesson/section text lines and content cards now use the same **Edit** button on their right side. It opens the shared side panel containing text formatting and advanced options. Removed the separate Advanced Editor button and inline heading-formatting disclosures. Content text can be edited directly inside its sidebar; existing initial inline writing remains available. Verified through 14 offline tests, TypeScript, lint and the 24-check browser suite, including heading sidebars and all 17 showcase types. The additional full-app production build attempt was blocked by the offline network guard when next/font tried to fetch Cormorant Garamond and Geist from Google Fonts; no external request was allowed and no compilation defect was reported in the edited prototype. This attempt does not supersede the earlier successful production build, but the new UI revision does not have a completed production-build verification. No live integration or data changes.

### Unified content-card presentation

Heading/text fields now reuse the exact `contentCard`, `contentHeader`, `contentType`, `contentBody` and `editButton` styles used by content blocks. This presentation change preserves chapter/lesson/section identity and existing sidebar editing; it does not convert headings into database content blocks. TypeScript, lint and the local browser regression suite verify the change.

### Current Hub Leader owner-review copy

The owner explicitly redirected integration work to a dev-only copy of the full current course before approving system changes. Verified `wayfinders-os` metadata and read current published authoring version `34181531-b723-4d7f-863a-3b5da948110d` in read-only transactions. The baseline contains 16 modules, 16 lessons, 68 sections, 194 blocks, 49 response definitions and five Companion definitions. Linked assessment authoring metadata and 42 resource records were also captured; 36 stored course images/PDFs (107,663,716 bytes) were copied with bounded read-only GETs. No participant dataset, live mutation, migration, push or deployment occurred.

New local review mode shares the prototype's cards/sidebar/typography/layout tools, renders the original Markdown and native question definitions, exposes per-lesson page navigation, serves local media, and uses native assessments in preview mode. Legacy Life Mapping U, external forms/videos and live Companion activity remain explicitly inactive. Raw source snapshots are Git-ignored in `.local/course-review/`. Existing tracked builder/participant files remain unchanged; the only tracked change is the local snapshot ignore rule. See `hub-leader-review/README.md` for launch instructions, limitations and verification evidence. Earlier statements that no course source had been read describe the preceding fictional-prototype phase; this owner-authorized review copy supersedes that specific source-data gap without claiming production integration parity.
