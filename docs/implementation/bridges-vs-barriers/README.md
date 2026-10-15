# Bridges vs. Barriers

Implemented October 15, 2026. No deployment, live registration, published content edits, or course placement performed.

## Review locally

The isolated review server is available at http://127.0.0.1:32020/dev/bridges-vs-barriers. It uses the actual assessment UI with synthetic, file-backed save actions and blocks external services. The page offers standalone, course-launch, and unsaved preview modes. Review answers do not create participant responses.

To recreate the review server from the repository root, run `node scripts/prototypes/open-integrated-builder.mjs`, then open the same URL. Its course-review snapshot must already exist in `.local/course-review`. The server uses a disposable directory; stopping it deletes its synthetic state.

## Author and participant entry points

After draft registration and normal assessment publication, authors select **Bridges vs. Barriers** in the existing **Prebuilt Assessment** content block. Authors control where to insert that block. The same assessment is available at `/experiences/bridges-vs-barriers` using the existing sign-in, enrollment, access and embedded return-context handling.

Renderer: `bridges-vs-barriers.v1`. Response key: `bridges_vs_barriers_assessment`. Both entry points use one definition, model, UI, persistence path and results renderer.

## Setup still required

No schema migration is needed. `scripts/create-bridges-barriers-draft.mjs` prepares an unpublished assessment, its structured response definition, and its prebuilt registry entry. It does not insert a course block or publish a version.

- `node scripts/create-bridges-barriers-draft.mjs --plan` prints the offline plan without credentials or database requests.
- The default run inspects the configured database without applying changes.
- After review, applying requires `--apply --confirm=49a59b41-bf07-4a53-a0f9-d01dfd0ea034` with the existing administrative database environment.
- Review and publish the assessment through the normal admin workflow before participant use. A draft alone is not participant-accessible.

The setup script has **not** been applied in this task. Until registration/publication and deployment, the new choice is not available in the live picker.

## Behavior and preservation

The flow includes the complete introduction, three conversations, optional tone/influence selections and Other fields, unlimited repeat observations, five cross-conversation reflections, a three-field next step, review, and one explicit final completion.

Fully blank observation cards are ignored on completion. Partial cards require completion or removal. Every conversation requires at least one complete observation. Counts distinguish Bridges, Barriers and Still discerning; the reflection total is Bridges minus Barriers and is never a diagnostic interpretation.

Drafts permit incomplete work. Serialized autosaves and explicit save actions retain edits after failures. Final completion uses the existing participant/enrollment/version/definition-scoped compare-and-swap response writer and only reports completion after the existing enrollment confirmation. Retakes preserve prior completed snapshots in `previousResults` and retain a separate resumable draft. Client-supplied completion metadata is never trusted.

Participant profile results and authorized administrator result routes use the existing access checks. The response library presents authored answers through its existing permission model. No access controls, existing assessment data, course versions, companions, or participant progress were changed.

Completed results show all answers, optional descriptions, counts, participant name/date, and printable material. All conversations are expanded for print.

## Verification

- 16 focused model/persistence tests pass: required fields, blank/partial observations, 250 observations without a small count cap, stable identifiers, Other/Unsure, counts, incomplete drafts, immutable completion, retakes/history, save/completion failures, concurrency, ownership scoping, hidden blocks, and registry/results integration.
- Broader assessment/results run: 70/71 pass. The existing Activate Your Purpose source-contract test expects `setTimeout` in its unchanged component and fails. This task does not modify that component or its tests.
- TypeScript, focused ESLint, and production webpack build pass.
- Six browser scenarios pass against the guarded synthetic save server: validation/incomplete saves; all conversations/selection/observation controls; failed save and retry/reload; keyboard Space and heading focus; mobile/accessibility labels/completion/results/print; preserved completion/new draft/course launch.
- Mobile checked at 390px with no horizontal overflow. Browser accessibility tree confirms question labels. Desktop/mobile screenshots inspected.
- Four-page print PDF generated; extracted text confirms all three observations, Other text, the last cross-reflection and next-step fields. A rendered print page was inspected for clipping.
- Offline setup plan verified. No database migration or seed applied.

Limitations: real authenticated database and cohort enrollment flows were verified through existing authorization code and focused mutation mocks, not live writes. A human screen-reader walkthrough and live prebuilt-picker selection require review/setup. The standard server-action body limit still applies; written fields have 12,000-character limits and oversized saves report failure without clearing local answers.
