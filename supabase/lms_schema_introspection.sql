-- PurposeOS LMS authoritative schema introspection.
-- SELECT-only: safe to run in the Supabase SQL Editor. This script changes no schema or data.

-- 1. Tables, columns, types, nullability, defaults, identity, and generated expressions.
select
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_schema,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  c.is_identity,
  c.identity_generation,
  c.is_generated,
  c.generation_expression
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by c.table_name, c.ordinal_position;

-- 2. Primary-key, foreign-key, unique, check, and exclusion constraints.
select
  n.nspname as table_schema,
  cls.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  con.condeferrable as is_deferrable,
  con.condeferred as initially_deferred,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace n on n.oid = cls.relnamespace
where n.nspname = 'public'
  and cls.relname = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by cls.relname, con.contype, con.conname;

-- 3. Index definitions, including partial predicates and expression indexes.
select schemaname, tablename, indexname, tablespace, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by tablename, indexname;

-- 4. Row-level security state.
select n.nspname as table_schema, c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p')
  and c.relname = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by c.relname;

-- 5. RLS policies.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by tablename, policyname;

-- 6. Non-internal triggers and their backing function names.
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_orientation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by event_object_table, trigger_name, event_manipulation;

-- 7. Relevant public functions. Function source may be long; preserve it verbatim.
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  p.proconfig as configuration,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and (
    p.proname = 'set_updated_at'
    or p.proname ilike '%experience%'
    or p.proname ilike '%course%'
    or p.proname ilike '%section%'
    or p.proname ilike '%progress%'
    or p.proname ilike '%response%'
    or pg_get_functiondef(p.oid) ~ '(experience_versions|experience_sections|section_layouts|section_columns|content_blocks|response_definitions)'
  )
order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid);

-- 8. Explicit and inherited table privileges as visible to information_schema.
select table_schema, table_name, grantor, grantee, privilege_type, is_grantable, with_hierarchy
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by table_name, grantee, privilege_type;

-- 9. Function execution grants for the relevant functions.
select routine_schema, routine_name, specific_name, grantor, grantee, privilege_type, is_grantable
from information_schema.routine_privileges
where routine_schema = 'public'
  and (
    routine_name = 'set_updated_at'
    or routine_name ilike '%experience%'
    or routine_name ilike '%course%'
    or routine_name ilike '%section%'
    or routine_name ilike '%progress%'
    or routine_name ilike '%response%'
  )
order by routine_name, grantee;

-- 10. User-defined enum definitions referenced by or adjacent to the LMS schema.
select n.nspname as enum_schema, t.typname as enum_name, e.enumsortorder, e.enumlabel
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname in ('public','extensions')
order by n.nspname, t.typname, e.enumsortorder;

-- 11. Table ownership and persistence, useful when reconstructing grants safely.
select
  n.nspname as table_schema,
  c.relname as table_name,
  pg_get_userbyid(c.relowner) as owner,
  c.relpersistence as persistence,
  c.relkind as relation_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'experiences','experience_versions','experience_modules','experience_lessons',
    'experience_sections','section_layouts','section_columns','content_blocks',
    'resources','content_block_resources','cohorts','cohort_memberships',
    'experience_enrollments','experience_entitlements','experience_progress',
    'lesson_progress','section_progress','response_definitions','participant_responses',
    'experience_offerings','participant_offering_assignments','hubs','hub_memberships',
    'experience_themes','delivery_plan_templates','delivery_plan_template_modules',
    'delivery_plan_template_sections','cohort_course_plans','cohort_course_plan_modules',
    'cohort_course_plan_sections','platform_role_assignments','admin_audit_log'
  ])
order by c.relname;
