# Supabase owner action sheet

**New manual schema/configuration changes for this patch: NONE REQUIRED**, provided the deployed schema matches the checked-in contracts below. No migration was created or executed. This is not evidence that your project already matches. Required inspections/validation are separate from changes; do not grant browser table access, enable sharing or create consent tables to release this private-only patch.

All steps below are for the owner after separate approval of the named project/operator and bounded synthetic staging exercise. They were not run here. Do not paste credentials, answer bodies, signed URLs or raw session headers into chat/logs.

## Required before owner push

1. Supabase Dashboard → intended project → Project Settings → General: verify project identity against intended environment privately. Use a synthetic nonproduction project for writes/role tests. Dashboard → SQL Editor → New query: run only the following read-only metadata inspection after authorizing it. It has no participant-body reads or mutations. Each result is capped at 50; the first matrix lists its entire fixed table set. `ROLLBACK` closes the read-only transaction; there is no data rollback required.

```sql
begin transaction read only;
with expected(name) as (values
 ('participants'),('admin_members'),('admin_audit_log'),
 ('platform_role_assignments'),('hub_memberships'),('participant_preferences'),
 ('authorization_role_entitlements'),('authorization_role_permissions'),
 ('authorization_entitlement_overrides'),('authorization_permission_overrides'),
 ('experience_enrollments'),('experience_enrollment_version_history'),
 ('participant_responses'),('response_definitions'),('resources'),('content_block_resources'),
 ('lmu_assessments'),('lmu_section_progress'),('lmu_responses'),('lmu_results'))
select e.name, c.oid is not null as exists, c.relrowsecurity as rls_enabled,
 case when c.oid is not null then has_table_privilege('anon', c.oid, 'SELECT') end as anon_select,
 case when c.oid is not null then has_table_privilege('authenticated', c.oid, 'SELECT') end as authenticated_select,
 case when c.oid is not null then has_table_privilege('anon', c.oid, 'INSERT, UPDATE, DELETE') end as anon_any_write,
 case when c.oid is not null then has_table_privilege('authenticated', c.oid, 'INSERT, UPDATE, DELETE') end as authenticated_any_write,
 case when c.oid is not null then has_table_privilege('service_role', c.oid, 'SELECT') end as server_select
from expected e left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind in ('r','p')
order by e.name limit 50;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname='public' and tablename in
 ('participants','participant_responses','experience_enrollment_version_history',
 'lmu_assessments','lmu_responses','lmu_results','hub_memberships',
 'authorization_permission_overrides','authorization_entitlement_overrides')
order by tablename,policyname limit 50;

select t.relname, c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c join pg_class t on t.oid=c.conrelid
join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public' and t.relname in
 ('participant_responses','lmu_responses','lmu_results','lmu_section_progress',
 'authorization_permission_overrides','platform_role_assignments')
and c.contype in ('u','c') order by t.relname,c.conname limit 50;

select tablename,indexname,indexdef from pg_indexes
where schemaname='public' and tablename in
 ('participant_responses','experience_enrollments','lmu_responses','lmu_results','lmu_section_progress')
order by tablename,indexname limit 50;

select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id='purposeos-assets' limit 1;

select policyname,roles,cmd from pg_policies
where schemaname='storage' and tablename='objects'
order by policyname limit 50;
rollback;
```

Expected: all required tables exist; protected tables RLS enabled; browser roles do not have direct protected table SELECT or mutation privileges under the checked-in server-mediated design; server role reads succeed. Catalog policies/grants alone are not proof of behavior: independently check direct anonymous/authenticated REST denial on synthetic records. Do not test as SQL Editor's privileged role and call that an RLS pass. Review all applicable Storage policies, not only names. A cap-sized result requires narrower authorized follow-up; never infer absence from a truncated list. Unexpected grant/policy/table/constraint → stop, document drift and prepare a separate reviewed remedy; do not execute blanket REVOKE or migrations based only on this sheet.

2. Dashboard → Database → Tables / SQL Editor: compare columns/types/constraints against local migrations and `lib/supabase/database.types.ts`. Read-only catalog query for targeted compatibility:

```sql
begin transaction read only;
select table_name,column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and
 ((table_name='participant_responses' and column_name in
   ('id','participant_id','enrollment_id','experience_version_id','response_definition_id','response_data','status','finalized_at','updated_at'))
 or (table_name='authorization_permission_overrides' and column_name in
   ('auth_user_id','permission_key','effect','scope_type','scope_id'))
 or (table_name='experience_enrollment_version_history' and column_name='artifact_snapshot')
 or (table_name='platform_role_assignments' and column_name in ('auth_user_id','role','scope_type','scope_id','status'))
 or (table_name='resources' and column_name in ('storage_bucket','storage_path','original_filename','mime_type','file_size_bytes')))
order by table_name,column_name limit 50;
select proname,pg_get_function_identity_arguments(p.oid) as arguments,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') as server_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('publish_experience_version','clone_experience_version','publish_forward_experience_enrollment',
 'clone_experience_version_with_companion_keys','manage_authorization_foundation')
order by proname limit 50;
rollback;
```

Expected: response timestamp CAS and canonical unique response definition/enrollment contract; LMU unique `(assessment_id,section_key)`; canonical participant/course enrollment; history JSON completion projection; exact-Hub permission override effect/scope checks and unique key. Match actual RPC names/signatures called in `lib/experiences/admin/version-release.ts` and checked-in SQL; server-only mutators must not gain browser EXECUTE. Missing function result is not success. No new constraint is requested by CODEX 1.

Compatibility sources: `20260831134921_phase_1_lmu_backend.sql`; `20260907140629_purpose_os_foundation.sql`; `20260914190028_reconcile_a1_core_lms_foundation.sql`; native media foundation + `20260916154632_increase_native_asset_limit_to_25mb.sql`; `20260917210134_publish_forward_enrollment_policy.sql`; `20260917211108_atomic_publish_forward.sql`; `20260918112528_canonical_enrollment_multiple_cohort_contexts.sql`; `20260923163326_authority_entitlements_foundation.sql`; reusable prebuilt assessment migration. Later native assessment/content migrations are existing repository state, not new required CODEX 1 migration actions. Compare deployment migration history privately; if drift exists, review dependencies/data impact before any separately approved application. Do not automatically run all migrations including content seeds/backfills.

3. Dashboard → Project Settings → Data API: inspect row-return limit without changing it. App queries request `count: exact` using installed supabase-js 2.x; verify actual response counts are numeric and equal the returned filtered collections for synthetic authority/directory/Journey/LMU reads. Unknown/truncated reads must fail closed. If current catalogs/operational list exceed the row limit, this release will show unavailable. Do not raise limits or remove guards merely to bypass failure; an essential unavailable report blocks sign-off pending scoped repair. Exact counts do not make independent requests transactionally consistent.

4. Dashboard → Authentication → URL Configuration: confirm existing intended Site URL and redirect allowlist; Authentication → Users: verify synthetic sign-in/revocation behavior with owner-authorized identities. No Auth settings change is required. Preserve existing email/admin invitation protections. Privately verify server secret versus public publishable-key configuration in the intended runtime; no secret belongs in `NEXT_PUBLIC_*` or this report.

5. Dashboard → Storage → `purposeos-assets` → Configuration/Policies: expected private bucket, 26,214,400-byte limit and allowed MIME list consistent with checked-in 25 MiB migration; no broad anon/authenticated object access. Test one synthetic asset ≤512 KiB through approved app path, denial after withdrawal, and 15-minute issued URL limitation. Archived historical assets remain intentional authorized history. Do not flip bucket public or loosen object policies to fix a failed signing test. If no native media is in scoped release, document exclusion rather than certify untested uploads.

6. Dashboard → Database → authorization override tables: inspect only approved synthetic actor/Hub rows (≤50), not all users. Exact-Hub `wayfinder.view` allow is required for contacts; inherited leader/admin roles alone are insufficient, applicable deny blocks. No auto-grant/backfill is required. Test complete allow, wrong-Hub, revocation and deny through app payloads. Checked `admin_audit_log` receipts must exist for operational Journey/LMU reads and CSV; audit failure must prevent receipt.

## Required after separately authorized deployment

Run report 04's small synthetic smoke checks; inspect bounded sanitized error/audit events and save receipts. Reconfirm project/environment, owner versus nonowner body paths, explicit directory/contact denial, operational CSV fields, generic CAS and LMU header contract. No schema update is prescribed after deployment. Stop on failures; do not repair with broad grants or destructive deletes.

## Deferred

Sharing/consent tables, cohort attribution, creator permission mapping, response/progress/LMU transactions, performance SQL/index work and builder changes. No SQL mutation/rollback script is supplied because no schema change was demonstrated necessary. If drift is found, the recommendation becomes unresolved/NO-GO until a concrete reversible remedy is reviewed and verified. Inspection and synthetic fixture cleanup are bounded by the runbook; cleanup only manifest IDs and only under separate authorization.

## Authorized release verification update

October 10, 2026. Owner authorized read-only Supabase compatibility checks, a production build, automated tests and Git preparation. No push/deployment, migrations, Supabase mutations, private participant reads or synthetic production writes were performed.

**Verified project:** local `.env.local` hostname and `supabase/.temp/project-ref` both match `xxjiiqrhnniccnxujmnv`; connected project metadata identifies `wayfinders-os`, ACTIVE_HEALTHY, us-east-1, Postgres 17.6. No credentials were displayed.

**Supabase metadata passed:** 20/20 required tables exist with RLS enabled; anon/authenticated have no SELECT or INSERT/UPDATE/DELETE privileges; service role SELECT exists. Protected-policy subset and all Storage object policies are empty, consistent with server-mediated access. Fifteen checked unique/check constraints and 29 indexes include generic enrollment/definition uniqueness, canonical participant/course uniqueness, LMU assessment/section uniqueness and permission/role scope/effect/status contracts. All 25 targeted columns match required types. Four required RPCs match signatures, deny anon/authenticated EXECUTE and allow service role. `purposeos-assets` is private, 26,214,400-byte limit, expected 14 MIME types. These were four bounded SQL metadata queries in `BEGIN TRANSACTION READ ONLY ... ROLLBACK`; no function was invoked. No result hit its 50-row cap.

**Data API exact counts passed:** two service-role HEAD-only requests to nonsensitive role/permission catalogs returned HTTP 200 and numeric exact counts (41 role-permission mappings; 31 role-entitlement mappings); zero response bodies. No participant/override rows were accessed. The authenticator-role catalog exposed no explicit row-limit setting; configured Data API maximum remains unverified. Real scoped directory/contact/override behavior, Auth URL/session configuration, browser payloads and withdrawal signing remain unverified.

**Production build passed with a temporary network guard:** `NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--require=/private/tmp/codex1-build-network-guard.cjs' npm run build`, exit 0. Installed Node v26.0.0/Next 16.3.6; compilation, Next TypeScript and 95/95 page-generation tasks completed; build ID `UL-N9OHvDw9Zm5DIp6I47`. Guard permitted Google font hosts and loopback only, blocked six requests to the identified Supabase host; no participant data was fetched. Guard is outside repository, not a committed config change. This proves guarded build compilation/generation, not deployed runtime/Supabase integration. Use a fresh approved release build after final gates; do not deploy this artifact as certified production-runtime evidence.

**Automated verification passed:** 264/264 combined checks, zero failed/skipped/cancelled; standalone TypeScript exit 0; ESLint exit 0 across 37 allowlisted application files, zero errors/one existing unused `userEmail` warning; `git diff --check` passed. The combined test command is the report 02 core command plus the LMU suite and six broader suites in one `node --test` invocation. Tests are static/unit/mock, not live writes.

**Git:** branch `main`, `origin` = `https://github.com/GilesEmery/wayfinders-os.git`; exact 72-path allowlist verified, all 35 modified tracked paths covered, excluded original audit reports/ZIP/secrets/migrations/build output. New code/tests are included; staged index remains empty. No fetch, staging, commit, push or deployment performed; remote divergence/automatic deployment hook remain unverified.

**Remaining gate / stop for owner decision:** the identified Supabase project has no development branches. Connected project discovery identified no PurposeOS staging project; the separately listed `peaceworks-portal` is unrelated and was not queried. No safe staging target/operator/prepared fixture identities were supplied. Current authorization permits read-only Supabase activity and prohibits creating/modifying users, grants or objects, so required save/reset/publication/signing/revocation integration tests cannot be safely completed here. Recommendation remains **CONDITIONAL GO, not production approved**. Do not create the Git commit under the current “after all required checks pass” condition.

**Exact next owner action:** identify an existing isolated PurposeOS staging project/deployment and explicitly authorize a bounded validation plan with prepared synthetic identities and the precise permitted fixture writes; otherwise explicitly decide to defer release or request a separately documented residual-risk exception. No production write testing or blanket grant change is proposed. Final production push still requires your separate approval after the resulting gates pass. CODEX 2/3 were not begun.
