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
