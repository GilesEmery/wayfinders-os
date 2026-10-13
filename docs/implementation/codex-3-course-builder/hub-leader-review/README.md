# Current Hub Leader Cohort in the new builder — local review

Open **http://localhost:32016/dev/hub-leader-builder**.

This is a development-only authoring copy of the current **published** Hub Leader Cohort, captured on October 12, 2026. It is not a production draft and cannot publish or save to Supabase. A newer production draft was detected; this review deliberately uses the current published version, `34181531-b723-4d7f-863a-3b5da948110d`.

## What to review

- All 16 chapters, 16 lessons, 68 content pages and 194 blocks are present. Open a lesson, then use its page buttons to focus on a single page.
- Chapter/lesson/content cards share the new **Edit** sidebar. Text formatting, typography controls, supplemental text, appearance, source inspection, drag ordering and existing configuration remain available locally.
- Original Markdown, inline text-size marks, raw configuration, settings, nested layout IDs and resource relationships are preserved. Reading or opening an editor does not rewrite the source.
- All 29 linked PDFs and seven linked images are served from local copies. PDFs can open in the embedded or separate local viewer.
- Six native assessment attachments use existing components with `preview=true`, empty initial answers and a dev-only return route. Responses stay in memory. The legacy Life Mapping U connection has no native published curriculum; it is retained as an explicitly inactive connection.
- External videos and third-party forms remain visible as authoring references, with external playback/navigation disabled in the review. Source URLs remain inspectable in Edit. No form can submit participant information through the copy.
- Five Companion module definitions are retained. Its interactive data is fictional/memory-only, not live notes, chats, members, schedules or saved answers.

## Local saving and reset

Changes save to `purposeos:codex3:hub-review:34181531-b723-4d7f-863a-3b5da948110d` in this browser, separately from the fictional demonstration. Reset restores the captured course copy. Course settings and publishing remain inactive prototype controls.

The source snapshots and copied media live in `.local/course-review/`, which is excluded from Git. No course-copy database row was created. No live course, response, participant, enrollment, policy, permission or Storage object was changed.

To restart the isolated local server from the repository:

```sh
CODEX3_REVIEW=1 CODEX3_PORT=32016 node scripts/prototypes/open-demo.mjs
```

The launcher binds to loopback, removes Supabase/Vercel credentials, avoids platform auth/middleware and blocks server requests outside localhost. Both real-copy and fictional review routes reject access in production. This is owner-only local review, not a deployment candidate or an approved import format.

## Source and verification

Verified Supabase project: `wayfinders-os`, `xxjiiqrhnniccnxujmnv`, matching the existing release reports. Queries ran inside explicit read-only transactions, limited to course authoring records, linked assessment authoring metadata, and linked resource metadata. The local asset-copy command made bounded Storage GETs for the exact 36-resource allowlist; it performed no signing, upload, update, delete or migration. No participant datasets were queried.

Offline tests verify all source configurations/settings and IDs survive the adapter, all 36 local media copies exist, the source snapshot is unchanged, and the production route is closed. Browser verification traverses all 68 pages / 194 blocks, exercises Edit panels and local saving, and checks native previews, responsive layout and absence of external requests/runtime errors. TypeScript and lint also run. The existing fictional demo regression suite remains part of verification.

Full-app production build verification is not claimed for this review. The preceding offline build was blocked by Google Fonts downloads; this dev-only copy is independently verified on its isolated local server.

**Next gate:** owner review of this copy. No integration into the current builder or production deployment has been performed. Approval of the design does not itself authorize a production push or modifications to participant data.

Final verification: **18 offline tests**, TypeScript and lint pass; **10 current-course browser checks** pass, traversing all 68 pages and 194 blocks, editing a question locally and opening all six native assessment previews. There were zero external requests, runtime exceptions or console errors. The original fictional demo also passed its **24 browser checks**. Evidence and screenshots are saved beside this report.
