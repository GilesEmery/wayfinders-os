# Checkbox / Confirmation — local review, October 14, 2026

Open http://127.0.0.1:32020/?builder=modern, select a lesson and choose **Add Content → Checkbox / Confirmation**. Edit opens the shared Advanced Edit drawer. The existing isolated rehearsal stores only temporary authoring changes; it never writes to the Hub Leader course or participant tables.

## Changes

The native `check_in` block remains one checkbox with `{ value: true | false }` response storage and the existing completion, authorization, revision, draft and finalization paths. There is no separate Yes/No interaction. An unchecked finalized response is displayed as **Not confirmed**.

The universal editor uses the requested order: question/heading, optional supporting instructions, checkbox statement and optional description, Card/List display, Required/Optional/Recommended, advanced response settings, collapsed Additional customization, Save changes/Cancel, then interactive learner preview. No choice-management, dropdown, selection limits/counts, Clear selections or card-column controls are shown. The shared rich-text fields and formatting session support independent selected-range formatting in all four text fields. The appearance/layout reset retains authored text, deliberate formatting and native response configuration.

The learner choice reuses Single/Multi Select card/list classes, course typography tokens and primary-color styling. It contains a native, accessibly named square checkbox with a description association, checked styling and keyboard focus. Space and clicking the choice text or row toggle it. Rich-text links retain their independent navigation and do not toggle the checkbox. Native browser validation and server submission validation use the same required-confirmation message: **Check the box to confirm before submitting.** Drafts can remain unchecked; Optional and Recommended final submissions can retain false.

## Preserved data

Existing blocks without display/description/formatting settings render without resaving, using List and their native affirmative label. `affirmativeLabel` stays authoritative; optional `statementFormatting` is a matching-plain-text cache, so stale rich formatting cannot hide a legacy label edit. Optional `statementDescription`, `statementStyle`, `descriptionStyle` and `displayStyle` extend the existing configuration compatibly. Unknown configuration/settings remain preserved. The native response-definition label and instructions stay authoritative for question/supporting text; blank instructions remain blank. Opening and saving an unchanged block performs no writes.

Existing response visibility/sharing fields are displayed and retained, with no new permission flags or privacy controls. Submitted answers remain locked according to existing permissions. Preview interactions do not save responses.

## Verification

- 84 focused regressions passed, including 13 new confirmation tests: required submission, optional/recommended false finalization, unchecked drafts, saved true/false compatibility, no-op saves, question/blank-instruction preservation, rich description rendering, stale-cache handling, revision/access/finalization guards and unconfirmed-write failures. Existing Single/Multi Select and universal editor/integration tests also passed.
- Six browser scenarios passed in disposable signed-out Chrome against the guarded local rehearsal: editor structure; Card/List, full-row click and Space; requirements/validation/focus/accessibility tree; independent highlighted-field formatting and links; save errors/Cancel/reset; Save/reload/no-op and old synthetic saved true/false responses. Desktop 1440px, tablet 820px and mobile 390px were checked. Bold/underline preserve selected heading-size tokens. No browser runtime/console errors or external requests occurred; synthetic state was restored after the run.
- TypeScript, focused ESLint, production build and diff whitespace checks passed.

The native persistence pipeline was exercised with a fake database/resolver, not live authenticated participant submissions. Accessibility was checked with keyboard interaction and Chrome's accessibility tree, not a dedicated VoiceOver/NVDA session. The inherited two-row native editor save remains guarded by revisions and conditional rollback; this change adds no database transaction or schema migration.

Nothing was committed, pushed or deployed. Published content and participant data were not modified.

Local review captures: [advanced editor](confirmation-advanced.png), [mobile preview](confirmation-mobile.png), [learner preview](confirmation-learner.png).
