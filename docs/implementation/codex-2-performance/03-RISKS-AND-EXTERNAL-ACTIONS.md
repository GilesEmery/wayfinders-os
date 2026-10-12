# CODEX 2 — risks and external actions

## Remaining risks / boundaries

- Authenticated browser acceptance is pending: real signed-in account initialization, back-navigation image bytes/cache hits, image replacement, revocation, progress/profile visibility and complete native-save flows. Unit fixtures cover logic but not provider/browser behavior. CODEX 1's staging waiver does not automatically waive CODEX 2.
- The existing Vercel Preview environment shares production Supabase. A preview is not an isolated writable test database. No synthetic production save, profile change, user creation or upload is authorized.
- Default build gate is resolved: the approved Preview passed normal Node 24/Turbopack build. Stop on any future failed build, login, access, save receipt or media behavior.
- Signed card reuse is process-local. Across server instances/cold starts URLs may change. Actual browser byte reuse, Storage headers, image dimensions/file sizes and LCP remain unmeasured. No private-image transformation/public CDN proxy was introduced.
- Previously issued signed URLs/bytes are not instantly revoked; Storage/CDN behavior can outlive token expiry. This is an existing constraint, not a new longer lease.
- Legacy implicit-page courses still hydrate all content. Full course landing/editor and exceptional historical missing-page fallback remain broader. Very large outlines/CRM filter intersections, eager CRM detail and resource-library usages still require measured volume/query-plan evidence before a heavier redesign.
- Results summaries retain owner-only finalized material needed by existing completion validators. No shortcut trusts completion dates instead of required-answer validation.
- There is no billed-egress attribution, browser LCP target achievement, authenticated production trace or after-deployment timing claim.

## External Actions Required

**1. Preview verification completed.** Owner approved feature-branch push and one Preview deployment; it is READY at `93dac8a`. Owner also approved temporary Vercel access. Eleven signed-out URL checks passed; main/production remain CODEX 1. No owner configuration action is required for this completed step. See [00](00-BASELINE-AND-EVIDENCE.md).

**2. Authenticated acceptance needs a separately identified test environment/actor.** In Codex, identify an existing isolated Supabase project and synthetic participant/admin actors, or request a scoped setup/cost quote. Never paste secrets; configure credentials securely in VS Code/Vercel. Approval must specify test writes, request caps and cleanup. Do not run the SQL migrations or copy production participant data as a workaround. After isolation is verified, execute:

```text
1. Sign in as synthetic participant A; open Dashboard, Trainings, My Journey and its Hub.
2. In browser Network, preserve log, disable-cache OFF. Visit/back/revisit within ten minutes.
3. Record image URL equality, transferred bytes/cache source, total DB/Storage calls and device/network context.
4. Replace a thumbnail through the existing staging uploader; verify a new resource/path URL and current image.
5. Save draft/final generic response and Start Something/LMU in staging; require real receipts and immediate progress.
6. Edit staging profile; verify immediate display. Reuse after ten minutes; verify lazy refresh, no timer polling.
7. Revoke staging access/membership from synthetic admin; next protected request must deny despite warm content.
8. Sign out/switch to synthetic participant B; confirm no prior account, responses, contacts or stale grant.
9. Open CRM page two with tied names and filters; verify exact totals, stable rows and authoritative admin denial.
10. Save only numeric/redacted evidence; delete only explicitly approved synthetic test records/assets.
```

Where: isolated staging browser and provider project, assisted here in Codex. Effect: synthetic state changes only. Verify: every case above passes, observed bytes/request counts improve, no private logs. If isolation/setup is unavailable, request an explicit owner decision on the stated integration gap; do not silently treat anonymous checks as full acceptance.

**3. Final production approval after preview/acceptance decision.** Use the reviewed manifest in [04](04-RELEASE-DECISION.md). Ask here before merging/pushing to `main`. This would trigger production deployment; it does not authorize migrations, environment/permission changes or production writes. Verify the exact commit, deployment READY, anonymous smoke results and owner-approved signed-in checks. Roll back to the ready CODEX 1 deployment if a release regression appears.
