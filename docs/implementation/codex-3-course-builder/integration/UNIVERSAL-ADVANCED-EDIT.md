# Universal Advanced Edit — local review, October 14, 2026

The modern builder now uses one edit session for all 14 requested native content types, plus the legacy Download alias. Lesson Heading retains its existing shared editor. Custom/system/hybrid renderers keep their registered editors.

## Review

Open http://127.0.0.1:32020 and select a lesson. Each native content card's Edit button opens the shared right-hand drawer. The content-specific controls come first; Additional Customization is collapsed below them. Save changes and Cancel precede the participant preview.

After saving temporary authoring edits, http://127.0.0.1:32020/dev/universal shows those edits through the native participant block renderer. This route belongs exclusively to the disposable offline rehearsal; it is not added to the live portal. Native participant responses and assessment launches are disabled in this review.

Restart with `node scripts/prototypes/open-integrated-builder.mjs`. The launcher creates a disposable authoring copy, replaces provider calls with guarded local fixtures, strips provider credentials, and blocks external requests. The original captured course files are read-only inputs. Local changes disappear when the disposable rehearsal is removed.

## Shared behavior

- Canonical visible header and rich body, independent H1–H6/Body/Small tokens, existing range-formatting toolbar, numeric overrides, alignment, lists, links, and indentation.
- Neutral-sized advanced editor text; the participant preview renders the actual selected typography.
- Type-specific media, resource, PDF, link, callout, response, choice, and assessment controls. No response settings on noninteractive blocks or media controls on text blocks.
- Save receipt states, concurrent-save protection, unsaved-change integration, Cancel restoring the saved baseline, and Reset limited to known appearance/layout settings. Authored inline formatting, assets, choices, and assessment identity survive Reset.
- Existing native response form, draft/final submission, stable choice keys, history checks, and embedded assessment launch behavior are reused. Preview interactions cannot call participant save actions.
- Fonts use the existing library and course typography tokens. Width, spacing, columns, fit, background, border, and corner settings are shared; responsive columns retain the existing mobile stacking behavior.

## Preservation and source of truth

Opening or saving without changes performs no write. Existing blocks retain the existing participant renderer until an explicit changed save sets `settings.universalEdit.version = 1`. Native titles and response labels remain plain canonical metadata. Rich header formatting is a presentation cache used only when its text matches that canonical value; independent metadata renames invalidate the cache.

Native body/description/instructions stores rich text only after an explicit edit or conflict resolution. `universalEdit.richBody` distinguishes rich text from literal legacy text. Existing unknown content/settings fields, subtitle, both presentation and native captions, accessibility text, identifiers, resource associations, and response privacy/sharing settings are retained.

Competing native and presentation text is shown explicitly. A creator must choose the native value, presentation value, or edited field before saving a changed item. Both originals are retained in `universalEdit.legacyPresentationText`; active duplicate presentation header/body fields are removed. Deliberate blank headers stay blank; filenames and assessment identity remain separate resource metadata.

No migrations, published Hub Leader edits, participant writes, Supabase configuration changes, commit, push, or deployment are part of this work.

## Verification

Results: 79 focused tests passed; 16 browser checks passed; TypeScript, targeted lint, and the portal production build passed. Browser checks recorded zero runtime/console errors and zero external HTTP requests. The responsive learner check also asserts that selected header text uses the course typography size token.

Focused regression suite covers no-op preservation across every native type, rich text/blank headers, legacy conflict resolution, cache invalidation, preserved captions and heading alignment, reset preserving custom range formatting, scoped compare-and-swap, stale/published guards, choice history and selection limits, and unconfirmed write receipts. Browser verification exercises all 15 native variants, header/body selection targeting and retained highlights, live preview, save/reload, Cancel, Reset, media positions, validation error feedback, and desktop/tablet/mobile native learner rendering.

Commands:

```sh
node --test scripts/prototypes/{builder-integration,course-font-alignment,lesson-heading,video-save,universal-edit}.test.mjs lib/experiences/builder/{block-presentation,block-registry,media-source,prebuilt-assessment}.test.ts
npx tsc --noEmit
# Run universal-edit-browser.mjs with the launcher's scratch rehearsal-state path,
# and a free disposable Chrome debugging port.
```

## Review limits

Local browser saves use temporary authoring fixtures. Real Storage uploads, provider embeds, authenticated participant submissions, and production publishing were not exercised. Offline video/PDF playback uses the existing safe rehearsal placeholders; live player and reader implementations are preserved and compile in the portal build.

A native response save still spans the existing block and response-definition tables. Both use scoped revision checks; if the second write fails, the first is conditionally rolled back without overwriting a newer save. This is not an atomic database transaction. Resource relinking has the same limitation and reports an unconfirmed save requiring reload rather than claiming success.

The legacy interface switch remains available for UI review. It does not undo newly authored content or typography metadata. Keep the modern participant renderer when reverting only the builder interface; do not treat an interface rollback as a data migration or formatting conversion.
