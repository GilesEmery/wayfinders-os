# Microchurch Assessment

Source: user-provided UNDERGROUND PDF, `hLiMavtuR026KbiSOh0r_Underground-Network-Reflection-Exercise-Ecclesial_Minimum-copy.pdf`, three pages, attribution tampaunderground.com. The statement tables and scoring instructions are raster images; transcription was checked visually against all three rendered pages. Original statement wording, numbering, introduction and “Limiting Church” text are retained.

## Scoring

All 21 statements use integer ratings 1–5; 5 is “most accurate.” Each category is the sum of exactly seven ratings, range 7–35:

- Worship: 1, 3, 5, 6, 10, 13, 20.
- Community: 4, 8, 11, 12, 15, 17, 19.
- Mission: 2, 7, 9, 14, 16, 18, 21.

There are no reverse-scored items, averages, combined scores or diagnostic cutoffs in the source. All three “Only…” reflections are shown to everyone; no participant is assigned hypocrisy, idolatry or pride based on a numerical threshold. An incomplete category has no numerical result.

## Integration

Uses the Bridges vs. Barriers assessment shell, focus frame, draft autosave and explicit completion workflow. Includes grouped statements, review, immutable completion snapshots, explicit retakes/history, print layout, participant/admin saved results, authorized response library and admin PDF exports. Persistence uses the existing owner/enrollment/version/definition-scoped response writer and canonical completion confirmation.

Renderer: `microchurch.v1`. Response key: `microchurch_assessment`. Launch: `/experiences/microchurch`.

`node scripts/create-microchurch-draft.mjs --plan` prints the registration plan offline. The idempotent creator uses fixed IDs and refuses to replace published content. Draft registration adds an active prebuilt picker identity without publishing the assessment or placing it into any course.

Experience: `b0e9d16d-3b3a-43f9-9faa-5bcae1951a24`. Draft: `5ee3e95d-ee8a-4310-9c78-7856e397d068`.

Review in admin and publish through the normal workflow after deploying the runtime. No schema migration is required.
