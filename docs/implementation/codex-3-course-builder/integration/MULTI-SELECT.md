# Multi Select — local review, October 14, 2026

Multi Select retains the native `checklist` block and `multi_select` response definition. No tables, migrations, published content, participant records, or authorization rules were changed.

## Open the editor

Open http://127.0.0.1:32020/?builder=modern, select a lesson, and choose **Add Content → Multi Select**, or Edit an existing Multi Select block. Both its main editor and Advanced Edit use the same saved draft and live preview. Temporary authoring changes remain in the isolated rehearsal.

## Changes

- Question, instructions, answer options, Cards/List, conditional one/two card columns, selection limits, Requirement, Advanced response settings, Additional customization, Save/Cancel, and interactive participant preview are in the requested order.
- `ChoiceOptionEditor` is reused by the rebuilt Single Select and Multi Select, including the standalone Single Select editor: identical drag handle, up/down, duplicate, delete, Add option, collapsed descriptions, spacing, and label controls. Existing keys survive reordering and edits; duplication generates a new UUID-based key. The native history guard still blocks adding/removing choices after responses exist.
- `ChoiceOptionRows` provides the shared card/list markup. Multi Select uses native square checkboxes, clickable labels covering the whole card/row, selected styling, keyboard focus, option descriptions, generated instructions, live selection counts, maximum explanation, and Clear selections. Selected choices stay enabled at the maximum. Mobile cards stack into one column.
- Minimum defaults to zero. An omitted/null maximum means No maximum. Existing numeric caps and legacy numeric-string limits remain readable. New blocks default to Cards/two columns; existing blocks without display settings retain List.
- Native draft saves accept incomplete selections. Final submission enforces the effective minimum and maximum; Required has a minimum of at least one. Optional and Recommended allow an unanswered final response, but enforce configured limits when answered. Invalid limits, unknown keys, and duplicate keys are rejected with specific messages.
- The universal formatting session, neutral-sized advanced text fields, typography tokens/range overrides, appearance controls, scoped save receipts, Cancel, and appearance/layout Reset are reused. Question and instructions retain their canonical native response-definition values; rich title formatting is a matching-text cache rather than a competing prompt. Deliberately blank instructions stay blank after saving/reloading.
- Advanced response settings show the existing response visibility/sharing policy and preserve those values. Draft/final submission remains governed by the existing response form and permissions; no new privacy or draft/final-toggle flags were introduced.

## Verification

71 focused regression tests passed, covering selection/configuration validation, default and legacy caps, optional/required final rules, draft and finalized compatibility, stable-key option operations, question/blank-instruction preservation, existing Single Select rendering and persistence, authorization/revision/finalized-answer protections, history checks, save failures, and unchanged course authoring/publication/access contracts.

Six actual browser scenarios passed in disposable Chrome:

1. Editor order, shared option controls, Cards/List only, and defaults.
2. Add, duplicate, descriptions, drag, move, delete, and retained keys.
3. Cards/List, one/two columns, mobile stacking, maximum/deselection/clear, keyboard focus, and checkbox accessible names in Chrome's accessibility tree.
4. Invalid limits, failure receipts, Cancel, and Required/Optional/Recommended instructions.
5. Correct header/body selection formatting, retained highlights, save/reload, cleared saving indicators, blank supporting text, and canonical storage.
6. Native learner rendering of synthetic legacy draft/finalized responses without a resave; the final answer remains locked and original saved keys remain unchanged.

Browser runs recorded zero runtime/console errors and zero external HTTP requests. Tests restore the previous scratch authoring state. TypeScript, targeted lint, and the production build passed.

Commands:

```sh
node --test scripts/prototypes/{multi-select,multi-select-persistence,single-select-render,single-select-persistence,universal-edit,builder-integration,course-font-alignment}.test.mjs lib/experiences/builder/{block-registry,single-select}.test.ts
npx tsc --noEmit
# multi-select-browser.mjs requires the isolated rehearsal-state path and a free Chrome debugging port.
```

## Limits of this review

Authenticated production submissions were not performed. Existing-answer tests use synthetic records with the existing saved-response shape, not real participant data. Keyboard and browser accessibility-tree semantics were checked; a dedicated VoiceOver/NVDA session was not run. Response privacy remains managed by the existing course access policy and is shown read-only in this editor.

The inherited universal save still spans block/definition rows with revision checks and conditional rollback rather than an atomic database transaction. Nothing was committed, pushed, or deployed.
