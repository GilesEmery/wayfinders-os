-- PurposeOS migration-ledger verification.
-- SELECT-only: this script does not change schema, migration history, or data.

-- 1. Objects omitted from the LMS introspection bundle.
select
  expected.object_name,
  to_regclass('public.' || expected.object_name) is not null as exists_live
from unnest(array[
  'participants',
  'lmu_assessments',
  'lmu_section_progress',
  'organizations',
  'organization_memberships',
  'tags',
  'participant_tags',
  'participant_preferences',
  'crm_notes',
  'crm_imports',
  'crm_import_rows'
]) as expected(object_name)
order by expected.object_name;

-- 2. Exact columns, types, nullability, and defaults for those objects.
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_schema,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = any (array[
    'participants', 'lmu_assessments', 'lmu_section_progress',
    'organizations', 'organization_memberships', 'tags', 'participant_tags',
    'participant_preferences', 'crm_notes', 'crm_imports', 'crm_import_rows'
  ])
order by c.table_name, c.ordinal_position;

-- 3. Exact constraints.
select
  cls.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace n on n.oid = cls.relnamespace
where n.nspname = 'public'
  and cls.relname = any (array[
    'participants', 'lmu_assessments', 'lmu_section_progress',
    'organizations', 'organization_memberships', 'tags', 'participant_tags',
    'participant_preferences', 'crm_notes', 'crm_imports', 'crm_import_rows'
  ])
order by cls.relname, con.contype, con.conname;

-- 4. Exact indexes.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = any (array[
    'participants', 'lmu_assessments', 'lmu_section_progress',
    'organizations', 'organization_memberships', 'tags', 'participant_tags',
    'participant_preferences', 'crm_notes', 'crm_imports', 'crm_import_rows'
  ])
order by tablename, indexname;

-- 5. RLS state and non-internal triggers.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname = any (array[
    'participants', 'lmu_assessments', 'lmu_section_progress',
    'organizations', 'organization_memberships', 'tags', 'participant_tags',
    'participant_preferences', 'crm_notes', 'crm_imports', 'crm_import_rows'
  ])
order by c.relname;

select
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = any (array[
    'participants', 'lmu_assessments', 'lmu_section_progress',
    'organizations', 'organization_memberships', 'tags', 'participant_tags',
    'participant_preferences', 'crm_notes', 'crm_imports', 'crm_import_rows'
  ])
order by event_object_table, trigger_name;

-- 6. Table privileges. Server-only tables should not show anon/authenticated grants.
select table_name, grantee, privilege_type, is_grantable, with_hierarchy
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = any (array[
    'participants', 'lmu_assessments', 'lmu_section_progress',
    'organizations', 'organization_memberships', 'tags', 'participant_tags',
    'participant_preferences', 'crm_notes', 'crm_imports', 'crm_import_rows'
  ])
order by table_name, grantee, privilege_type;

-- 7. Data verification for 20260831181243.
-- A zero-row result means running the historical backfill now would update nothing.
with fully_completed as (
  select assessment_id, max(completed_at) as latest_section_completed_at
  from public.lmu_section_progress
  where status = 'completed'
    and section_key in (
      'success_stories', 'transferable_skills', 'teammates', 'supervisor',
      'values', 'growth', 'location', 'x_factor', 'salary', 'motivator_rankings'
    )
  group by assessment_id
  having count(distinct section_key) = 10
)
select
  assessment.id as assessment_id,
  assessment.status,
  assessment.completed_at,
  fully_completed.latest_section_completed_at
from fully_completed
join public.lmu_assessments assessment
  on assessment.id = fully_completed.assessment_id
where assessment.status <> 'completed'
order by assessment.id;

-- 8. Data verification for the Purpose OS foundation seed.
-- Every row should return exists_live = true. The historical INSERT used DO NOTHING
-- on slug conflicts, so existence is the data outcome that must be verified.
select
  expected.slug,
  experience.id is not null as exists_live
from unnest(array[
  'life-mapping-u', 'kaleo', 'start-something', 'impact-identity',
  'hub-leader-cohort', 'impact-studio'
]) as expected(slug)
left join public.experiences experience on experience.slug = expected.slug
order by expected.slug;

-- 9. Data verification for the participant-classification seed.
select
  tag.id is not null as exists_live,
  tag.slug,
  tag.name,
  tag.description,
  tag.category,
  tag.status
from (values ('impact-studio-candidate')) as expected(slug)
left join public.tags tag on tag.slug = expected.slug;
