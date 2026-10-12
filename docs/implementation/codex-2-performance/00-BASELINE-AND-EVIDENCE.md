# CODEX 2 — baseline and evidence

2026-10-12. Starting branch: `main`, clean tracked tree, CODEX 1 commit `e48acace6954a6a10772acfbb34cc013f192f284`. Its production deployment `dpl_Hjz8RMxiHSufD8gNjE9WSS4uUQAi` remains READY. Existing audit evidence F01–F14 and CODEX 1 safeguards were reused.

## Measured production baseline

Owner authorized twelve anonymous homepage/public-catalog requests and read-only configuration metadata. **Six GET requests were used**, with no cookies, redirect following, image-body downloads, sign-in, participant reads, writes or load testing. Responses were capped at 2 MiB; bodies were discarded after counting bytes/images. No signed URLs were saved or printed.

| Path | Visit | TTFB ms | HTML bytes | Vercel cache |
|---|---|---:|---:|---|
| `/` | first | 2174.8 | 28,382 | MISS |
| `/` | repeat | 349.7 | 28,382 | MISS |
| `/experiences` | first | 1103.4 | 14,092 | MISS |
| `/experiences` | repeat | 541.9 | 16,958 | MISS |
| `/trainings` | first | 4009.7 | 24,936 | MISS |
| `/trainings` | repeat | 1898.0 | 24,936 | MISS |

All six responses were HTTP 200 with `private, no-cache, no-store, max-age=0, must-revalidate`. Samples include connection/server warm-up and ordinary Internet latency; they are neither browser LCP nor statistically reliable cold/warm benchmarks. Production still runs CODEX 1, so **no production after measurements exist**.

## Ten hot paths

Counts below are source/fixture evidence, exclude external embeds and optional authorization branches, and are not measured production SDK counts. Unavailable payload/timing values are explicitly unknown.

| Path | Existing cost / dependency | Implemented treatment / remaining uncertainty |
|---|---|---|
| Homepage/account shell | Root waits for Auth, profile and admin-member reads; all pages dynamic. Browser then reads account again. | Static root, content-hashed public branding; account read occurs in browser only when a session exists. Concurrent reads deduplicated. Actual signed-in timing unmeasured. |
| Dashboard/My Journey cards | Resource batch plus unused download signatures and one cover read/sign per card. | Six-card source fixture: 7 DB + 13 signing calls → 1 DB + 1 signing cold; 1 DB + 0 signing warm. |
| Trainings cards | Same media cost; private results load followed image reads sequentially. | Batched image DTOs, valid scoped URL reuse; independent results/images run together. Production baseline above, after pending. |
| Participant section | Eight curriculum queries across three dependent stages, then course-wide response/assets. | One section's layouts/columns/blocks/responses/assets, complete outline retained; authorized published content cached internally. |
| Response/assessment save | Same full curriculum, despite already separating display data. | Generic/progress and all six native handlers pass a target; no shared mutation cache. Legacy fallback remains. |
| Dashboard/Journey history | Nine initial summary queries; broad historical artifact snapshots; later catalogs and optional network totals. | Completion-only JSON projection; capabilities/LMU start in parallel; personal state stays fresh. Remaining history counts/bytes unknown. |
| Results index | Ownership gate, LMU/definition/response queries plus enrollment/history completion validation. | Historical snapshot narrowed. Finished answer validation still needs own result material; body minimization beyond this is deferred deliberately. |
| CRM registry/detail | 50-person page + four filter catalogs, optional ID intersections, duplicate-email and up to seven page-related reads; detail eagerly loads histories/catalogs. | Stable ID tie-breaker, explicit filter/detail failures. Existing page-scoped batches retained. Large ID intersections/detail payload remain unmeasured. |
| Hub/directory | Hub/profile/membership/offering/directory chains; exact-count privacy guards. | Fresh access retained; no stale membership/name/contact cache. Headers/browser performance unmeasured; no new public data assumption. |
| Editor/resource library | Full structure plus selected workspace; global resource usage scans; eager histories. | Shared participant loader narrowed without builder UX changes. Creator workspace/global library scans remain explicit follow-up candidates requiring volume evidence. |

Synthetic 32-week fixture: eight curriculum requests in either cold loader; transferred JSON row payload **1,172,193 → 49,113 bytes (95.8% less)**; blocks 32 → 1; every navigation/completion node preserved. This is local synthetic JSON, not measured Supabase billed egress or total browser bytes. A valid published-content cache avoids those eight curriculum reads on render; authorization/private reads remain.

## Infrastructure evidence

Production identity verified: Supabase `xxjiiqrhnniccnxujmnv`, `wayfinders-os`, `us-east-1`; Vercel `wayfinders-os`, Node 24.x, deployment region `iad1`. Regions already align. A read-only transaction inspected only `storage.buckets` and `pg_indexes`, followed by rollback. `purposeos-assets` is private, 25 MiB limit. Target module/version, lesson/version and block/section indexes already exist. No participant rows, Storage objects, credentials or query plans were read.

The app uses SDK HTTP/PostgREST, not a raw Postgres driver: Supavisor is unnecessary. Object cache headers/actual file sizes, DB query latency, billing attribution, browser cache hits and Vercel function durations are unknown. No plan, region, RLS, migration or infrastructure changes were made.

## Approved Preview verification

Feature branch `codex/codex-2-performance` was pushed at `93dac8a`; remote `main` was verified unchanged at `e48acac`. One Preview deployment was created: `dpl_HAgSqtzUKquer98GnGsgJ8LLBaff`, READY, target Preview, exact commit `93dac8aed39adeb397b39197efa8886c47af1c46`. URL: https://wayfinders-76zn4kumf-gilesemerys-projects.vercel.app . No production promotion occurred.

Provider logs confirm ordinary `npm run build`, Next 16.3.6 Turbopack: compilation 13.4 s, TypeScript complete, 95 page-generation tasks, `/` static, build completed in 55 s. This resolves the default-build gate; local worker-port failure was environment-specific.

One anonymous HEAD reached Vercel SSO. Owner separately approved temporary connector access; eleven application URL checks then passed, with PurposeOS signed out. No temporary link/token was printed, stored in the repository or shared; no protection settings changed. Connector-managed authentication redirects were not separately instrumented.

| Preview check | Status | Observed cache behavior |
|---|---:|---|
| Homepage first/repeat | 200 / 200 | PRERENDER → HIT; public browser revalidation |
| Experiences | 200 | private/no-store, MISS |
| Trainings first/repeat | 200 / 200 | private/no-store, MISS |
| Admin login | 200 | private/no-store |
| Sentinel Journey / private export | 403 / 403 | private/no-store |
| LMU assessment, signed out | 401 | denied; connector supplied no response headers |
| Hashed public SVG / PNG | 200 / 200 | public, max-age=31536000, immutable |

No reliable preview TTFB, browser LCP, signed-image download counts or billed egress were collected. Connector response text is decoded content, not transferred wire bytes (particularly for PNG); do not use its length as image bandwidth. Production baseline and Preview cache outcomes are different environments. Sanitized evidence: `/private/tmp/codex2-preview-verification.json`.
