# Local integration scope

Tracked changes (no staging or commit performed):

- `.gitignore`
- `app/admin/trainings/[experienceId]/edit-actions.ts`
- `app/admin/trainings/[experienceId]/versions/[versionId]/page.tsx`
- `app/globals.css`
- `components/admin/BlockPresentationFields.tsx`
- `components/admin/BuilderBlocks.tsx`
- `components/admin/CourseBuilderWorkspace.tsx`
- `components/admin/CourseCustomizationWorkspace.tsx`
- `components/admin/InlineTextBlockEditor.tsx`
- `components/experiences/builder/ParticipantCourseRuntime.tsx`
- `components/experiences/builder/ParticipantRichText.tsx`
- `lib/experiences/admin/block-mutations.ts`
- `lib/experiences/admin/inline-draft.ts`
- `lib/experiences/builder/block-presentation.ts`
- `lib/experiences/builder/block-registry.ts`
- `lib/experiences/builder/course-configuration.ts`
- `lib/experiences/builder/course-text-size.ts`

New implementation: shared builder cards/panels, tabs, preference, live text preview, typography controls, retained legacy workspace/blocks, safe typography/font modules, offline rehearsal launcher/fixtures and focused tests. Prototype and captured-source development routes remain development-only; authoring snapshots/media are Git-ignored. Unrelated audit/release artifacts are outside this change.

## Single Select review addition

- `components/admin/SingleSelectCardEditor.tsx`: modern authoring UI, stable choice keys, drag/keyboard order and interactive preview.
- `components/experiences/builder/SingleSelectChoices.tsx`: shared Cards/List/Dropdown controls with one response-key contract.
- `BuilderBlocks.tsx`, `ParticipantResponseBlock.tsx`, `ParticipantResponseForm.tsx`, `app/globals.css`: integration, finalized self-check feedback, clear-selection dirty state and course-aware presentation.
- `block-registry.ts`, `response-registry.ts`, `block-mutations.ts`: validated optional presentation/self-check fields, legacy setting retention and stable-ID preservation; no participant storage schema change.
- Local rehearsal fixtures: disposable creation/metadata persistence for Single Select; captured course and live services remain untouched.
- Focused Single Select configuration, browser, persistence and rendering tests; see REVIEW-AND-ROLLBACK.md for verification and deferred capabilities.

Video Universal Advanced Edit adds `UniversalAdvancedEdit.tsx` (reusable three-section shell), `UniversalTextFields.tsx` (shared contextual rich-text editing), `VideoAdvancedEditor.tsx` (one Video session/main/advanced preview), and `video-editor.ts` (lossless changed-only mapping/validation). It integrates through existing BuilderBlocks/BuilderEditCard/CourseSaveStatus and the existing layout action/block mutation files. Minimal BlockPresentation typography extensions support Body/Small and independently stored subtitle/caption sizes. Offline regression coverage is in `video-editor.test.ts`, `video-save.test.mjs`, and `video-universal-browser.mjs`; rehearsal actions remain isolated from live data.

Lesson Heading redesign: `LessonHeadingEditor.tsx` reuses the shared advanced-edit shell/text controls and existing hero actions; `LessonHeadingView.tsx` is the shared participant/builder preview. `lesson-heading.ts` provides lossless section-field mapping/validation, and `lesson-heading-actions.ts` provides creator-scoped draft CAS saves without changing shared titles. CourseBuilderWorkspace resolves the selected hero in its existing batch and connects the panel; ParticipantCourseRuntime delegates only heading/hero rendering to the shared view. Offline section shadows and hero fixture actions support local review; tests are `lesson-heading.test.mjs` and `lesson-heading-browser.mjs`.

## Universal Advanced Edit — October 14

The complete native-block rollout is documented in [UNIVERSAL-ADVANCED-EDIT.md](UNIVERSAL-ADVANCED-EDIT.md).

Shared draft/validation: `lib/experiences/builder/universal-block-editor.ts`. Shared authoring UI: `components/admin/UniversalContentEditor.tsx` and existing `UniversalAdvancedEdit`/`UniversalTextFields`. Shared participant preview/runtime: `components/experiences/builder/UniversalContentView.tsx`. BuilderBlocks selects the new editor for native content only. Scoped save action and mutation preserve existing author/draft checks, response privacy metadata, history protections, and resources. Native response/media/PDF/assessment components receive optional presentation props while retaining their default behavior for unedited content.

Focused tests: `scripts/prototypes/universal-edit.test.mjs` and `universal-edit-browser.mjs`. The isolated rehearsal now supports guarded temporary native saves and a native learner preview through `integration-fixtures/UniversalLearner.tsx`.

## Multi Select — October 14

See [MULTI-SELECT.md](MULTI-SELECT.md) for scope, review instructions, tests and limitations. Single/Multi Select now share `ChoiceOptionEditor` and `ChoiceOptionRows`; `MultiSelectChoices` adds checkbox state, count/cap feedback and clearing. `multi-select.ts` centralizes authoring/learner/submission limits, and `choice-options.ts` preserves stable-key operations. The universal editor and native response renderer reuse existing save, formatting, permissions, and completion paths. The isolated learner fixture accepts synthetic saved responses solely for compatibility testing; no participant data is imported.

## Checkbox / Confirmation — October 14

See [CONFIRMATION.md](CONFIRMATION.md) for review instructions, preservation details and verification. The universal content editor reuses its four-field rich-text formatting session, response controls, Save/Cancel and preview for `check_in`. `ConfirmationChoice` reuses shared choice card/list CSS and native boolean inputs; `confirmation.ts` resolves the authoritative checkbox statement and matching formatting cache. Registry changes add compatible optional description/style fields and the Checkbox / Confirmation authoring label. Native required validation uses the requested message; unchecked finalized display reads Not confirmed. Confirmation regression/persistence tests and the disposable browser rehearsal cover old native responses without touching real participant data.

## Personal / Cohort field preview — October 14

`getAdminCoursePreview` now exposes a generic Cohort preview for `cohort_pathway` courses even without a cohort offering pinned to the draft. The existing selector and preview URLs retain Personal and configured cohort options. `loadCompanionRuntime` accepts a preview-only cohort-context flag; it exposes configured cohort cards, including the video-call placeholder, while retaining personal/shared cards and existing live authorization behavior. No participant notes, membership details, chat messages or call sessions are loaded for the generic field preview. Invalid context requests and unauthorized preview requests remain rejected.

Four focused regression tests, a browser Personal → Cohort → Personal interaction, TypeScript and lint passed. The isolated review provides `/dev/companion-preview` using captured authoring configuration only; this route is not added to the production app. No course data or deployment changes were made.
