# CODEX 2 — implementation and verification

## Controlled phases

1. **Images and static shell:** `card-images.ts` selects six metadata fields, deduplicates IDs, batches in chunks of 50, and signs display images once per bucket. `card-image-cache.ts` holds at most 256 URL entries with a ten-minute reuse deadline inside the existing fifteen-minute signature lifetime. Keys include verified viewer scope, resource ID, bucket, path, update time and status. Fresh metadata is required before every hit. Explicit archived cards keep their historical eligibility; archived cover fallbacks remain excluded. Missing cards still fall back to eligible covers. Dashboard and Trainings share the loader; My Journey already shares Dashboard.
2. **Targeted delivery:** `data.ts` retains navigation and requirement metadata but hydrates only the requested section's blocks/layout/columns. Participant route, progress actions, generic saves and six native assessment saves pass the target. Response and hero/resource reads follow that target. Offering/cohort filtering and response contracts stay authoritative. Courses with implicit legacy pages intentionally retain the original complete loader.
3. **Safe caching/static delivery:** `published-content.ts` uses existing Next Data Cache support (`unstable_cache`, compatible with this app's disabled Cache Components flag), keyed by experience/version/route, with lazy 600-second revalidation. Fresh password, identity, enrollment, authorization and published-version gates precede it. Delivery overrides and current Experience state are applied afterward. Responses, progress, themes, asset signatures and saves are outside it. New publication IDs select new cache keys. No framework flag was enabled.
4. **Portal efficiency:** Root layout no longer reads account data, permitting static marketing delivery. Public PNG/SVG imports produce content-hashed build assets; Next 16 `preload` replaces deprecated branding `priority`. Browser account initialization is explicit, concurrent Auth events share one read, and identity changes/sign-out/disposal invalidate late completions. Errors clear display state. React `cache` deduplicates user verification only inside a server render. Dashboard/results fetch only history completion JSON, public registry fetches only referenced published version labels, and CRM pages add stable ordering and error handling.

Authenticated menus initialize after browser Auth resolution; controls display a busy placeholder until ready. Privileged UI state does not authorize any server operation. No response-save receipts, assessment schema, permission rules or Storage configuration were changed.

## Verification completed locally

- **115 selected tests passed**, zero failures/skips: performance fixtures/navigation, CODEX 1 final safeguards, cohort/version isolation, Circle/Start Something, native assessment completion/retakes, LMU completion/history, participant routes and public landing.
- New targeted native/image/CRM cases are included in that final total. New tests cover target forwarding, denial before save, outline/progress parity, missing/legacy sections, ten-minute expiry/bounds, image replacement/removal/archival eligibility/signing failures, scoped users, account-switch/sign-out races, draft cache rejection, six-card request counts and stable CRM page-two totals.
- TypeScript `--noEmit --incremental false`: pass. ESLint for changed application source: pass, zero errors/warnings. `git diff --check`: pass.
- Guarded **Node 24 webpack production build**: pass, 95 page-generation tasks; `/` static and protected content routes dynamic. Supabase/application-service networking blocked during build. Standard Turbopack was attempted twice but this local environment blocked its worker port (`Operation not permitted`), including the permission-enabled attempt. No package/build setting was changed to conceal that limit.
- Six anonymous local HTTP checks passed: `/` 200 (`s-maxage=31536000`), `/admin/login` 200, `/admin` 307 to login, sentinel Journey API 403 (`private, no-store`), hashed PNG/SVG 200 (`public, max-age=31536000, immutable`). Local server stopped afterward.
- Old assessment-navigation fixtures needed current imports/introduction entry; the LMU history fixture now emulates the completion JSON projection. Product assessment components were not redesigned.

Network/browser/database integration is not implied by these local tests. The complete prior 264-test suite was not unnecessarily repeated.

## Reproduce focused verification

```sh
node --test scripts/performance/*.test.mjs scripts/security/codex1-final.test.mjs lib/experiences/builder/{cohort-context,circle-of-influence,start-something,assessment-retake}.test.ts lib/experiences/builder/assessment-completion.test.mjs lib/experiences/lmu/server/completion.test.mjs lib/platform/{participant-navigation,public-landing}.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

The comparison fixture reads the existing local CODEX 1 commit `e48acac` using `git show`; it does not fetch GitHub. Temporary build/log/HTTP evidence is in `/private/tmp/codex2-*`; durable measurements are recorded in [00](00-BASELINE-AND-EVIDENCE.md). A production build uses `npm run build`; local webpack fallback is `npm run build -- --webpack` with Node 24. Keep a network guard when local environment files point at production.
