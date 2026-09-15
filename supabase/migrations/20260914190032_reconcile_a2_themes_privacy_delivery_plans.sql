-- Reconcile the repository with the authoritative live A2 LMS schema.
-- Themes, response privacy, delivery templates, and cohort course plans remain
-- server-only: RLS is enabled and the authoritative live policy set is empty.

create table if not exists public.experience_themes (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null,
  revision integer not null default 1,
  name text not null,
  organization_id uuid null,
  status text not null default 'draft',
  configuration jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_themes_configuration_object_check check (jsonb_typeof(configuration) = 'object'),
  constraint experience_themes_revision_check check (revision >= 1),
  constraint experience_themes_status_check check (status in ('draft', 'active', 'archived')),
  constraint experience_themes_theme_key_format_check check (theme_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint experience_themes_organization_fk foreign key (organization_id) references public.organizations(id) on delete set null
);

create unique index if not exists experience_themes_global_key_revision_uidx
  on public.experience_themes (theme_key, revision) where organization_id is null;
create unique index if not exists experience_themes_org_key_revision_uidx
  on public.experience_themes (organization_id, theme_key, revision) where organization_id is not null;
create index if not exists experience_themes_organization_idx
  on public.experience_themes (organization_id);
create index if not exists experience_themes_status_idx
  on public.experience_themes (status);

alter table public.experiences
  add column if not exists owner_organization_id uuid,
  add column if not exists default_theme_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.experiences'::regclass and conname = 'experiences_owner_organization_fk') then
    alter table public.experiences add constraint experiences_owner_organization_fk foreign key (owner_organization_id) references public.organizations(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.experiences'::regclass and conname = 'experiences_default_theme_fk') then
    alter table public.experiences add constraint experiences_default_theme_fk foreign key (default_theme_id) references public.experience_themes(id) on delete set null;
  end if;
end $$;

create index if not exists experiences_owner_organization_idx
  on public.experiences (owner_organization_id);
create index if not exists experiences_default_theme_idx
  on public.experiences (default_theme_id);

alter table public.experience_versions
  add column if not exists theme_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.experience_versions'::regclass and conname = 'experience_versions_theme_fk') then
    alter table public.experience_versions add constraint experience_versions_theme_fk foreign key (theme_id) references public.experience_themes(id) on delete restrict;
  end if;
end $$;

create index if not exists experience_versions_theme_idx
  on public.experience_versions (theme_id);

alter table public.response_definitions
  add column if not exists raw_visibility text not null default 'participant_only',
  add column if not exists result_visibility text not null default 'participant_only',
  add column if not exists share_mode text not null default 'disabled',
  add column if not exists visibility_settings jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.response_definitions'::regclass and conname = 'response_definitions_raw_visibility_check') then
    alter table public.response_definitions add constraint response_definitions_raw_visibility_check check (raw_visibility in ('participant_only', 'participant_and_facilitator', 'participant_and_leader', 'cohort_members', 'administrators', 'custom'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.response_definitions'::regclass and conname = 'response_definitions_result_visibility_check') then
    alter table public.response_definitions add constraint response_definitions_result_visibility_check check (result_visibility in ('participant_only', 'participant_and_facilitator', 'participant_and_leader', 'cohort_members', 'administrators', 'custom'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.response_definitions'::regclass and conname = 'response_definitions_share_mode_check') then
    alter table public.response_definitions add constraint response_definitions_share_mode_check check (share_mode in ('disabled', 'optional', 'required'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.response_definitions'::regclass and conname = 'response_definitions_visibility_settings_object_check') then
    alter table public.response_definitions add constraint response_definitions_visibility_settings_object_check check (jsonb_typeof(visibility_settings) = 'object');
  end if;
end $$;

create table if not exists public.delivery_plan_templates (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null,
  experience_version_id uuid not null,
  name text not null,
  description text null,
  sharing_scope text not null default 'private',
  organization_id uuid null,
  hub_id uuid null,
  status text not null default 'draft',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_plan_templates_scope_shape_check check (
    (sharing_scope = 'private' and organization_id is null and hub_id is null)
    or (sharing_scope = 'hub' and hub_id is not null and organization_id is null)
    or (sharing_scope = 'organization' and organization_id is not null and hub_id is null)
    or (sharing_scope = 'global' and organization_id is null and hub_id is null)
  ),
  constraint delivery_plan_templates_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint delivery_plan_templates_sharing_scope_check check (sharing_scope in ('private', 'hub', 'organization', 'global')),
  constraint delivery_plan_templates_status_check check (status in ('draft', 'active', 'archived')),
  constraint delivery_plan_templates_hub_fk foreign key (hub_id) references public.hubs(id) on delete set null,
  constraint delivery_plan_templates_organization_fk foreign key (organization_id) references public.organizations(id) on delete set null,
  constraint delivery_plan_templates_version_fk foreign key (experience_version_id, experience_id) references public.experience_versions(id, experience_id) on delete cascade
);

create index if not exists delivery_plan_templates_experience_idx
  on public.delivery_plan_templates (experience_id, experience_version_id);
create index if not exists delivery_plan_templates_hub_idx
  on public.delivery_plan_templates (hub_id);
create unique index if not exists delivery_plan_templates_id_experience_version_uidx
  on public.delivery_plan_templates (id, experience_id, experience_version_id);
create unique index if not exists delivery_plan_templates_id_version_uidx
  on public.delivery_plan_templates (id, experience_version_id);
create index if not exists delivery_plan_templates_organization_idx
  on public.delivery_plan_templates (organization_id);
create index if not exists delivery_plan_templates_status_idx
  on public.delivery_plan_templates (status);

create table if not exists public.delivery_plan_template_modules (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  experience_version_id uuid not null,
  source_module_id uuid not null,
  sort_order integer not null default 0,
  display_title text null,
  visibility text not null default 'visible',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_plan_template_modules_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint delivery_plan_template_modules_sort_order_check check (sort_order >= 0),
  constraint delivery_plan_template_modules_visibility_check check (visibility in ('visible', 'hidden')),
  constraint delivery_plan_template_modules_source_fk foreign key (source_module_id, experience_version_id) references public.experience_modules(id, experience_version_id) on delete restrict,
  constraint delivery_plan_template_modules_template_fk foreign key (template_id, experience_version_id) references public.delivery_plan_templates(id, experience_version_id) on delete cascade
);

create unique index if not exists delivery_plan_template_modules_id_template_version_uidx
  on public.delivery_plan_template_modules (id, template_id, experience_version_id);
create unique index if not exists delivery_plan_template_modules_order_uidx
  on public.delivery_plan_template_modules (template_id, sort_order);
create unique index if not exists delivery_plan_template_modules_source_uidx
  on public.delivery_plan_template_modules (template_id, source_module_id);

create table if not exists public.delivery_plan_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  template_module_id uuid not null,
  experience_version_id uuid not null,
  source_section_id uuid not null,
  sort_order integer not null default 0,
  visibility text not null default 'visible',
  display_title text null,
  release_at timestamptz null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_plan_template_sections_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint delivery_plan_template_sections_sort_order_check check (sort_order >= 0),
  constraint delivery_plan_template_sections_visibility_check check (visibility in ('visible', 'hidden')),
  constraint delivery_plan_template_sections_module_fk foreign key (template_module_id, template_id, experience_version_id) references public.delivery_plan_template_modules(id, template_id, experience_version_id) on delete cascade,
  constraint delivery_plan_template_sections_source_fk foreign key (source_section_id, experience_version_id) references public.experience_sections(id, experience_version_id) on delete restrict,
  constraint delivery_plan_template_sections_template_fk foreign key (template_id, experience_version_id) references public.delivery_plan_templates(id, experience_version_id) on delete cascade
);

create unique index if not exists delivery_plan_template_sections_order_uidx
  on public.delivery_plan_template_sections (template_module_id, sort_order);
create index if not exists delivery_plan_template_sections_source_idx
  on public.delivery_plan_template_sections (source_section_id);

create unique index if not exists cohorts_id_experience_version_uidx
  on public.cohorts (id, experience_id, experience_version_id);

create table if not exists public.cohort_course_plans (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null,
  experience_id uuid not null,
  experience_version_id uuid not null,
  based_on_template_id uuid null,
  name text null,
  status text not null default 'draft',
  group_mode_override text null,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cohort_course_plans_group_mode_override_check check (group_mode_override is null or group_mode_override in ('off', 'optional', 'required')),
  constraint cohort_course_plans_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint cohort_course_plans_status_check check (status in ('draft', 'active', 'archived')),
  constraint cohort_course_plans_cohort_fk foreign key (cohort_id, experience_id, experience_version_id) references public.cohorts(id, experience_id, experience_version_id) on delete cascade,
  constraint cohort_course_plans_template_fk foreign key (based_on_template_id, experience_id, experience_version_id) references public.delivery_plan_templates(id, experience_id, experience_version_id) on delete restrict
);

create index if not exists cohort_course_plans_experience_idx
  on public.cohort_course_plans (experience_id, experience_version_id);
create unique index if not exists cohort_course_plans_id_version_uidx
  on public.cohort_course_plans (id, experience_version_id);
create unique index if not exists cohort_course_plans_one_active_per_cohort_uidx
  on public.cohort_course_plans (cohort_id) where status = 'active';
create index if not exists cohort_course_plans_template_idx
  on public.cohort_course_plans (based_on_template_id);

create table if not exists public.cohort_course_plan_modules (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  experience_version_id uuid not null,
  source_module_id uuid not null,
  sort_order integer not null default 0,
  display_title text null,
  visibility text not null default 'visible',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cohort_course_plan_modules_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint cohort_course_plan_modules_sort_order_check check (sort_order >= 0),
  constraint cohort_course_plan_modules_visibility_check check (visibility in ('visible', 'hidden')),
  constraint cohort_course_plan_modules_plan_fk foreign key (plan_id, experience_version_id) references public.cohort_course_plans(id, experience_version_id) on delete cascade,
  constraint cohort_course_plan_modules_source_fk foreign key (source_module_id, experience_version_id) references public.experience_modules(id, experience_version_id) on delete restrict
);

create unique index if not exists cohort_course_plan_modules_id_plan_version_uidx
  on public.cohort_course_plan_modules (id, plan_id, experience_version_id);
create unique index if not exists cohort_course_plan_modules_order_uidx
  on public.cohort_course_plan_modules (plan_id, sort_order);
create unique index if not exists cohort_course_plan_modules_source_uidx
  on public.cohort_course_plan_modules (plan_id, source_module_id);

create table if not exists public.cohort_course_plan_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  plan_module_id uuid not null,
  experience_version_id uuid not null,
  occurrence_type text not null default 'canonical',
  source_section_id uuid null,
  sort_order integer not null default 0,
  visibility text not null default 'visible',
  display_title text null,
  release_at timestamptz null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cohort_course_plan_sections_occurrence_type_check check (occurrence_type in ('canonical', 'supplemental')),
  constraint cohort_course_plan_sections_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint cohort_course_plan_sections_sort_order_check check (sort_order >= 0),
  constraint cohort_course_plan_sections_source_shape_check check ((occurrence_type = 'canonical' and source_section_id is not null) or (occurrence_type = 'supplemental' and source_section_id is null)),
  constraint cohort_course_plan_sections_visibility_check check (visibility in ('visible', 'hidden')),
  constraint cohort_course_plan_sections_module_fk foreign key (plan_module_id, plan_id, experience_version_id) references public.cohort_course_plan_modules(id, plan_id, experience_version_id) on delete cascade,
  constraint cohort_course_plan_sections_plan_fk foreign key (plan_id, experience_version_id) references public.cohort_course_plans(id, experience_version_id) on delete cascade,
  constraint cohort_course_plan_sections_source_fk foreign key (source_section_id, experience_version_id) references public.experience_sections(id, experience_version_id) on delete restrict
);

create unique index if not exists cohort_course_plan_sections_order_uidx
  on public.cohort_course_plan_sections (plan_module_id, sort_order);
create index if not exists cohort_course_plan_sections_source_idx
  on public.cohort_course_plan_sections (source_section_id);

alter table public.experience_offerings
  add column if not exists group_mode text not null default 'off',
  add column if not exists default_delivery_plan_template_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.experience_offerings'::regclass and conname = 'experience_offerings_group_mode_check') then
    alter table public.experience_offerings add constraint experience_offerings_group_mode_check check (group_mode in ('off', 'optional', 'required'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.experience_offerings'::regclass and conname = 'experience_offerings_template_requires_version_check') then
    alter table public.experience_offerings add constraint experience_offerings_template_requires_version_check check (default_delivery_plan_template_id is null or experience_version_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.experience_offerings'::regclass and conname = 'experience_offerings_default_plan_template_fk') then
    alter table public.experience_offerings add constraint experience_offerings_default_plan_template_fk foreign key (default_delivery_plan_template_id, experience_id, experience_version_id) references public.delivery_plan_templates(id, experience_id, experience_version_id) on delete set null;
  end if;
end $$;

create index if not exists experience_offerings_default_plan_template_idx
  on public.experience_offerings (default_delivery_plan_template_id);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'experience_themes', 'delivery_plan_templates',
    'delivery_plan_template_modules', 'delivery_plan_template_sections',
    'cohort_course_plans', 'cohort_course_plan_modules',
    'cohort_course_plan_sections'
  ] loop
    if not exists (
      select 1 from pg_trigger
      where tgname = target_table || '_set_updated_at'
        and tgrelid = format('public.%I', target_table)::regclass
        and not tgisinternal
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.purpose_os_set_updated_at()',
        target_table || '_set_updated_at', target_table
      );
    end if;
  end loop;
end $$;

alter table public.experience_themes enable row level security;
alter table public.delivery_plan_templates enable row level security;
alter table public.delivery_plan_template_modules enable row level security;
alter table public.delivery_plan_template_sections enable row level security;
alter table public.cohort_course_plans enable row level security;
alter table public.cohort_course_plan_modules enable row level security;
alter table public.cohort_course_plan_sections enable row level security;

revoke all on table public.experience_themes, public.delivery_plan_templates,
  public.delivery_plan_template_modules, public.delivery_plan_template_sections,
  public.cohort_course_plans, public.cohort_course_plan_modules,
  public.cohort_course_plan_sections from anon, authenticated;
grant all on table public.experience_themes, public.delivery_plan_templates,
  public.delivery_plan_template_modules, public.delivery_plan_template_sections,
  public.cohort_course_plans, public.cohort_course_plan_modules,
  public.cohort_course_plan_sections to service_role;
