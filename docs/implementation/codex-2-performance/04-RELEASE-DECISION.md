# CODEX 2 — release decision

**CONDITIONAL GO for preview validation; production is not approved.** The local implementation is complete for this bounded performance release. Local tests, TypeScript, lint, webpack build and anonymous HTTP checks pass. Default provider build, authenticated browser acceptance and deployed before/after measurements remain gates/owner decisions. No changes were pushed or deployed; CODEX 1 remains live. CODEX 3/4 were not started.

## Local checkpoint

Branch: `codex/codex-2-performance`. Implementation commit: `7c50525` (33 source/test files). The following report commit contains only these five release documents. Local `main` remains `e48acac`; no remote operation was performed.

## Proposed release scope

Image batching/reuse; static public shell/content-hashed branding; target section/native-save delivery; authorized internal published-content caching; history projection/parallel reads; stable CRM ordering/error handling; focused regression fixtures and these five reports. No migration, package, RLS, permission, environment, Storage-object or billing changes.

Exclude existing untracked `docs/audits/`, CODEX 1 closeout and CODEX 1 ZIP. Never use `git add .`, force push, or an unreviewed merge.

## Release gates / smoke / rollback

1. Inspect source/diff and selective scope below; keep all unrelated files out. Local implementation/report checkpoints are prepared; main stays at CODEX 1.
2. Obtain preview approval described in [03](03-RISKS-AND-EXTERNAL-ACTIONS.md), then verify normal Vercel build and bounded anonymous checks. If GitHub rate-limits Git acquisition, stop/cool down; do not disconnect integrations or reset credentials.
3. Obtain isolated authenticated acceptance or an explicit informed owner decision on the gap. Real integration failure is a stop, not a waiver of correctness.
4. **Ask for final approval before any main push or production promotion.** Check branch ancestry/remote status and exact commit. Never force push.
5. After approved production deployment, verify READY/exact commit, `/` 200 with static delivery, public catalogs 200, `/admin/login` 200, `/admin` redirects signed out, sentinel Journey/private export denied with `no-store`, hashed assets immutable. Requests must have a separately approved cap. Compare numeric timings with baseline; do not claim LCP/browser bytes from HEAD checks.
6. On regression, stop and ask for authorized Vercel rollback/promotion to `dpl_Hjz8RMxiHSufD8gNjE9WSS4uUQAi` (`e48acac`). No database rollback is needed because this release changes no schema or production data. Prefer provider rollback; any code revert/main push also requires approval.

## Exact selective file manifest

```sh
git add -- \
  'app/experiences/[slug]/course/[moduleKey]/[lessonKey]/[sectionKey]/page.tsx' \
  'app/layout.tsx' \
  'app/page.tsx' \
  'components/platform/PlatformAccountControl.tsx' \
  'components/platform/PlatformAuthGate.tsx' \
  'components/platform/PlatformBrand.tsx' \
  'components/platform/PublicLandingAuthLink.tsx' \
  'components/platform/WayfindersAuthProvider.tsx' \
  'docs/implementation/codex-2-performance/00-BASELINE-AND-EVIDENCE.md' \
  'docs/implementation/codex-2-performance/01-IMPLEMENTATION-AND-VERIFICATION.md' \
  'docs/implementation/codex-2-performance/02-CACHING-AND-DATA-ACCESS-STANDARD.md' \
  'docs/implementation/codex-2-performance/03-RISKS-AND-EXTERNAL-ACTIONS.md' \
  'docs/implementation/codex-2-performance/04-RELEASE-DECISION.md' \
  'lib/admin/wayfinders/data.ts' \
  'lib/assessment-results.ts' \
  'lib/experiences/builder/activate-purpose-assessment-mutations.ts' \
  'lib/experiences/builder/card-image-cache.ts' \
  'lib/experiences/builder/card-images.ts' \
  'lib/experiences/builder/circle-of-influence-mutations.ts' \
  'lib/experiences/builder/data.ts' \
  'lib/experiences/builder/ethos-assessment-mutations.ts' \
  'lib/experiences/builder/launching-wayfinders-hub-assessment-mutations.ts' \
  'lib/experiences/builder/participant-runtime.ts' \
  'lib/experiences/builder/personal-impact-statement-mutations.ts' \
  'lib/experiences/builder/progress-mutations.ts' \
  'lib/experiences/builder/published-content.ts' \
  'lib/experiences/builder/response-mutations.ts' \
  'lib/experiences/builder/start-something-mutations.ts' \
  'lib/experiences/lmu/server/completion.test.mjs' \
  'lib/platform/account-refresh.ts' \
  'lib/platform/auth.ts' \
  'lib/platform/canonical-experience-registry.ts' \
  'lib/platform/dashboard.ts' \
  'lib/platform/training-catalog.ts' \
  'scripts/performance/assessment-navigation.test.mjs' \
  'scripts/performance/codex2.test.mjs' \
  'scripts/performance/stage1-loaders.test.mjs' \
  'scripts/performance/start-something-network.test.mjs'
```

Review `git diff --cached --stat` and `git diff --cached --check` before committing. This command stages only the listed 38 files; it does not push or deploy.
