# Kaleo Disciple Training — VS Code draft build

Prepared November 9, 2026 against GilesEmery/wayfinders-os main.

This is a local draft build package. It has NOT been loaded into a database, published, pushed, or deployed. A Git push alone does not create the database curriculum. The existing importer creates the editable draft when run with the configured development database.

## Included

- `kaleo-green.patch`: changes to the existing PurposeOS importer and tests.
- `kaleo-draft.json`: full review package, not a database dump or automatic-import format.
- `source/888 - Kaleo Disciple Training.zip`: the original content-only source export.

34 modules: Participant Resources, Introduction, Week 1–32. All 150 lessons map to editable lessons/pages with 271 blocks, 59 metadata videos, and 68 unique attachment resources. Asterisk week labels normalize while retaining the original source titles and IDs.

The green palette is course-local: primary/completion #008037, secondary/text #111111, white surfaces #ffffff, pale green background #f3f8f4, muted text #526158, border #d5e4da. Text pairings pass WCAG AA normal-text contrast. The shared platform theme stays intact.

## Apply in VS Code

Extract this package to Downloads/Kaleo-Draft-Build. Open your existing PurposeOS repository in VS Code. In its terminal:

```bash
git apply --check "$HOME/Downloads/Kaleo-Draft-Build/kaleo-green.patch"
git apply "$HOME/Downloads/Kaleo-Draft-Build/kaleo-green.patch"
```

If the check fails, have Codex reconcile the patch with your current checkout before applying it. The patch touches only the existing Kaleo importer, its tests, and this course-build note.

Verify and regenerate the local draft:

```bash
KALEO_888_SOURCE="$HOME/Downloads/Kaleo-Draft-Build/source/888 - Kaleo Disciple Training.zip" npm run test:import-kaleo
node scripts/imports/import-kaleo-888.mjs --source="$HOME/Downloads/Kaleo-Draft-Build/source/888 - Kaleo Disciple Training.zip" --offline --output=kaleo-draft-review.json
```

The output path must not already exist. Offline mode needs installed dependencies but no environment variables or database connection.

## Create the editable PurposeOS draft

First confirm `.env.local` points to the DEVELOPMENT database intended for this draft and includes `NEXT_PUBLIC_SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY`. This command reads the target state and does not write:

```bash
node --env-file=.env.local scripts/imports/import-kaleo-888.mjs --source="$HOME/Downloads/Kaleo-Draft-Build/source/888 - Kaleo Disciple Training.zip"
```

Review that target before running the draft import:

```bash
node --env-file=.env.local scripts/imports/import-kaleo-888.mjs --source="$HOME/Downloads/Kaleo-Draft-Build/source/888 - Kaleo Disciple Training.zip" --apply --confirm-source-course=888 --confirm-target=88f5fcc4-390a-4df3-842b-e9d5197ae38e
```

The existing importer stops if Kaleo has an existing draft, published version, imported modules, or conflicting target identity. If it stops, inspect the current course rather than delete content or change IDs to force another import.

A new Experience is private, admin-assigned, and draft. The new Version is draft, with no publication pointer or enrollments created. On an existing empty Experience, existing visibility/admission settings are preserved. The build reuses the native Builder, Course Navigator, existing completion behavior, and Companion configuration; it does not add a parallel Kaleo runtime.

Run `npm run dev`, sign in as an authorized administrator, find Kaleo in Experiences, and open the draft Builder/preview. Check Introduction, Week 1, Week 16, Week 32, resources, navigation and mobile appearance. Then commit and push the reviewed code using your normal workflow. Publication is a separate admin action.

## Items requiring content review

The ZIP bundles JSON only; media remain external URLs. Reachability has NOT been checked here. At database import time, the existing importer probes resource URLs; inaccessible resources need repair in the draft.

Two legacy activities retain their source references and receive review callouts rather than invented native response logic:

- Kaleo Network Survey (Required), source post 5144: Jotform 260655718683064.
- Personal Impact Statement, source post 5093: Jotform 252993659099176. Review linking the existing native PurposeOS assessment instead.

## Validation completed

11 import tests pass, including source ordering/counts, video extraction, resource deduplication, embed flags, private draft packaging, content-only export enforcement, palette contrast, and offline execution with database credentials removed. ESLint passes for both modified scripts. No database write or authenticated runtime preview was run in this session.
