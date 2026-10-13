# CODEX 1 release closeout — October 12, 2026

**Completed for the owner-approved release scope.** The security improvements and anonymous-admin-login correction are deployed successfully. Staging and broader authenticated integration testing were explicitly waived by the owner; those checks remain NOT TESTED, not certified passes.

- Production: https://wayfinders-os.vercel.app
- Final source commit: `e48acace6954a6a10772acfbb34cc013f192f284` (login correction), following security commit `b0b34e94bea07b1524cff24344389f496fa29221`.
- Vercel: `wayfinders-os`, project `prj_569lm7OPIHhr7pAoMmxEWb2xDrcp`, team `gilesemerys-projects`.
- Final deployment: `dpl_Hjz8RMxiHSufD8gNjE9WSS4uUQAi`, production, **READY**, exact final source SHA verified; production aliases assigned.
- Deployment URL: https://wayfinders-m648o9d8u-gilesemerys-projects.vercel.app

## Completed verification

Prior read-only Supabase checks passed for protected RLS/grants, required database contracts, server-only RPCs, private Storage configuration and catalog exact counts. No production participant records were read or mutated; no migrations, schema, permission, account or Supabase Storage changes were made.

The original 264 isolated checks were retained without unnecessary repetition. The small login correction passed 10 focused admin checks, including four new missing-session/identity-failure cases, and a guarded production build on Node 24. Five local HTTP checks passed; local LMU middleware could not be tested while its database lookup was blocked. Full authenticated end-to-end behavior remains outside the accepted validation scope.

Final production smoke: seven anonymous HEAD requests, zero body bytes read, no accounts or writes. Together with three earlier approved health/failure requests, the ten-request production smoke cap was respected.

| Check | Result |
| --- | --- |
| Public landing | 200 PASS |
| Admin login | 200 PASS |
| Admin entry | 307 to login PASS |
| Private CSV export, sentinel ID | 403 + no-store PASS |
| Operational CSV export, sentinel ID | 403 + no-store PASS |
| Journey API, sentinel ID | 403 + no-store PASS |
| LMU anonymous access | 401 PASS |

## Deployment issue resolved

The dashboard revealed the cause of `git_info_fail`: GitHub HTTP 403 secondary rate limiting. After a cooldown, the same repository displayed Connected and a normal Git-based deployment succeeded. No credential rotation, repository disconnection/reconnection, permission expansion, billing upgrade or setting change was needed.

The alternate source-upload workaround was stopped. It confirmed 100 source-file uploads before termination, but created no deployment through that route. No staging fixtures/resources were created, and no staging cleanup is required. Temporary local tooling and the source upload cache were not included in Git or the ZIP.

## Remaining accepted limitations and deferred work

Authenticated owner/nonowner payloads, actual save/reload/CAS/reset/cross-tab races, resource signing/revocation and publish/reorder recovery were not live-tested. Multi-step writes remain a documented risk. Auth URL/session settings and the configured Data API maximum were not independently verified. These limitations were disclosed before the owner approved release without staging.

Facilitator/group sharing, broad private-content exceptions, scoped creator/reporting expansion, result/free-text analytics, CODEX 2 and CODEX 3 remain deferred. No newly discovered blocker remains for this approved release scope. No claim of an incident investigation or absence of every vulnerability is made.

## External Actions Required

**NONE to complete this release.** Codex committed, pushed, deployed, and completed the approved smoke checks. This closeout and the refreshed seven-document ZIP are local reporting artifacts, deliberately not pushed as another deployment-triggering documentation commit. Existing unrelated original audits remain preserved.

If GitHub secondary-rate errors recur on a future release: stop Git/API retries; follow any Retry-After instruction, otherwise wait at least one minute; inspect Vercel project Settings → Git once. Repeated failures require increasing backoff and provider investigation, not blind reconnects or permission changes. A future production retry still needs the appropriate owner authorization. Never roll back to older code that restores known privacy weaknesses merely to resolve a hosting integration error.
