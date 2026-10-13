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
