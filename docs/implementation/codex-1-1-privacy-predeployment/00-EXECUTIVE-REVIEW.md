# CODEX 1.1 executive review

October 10, 2026. **Local review completed; rollout blocked pending decisions and verification.**

**Verified from code:** Reviewed the five CODEX 1 implementation reports and eight comprehensive audit reports against the current source. The working tree was already dirty: 22 modified tracked files and seven untracked status entries, including directory entries. Its 27 application/test files match the CODEX 1 inventory; the eight audits and five implementation reports were preexisting. This is a working-tree comparison, not proof of authorship of every earlier edit. A pre-edit SHA-256 snapshot was used to check preservation; only the seven existing files listed in [04](04-CHANGED-FILES-AND-TESTS.md) changed during this assignment. No audit or CODEX 1 report was overwritten.

## Actual local improvements

| Evidence classification | Improvement | Source |
| --- | --- | --- |
| Verified from code; verified by isolated test | Nonowner facilitator policy now additionally requires explicit, trusted participant consent for the content kind and exact scope. A definition's `required` sharing mode is not consent. The active adapter still supplies no durable scope and no consent, so sharing remains disabled. | `lib/platform/response-sharing-policy.ts:15`, `:25`; `lib/platform/response-library.ts:246` |
| Verified from code; verified by isolated test | Admin identity, role and profile lookup errors reject instead of accepting owner/role-shaped partial data. Successful admin identity still works. | `lib/admin/auth.ts:15` |
| Verified from code; verified by isolated test | Hub membership and offering/cohort helper errors reject. A missing cohort no longer falls back to global privilege. Successful scoped grants remain. | `lib/platform/authorization.ts:116`, `:128`, `:136` |
| Verified from code; static source checks | Hub page/profile prerequisite errors stop before protected metadata or contact queries. Directory audience was not changed. | `app/hubs/[hubSlug]/page.tsx:16`, `:28`; `app/hubs/[hubSlug]/members/[participantId]/page.tsx:13`, `:20` |
| Verified from code; verified by isolated test | Discard stale local LMU acknowledgements after module removal, experience clearing, assessment switches, or newer saves. Prevent local completion resurrection; retain valid acknowledged completion and recoverable drafts. | `lib/experiences/lmu/storage.ts:90`, `:110`, `:130`, `:137`, `:149` |

**Verified by isolated test:** 148 checks passed: the 93-case baseline and 55 new CODEX 1.1 cases. TypeScript static checking passed. `git diff --check` passed. Two baseline checks were converted from mocked route/page execution to static source assertions to honor the stricter prohibition on executing application routes. Their case count is preserved; runtime route evidence is deferred. The baseline sharing-positive fixture now explicitly supplies synthetic consent. See [04](04-CHANGED-FILES-AND-TESTS.md) for exact commands and coverage limits.

## CODEX 1 findings refined by this review

**Verified from code:** CODEX 1's fail-closed claim concerned its effective-access resolver, not every authorization path. Auxiliary Hub/offering reads and `getAdmin` still ignored returned errors; this iteration narrows those gaps. Other untouched error-handling gaps remain listed in [03](03-ADMIN-HUB-CREATOR-BOUNDARIES.md). Effective-policy deny precedence applies after successful reads, with the existing Super Admin bypass retained; it is not a universal override across direct authorization helpers (`lib/platform/effective-access-policy.ts:32`, `:41`; `lib/platform/authorization.ts:54`).

**Verified from code:** CODEX 1's pure sharing-positive examples established scope but did not establish participant consent. The new prerequisite corrects that contract. Neither test fixture demonstrates persisted consent. Current private filtering remains before body queries (`lib/platform/response-library.ts:132`, `:142`, `:251`).

**Verified from code; verified by isolated test:** Owner-admin CSV and owner-admin Journey content remain available. The shared assessment-result loader returns an owner's finalized LMU result. Admin result pages call that loader or guard `lmu_results` independently. Nonowner Admin/Super Admin answer detail and CSV remain blocked; operational Journey and LMU progress projections remain separate (`lib/admin/wayfinders/export.ts:21`; `lib/platform/response-library.ts:299`; `lib/assessment-results.ts:67`; `app/admin/life-mapping-u/[assessmentId]/page.tsx:15`; `lib/admin/wayfinders/journey.ts:20`). Actual page rendering was not executed.

**Verified from code:** The analytics page is an architecture placeholder, not a verified aggregate reporting engine (`app/admin/analytics/page.tsx:2`). Scoped Course Creator permissions in the effective policy do not remove earlier `requireAdmin` gates in authoring actions (`lib/platform/effective-access-policy.ts:51`; `lib/experiences/admin/block-mutations.ts:87`). These are blocked use cases, not reasons to grant global admin roles.

## Release recommendation

**Proposed policy:** Hold rollout. Review the concrete local diff and decide the items in [06](06-OPEN-OWNER-DECISIONS.md). The three sharing audiences are already approved; their durable enforcement model is design-only in [02](02-DURABLE-SHARING-DESIGN.md). No schema, records, historical mappings, published content, canonical IDs, or custom assessment workflows were changed. No CODEX 2/3 work was started.

**Requires live verification:** Deployed RLS/grants, real identity revocation, browser saves/navigation, cross-tab conflicts, signing withdrawal, publication outcomes and operational workflows remain unverified. Local receipt generation does not cancel old server writes or bind the network queue to an assessment/session. Conditional cleanup after response-definition copy failure also remains unconfirmed. Staging must be separately authorized and bounded as proposed in [05](05-STAGING-AND-ROLLOUT-GATES.md).

**Verified from code / local execution record:** No live services were contacted; no secrets or `.env` contents were read; no dependencies installed; no migrations created/applied; no Next server, build, application route, or deployment executed in CODEX 1.1.

## Documents

1. [Privacy/access contract](01-PRIVACY-AND-ACCESS-DECISIONS.md)
2. [Durable sharing design](02-DURABLE-SHARING-DESIGN.md)
3. [Admin, Hub and creator boundaries](03-ADMIN-HUB-CREATOR-BOUNDARIES.md)
4. [Files and offline verification](04-CHANGED-FILES-AND-TESTS.md)
5. [Staging and rollout gates](05-STAGING-AND-ROLLOUT-GATES.md)
6. [Owner decisions](06-OPEN-OWNER-DECISIONS.md)
