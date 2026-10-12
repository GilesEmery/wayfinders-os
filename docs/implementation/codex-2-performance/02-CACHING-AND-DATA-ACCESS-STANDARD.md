# CODEX 2 — cache and data access standard

Ten minutes is a candidate freshness interval, not polling and never an authorization lease. Server checks remain required at each protected HTTP/action boundary.

| Data / route family | Implemented scope and lifetime | Mutation / other-user change / sign-out / failure |
|---|---|---|
| `/`, marketing/auth forms, public redirects/not-found shells | Static HTML where the build proves no personal data; hashed public branding assets immutable for one year | Source edit/build changes hash/HTML. Account UI loads separately; no personal RSC output in public cache. |
| Experiences/Trainings/public Hub metadata | On-demand fresh reads (`connection()` for DB-backed indexes); no new shared page cache | Publish/edit/status changes seen on next request. Public status is never inferred from last cached grants. |
| Published course content | Server-internal Next cache: experience + version + module/lesson/section, 600 seconds, lazy revalidation | New publication/version changes key immediately. Immutable-version contract required. Current lifecycle, delivery overrides and all access checks remain fresh. Failures propagate; no cached permission. Next may return stale immutable content during revalidation; never stale grants. |
| Course outline/navigation | Same published-content payload; all navigation/requirements retained | Offering/cohort visibility fetched anew. Enrollment/version changes select current authorized key. Legacy fallback documented. |
| Card image URLs | Process-local, bounded 256 entries; verified Auth ID or already-public catalog + resource ID/bucket/path/update/status; 600 seconds inside 900-second signature | Metadata read each use; replacement/path/update/status changes key, removal blocks old hit. Different user/signed-out catalog uses another scope. No polling. Cold worker may miss; do not claim distributed reuse. Signing/metadata errors throw. |
| Restricted lesson assets / Hub media | Existing fresh authorization and short signed URLs; no added shared/browser persistence | Fresh denial prevents issuing new access. Already issued bytes/URLs cannot be recalled by sign-out; provider CDN limits below. |
| Identity, roles, permissions, enrollment, password gates | Fresh server authority; React request-only identity dedup | New request verifies again. Errors deny/unavailable. No ten-minute grant, localStorage permissions or shared account DTO. |
| Dashboard/Journey/profile summaries | Fresh private reads; ten-minute TTL **not enabled** | Confirmed mutations/normal refresh show current data. Other-user changes observed on next read. Avoid stale membership/admin indicators; no competing cache library. |
| Browser account/menu | In-flight dedup only; one identity at a time, `no-store` API | Auth events refresh; confirmed profile changes retain existing `setAccount` flow. Sign-out/switch abort and invalidate outstanding work. Errors clear display. Readiness avoids premature sign-in prompts. |
| Hub directory, CRM, enrollment/admin tables | Fresh authorized server reads, existing 50-person CRM pages, minimal page-related batches | Membership changes/revocation rechecked. No private shared RSC cache. Supporting errors are not successful empty CRM pages. |
| Responses/results/progress/saves | Owner-scoped fresh reads; draft local state plus authoritative receipt/CAS; no TTL cache | Each acknowledged write drives existing refresh/reconciliation. No cached answers, stale revisions, background writes or false saved state. Historic completion projection preserves result validation. |

No SWR/TanStack Query, Redis, Supavisor, speculative RPC, RLS edits or Cache Components migration was introduced. Personal summaries remain fresh deliberately; adding a second cache layer without mutation and cross-user signals would undermine CODEX 1.

Card URLs are reused only after the enclosing catalog/dashboard recomputes its current context. This is not a resource permission grant. URL data may remain in the bounded server process after sign-out, but the previous identity's key is not selected for another viewer. Private course responses/contacts are never placed in this URL cache.

Supabase token expiry and CDN response TTL are independent; already cached bytes can outlive signature expiry. This pre-existing media limitation is not solved by reducing signing calls. No bucket was made public and object TTLs were not increased. See [Supabase signed-URL caching guidance](https://supabase.com/docs/guides/storage/cdn/smart-cdn).
