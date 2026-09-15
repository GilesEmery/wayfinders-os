-- Reconcile the repository with the authoritative live A1 LMS schema.
--
-- This migration is intentionally additive and safe to apply to the already-upgraded
-- hosted database. A fresh database receives the missing objects; the live database
-- keeps its existing objects. Known pre-A1 check constraints are replaced only when
-- their catalog definitions differ from the authoritative definitions below.

create or replace function public.purpose_os_set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

alter table public.platform_role_assignments
  add column if not exists scope_type text;

do $$
declare
  current_definition text;
begin
  select pg_get_constraintdef(oid, true)
  into current_definition
  from pg_constraint
  where conrelid = 'public.platform_role_assignments'::regclass
    and conname = 'platform_role_assignments_role_check';

  if current_definition is distinct from
    'CHECK (role = ANY (ARRAY[''admin''::text, ''super_admin''::text, ''organization_admin''::text, ''hub_leader''::text, ''facilitator''::text, ''course_builder''::text, ''course_admin''::text]))'
  then
    alter table public.platform_role_assignments
      drop constraint if exists platform_role_assignments_role_check;
    alter table public.platform_role_assignments
      add constraint platform_role_assignments_role_check
      check (role in ('admin', 'super_admin', 'organization_admin', 'hub_leader', 'facilitator', 'course_builder', 'course_admin'));
  end if;

  select pg_get_constraintdef(oid, true)
  into current_definition
  from pg_constraint
  where conrelid = 'public.platform_role_assignments'::regclass
    and conname = 'platform_role_assignments_scope_type_check';

  if current_definition is distinct from
    'CHECK (scope_type IS NULL OR (scope_type = ANY (ARRAY[''platform''::text, ''global''::text, ''organization''::text, ''hub''::text, ''cohort''::text, ''experience''::text])))'
  then
    alter table public.platform_role_assignments
      drop constraint if exists platform_role_assignments_scope_type_check;
    alter table public.platform_role_assignments
      add constraint platform_role_assignments_scope_type_check
      check (scope_type is null or scope_type in ('platform', 'global', 'organization', 'hub', 'cohort', 'experience'));
  end if;
end $$;

alter table public.experience_versions
  add column if not exists based_on_version_id uuid,
  add column if not exists published_by uuid,
  add column if not exists release_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience_versions'::regclass
      and conname = 'experience_versions_based_on_version_fk'
  ) then
    alter table public.experience_versions
      add constraint experience_versions_based_on_version_fk
      foreign key (based_on_version_id) references public.experience_versions(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience_versions'::regclass
      and conname = 'experience_versions_release_type_check'
  ) then
    alter table public.experience_versions
      add constraint experience_versions_release_type_check
      check (release_type is null or release_type in ('correction', 'structural', 'major'));
  end if;
end $$;

create unique index if not exists experience_versions_id_experience_uidx
  on public.experience_versions (id, experience_id);

alter table public.experiences
  add column if not exists current_published_version_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experiences'::regclass
      and conname = 'experiences_current_published_version_fk'
  ) then
    alter table public.experiences
      add constraint experiences_current_published_version_fk
      foreign key (current_published_version_id, id)
      references public.experience_versions(id, experience_id);
  end if;
end $$;

alter table public.experience_modules
  add column if not exists module_key text not null,
  add column if not exists requirement_level text not null default 'required';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience_modules'::regclass
      and conname = 'experience_modules_module_key_format_check'
  ) then
    alter table public.experience_modules
      add constraint experience_modules_module_key_format_check
      check (module_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience_modules'::regclass
      and conname = 'experience_modules_requirement_level_check'
  ) then
    alter table public.experience_modules
      add constraint experience_modules_requirement_level_check
      check (requirement_level in ('required', 'recommended', 'optional'));
  end if;
end $$;

create unique index if not exists experience_modules_id_version_uidx
  on public.experience_modules (id, experience_version_id);
create unique index if not exists experience_modules_version_module_key_uidx
  on public.experience_modules (experience_version_id, module_key);

alter table public.experience_lessons
  add column if not exists lesson_key text not null,
  add column if not exists requirement_level text not null default 'required';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience_lessons'::regclass
      and conname = 'experience_lessons_lesson_key_format_check'
  ) then
    alter table public.experience_lessons
      add constraint experience_lessons_lesson_key_format_check
      check (lesson_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience_lessons'::regclass
      and conname = 'experience_lessons_requirement_level_check'
  ) then
    alter table public.experience_lessons
      add constraint experience_lessons_requirement_level_check
      check (requirement_level in ('required', 'recommended', 'optional'));
  end if;
end $$;

create unique index if not exists experience_lessons_id_module_version_uidx
  on public.experience_lessons (id, module_id, experience_version_id);
create unique index if not exists experience_lessons_module_lesson_key_uidx
  on public.experience_lessons (module_id, lesson_key);

create table if not exists public.experience_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  module_id uuid not null,
  experience_version_id uuid not null,
  section_key text not null,
  title text not null,
  description text null,
  sort_order integer not null default 0,
  requirement_level text not null default 'required',
  renderer_mode text not null default 'builder',
  custom_renderer_key text null,
  completion_rule text not null default 'all_required_blocks',
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_sections_completion_rule_check check (completion_rule in ('none', 'view', 'manual', 'all_required_blocks', 'any_required_block', 'response_submitted', 'custom')),
  constraint experience_sections_custom_renderer_check check (((renderer_mode in ('custom', 'route_handoff')) and custom_renderer_key is not null and btrim(custom_renderer_key) <> '') or renderer_mode in ('builder', 'hybrid')),
  constraint experience_sections_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint experience_sections_renderer_mode_check check (renderer_mode in ('builder', 'hybrid', 'custom', 'route_handoff')),
  constraint experience_sections_requirement_level_check check (requirement_level in ('required', 'recommended', 'optional')),
  constraint experience_sections_section_key_format_check check (section_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint experience_sections_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint experience_sections_sort_order_check check (sort_order >= 0),
  constraint experience_sections_lesson_module_version_fk foreign key (lesson_id, module_id, experience_version_id) references public.experience_lessons(id, module_id, experience_version_id) on delete cascade
);

create unique index if not exists experience_sections_id_lesson_uidx
  on public.experience_sections (id, lesson_id);
create unique index if not exists experience_sections_id_lesson_version_uidx
  on public.experience_sections (id, lesson_id, experience_version_id);
create unique index if not exists experience_sections_id_version_uidx
  on public.experience_sections (id, experience_version_id);
create unique index if not exists experience_sections_lesson_section_key_uidx
  on public.experience_sections (lesson_id, section_key);
create index if not exists experience_sections_lesson_sort_idx
  on public.experience_sections (lesson_id, sort_order);
create index if not exists experience_sections_module_idx
  on public.experience_sections (module_id);
create index if not exists experience_sections_version_idx
  on public.experience_sections (experience_version_id);

create table if not exists public.section_layouts (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null,
  layout_mode text not null default 'single_column',
  participant_resizing_enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint section_layouts_layout_mode_check check (layout_mode in ('single_column', 'two_column', 'three_column')),
  constraint section_layouts_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint section_layouts_section_fk foreign key (section_id) references public.experience_sections(id) on delete cascade,
  constraint section_layouts_section_id_key unique (section_id)
);

create unique index if not exists section_layouts_id_section_uidx
  on public.section_layouts (id, section_id);

create table if not exists public.section_columns (
  id uuid primary key default gen_random_uuid(),
  section_layout_id uuid not null,
  section_id uuid not null,
  column_key text not null,
  label text null,
  sort_order integer not null default 0,
  width_percent numeric not null,
  sticky boolean not null default false,
  collapsible boolean not null default false,
  default_collapsed boolean not null default false,
  mobile_order integer not null default 0,
  mobile_behavior text not null default 'stack',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint section_columns_collapsed_check check (default_collapsed = false or collapsible = true),
  constraint section_columns_column_key_format_check check (column_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint section_columns_mobile_behavior_check check (mobile_behavior in ('stack', 'collapsible', 'hidden')),
  constraint section_columns_mobile_order_check check (mobile_order >= 0),
  constraint section_columns_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint section_columns_sort_order_check check (sort_order >= 0),
  constraint section_columns_width_check check (width_percent > 0 and width_percent <= 100),
  constraint section_columns_layout_section_fk foreign key (section_layout_id, section_id) references public.section_layouts(id, section_id) on delete cascade
);

create unique index if not exists section_columns_id_section_uidx
  on public.section_columns (id, section_id);
create unique index if not exists section_columns_layout_column_key_uidx
  on public.section_columns (section_layout_id, column_key);
create index if not exists section_columns_layout_sort_idx
  on public.section_columns (section_layout_id, sort_order);
create index if not exists section_columns_section_idx
  on public.section_columns (section_id);

alter table public.content_blocks
  add column if not exists section_id uuid,
  add column if not exists column_id uuid,
  add column if not exists block_key text not null,
  add column if not exists requirement_level text not null default 'optional',
  add column if not exists status text not null default 'active',
  add column if not exists visibility text not null default 'visible',
  add column if not exists completion_rule text not null default 'none',
  add column if not exists custom_renderer_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
declare
  current_definition text;
begin
  select pg_get_constraintdef(oid, true)
  into current_definition
  from pg_constraint
  where conrelid = 'public.content_blocks'::regclass
    and conname = 'content_blocks_block_type_check';

  if current_definition is distinct from
    'CHECK (block_type = ANY (ARRAY[''heading''::text, ''rich_text''::text, ''video''::text, ''image''::text, ''scripture''::text, ''quote''::text, ''callout''::text, ''reflection''::text, ''journal''::text, ''discussion_prompt''::text, ''practice''::text, ''assignment''::text, ''quiz''::text, ''check_in''::text, ''worksheet''::text, ''checklist''::text, ''resource''::text, ''button''::text, ''embed''::text, ''action_step''::text, ''ranking''::text, ''card_selection''::text, ''structured_response''::text, ''custom_component''::text, ''system_component''::text]))'
  then
    alter table public.content_blocks drop constraint if exists content_blocks_block_type_check;
    alter table public.content_blocks
      add constraint content_blocks_block_type_check
      check (block_type in ('heading', 'rich_text', 'video', 'image', 'scripture', 'quote', 'callout', 'reflection', 'journal', 'discussion_prompt', 'practice', 'assignment', 'quiz', 'check_in', 'worksheet', 'checklist', 'resource', 'button', 'embed', 'action_step', 'ranking', 'card_selection', 'structured_response', 'custom_component', 'system_component'));
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_column_requires_section_check') then
    alter table public.content_blocks add constraint content_blocks_column_requires_section_check check (column_id is null or section_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_completion_rule_check') then
    alter table public.content_blocks add constraint content_blocks_completion_rule_check check (completion_rule in ('none', 'view', 'manual', 'interaction', 'response_submitted', 'media_complete', 'custom'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_custom_renderer_check') then
    alter table public.content_blocks add constraint content_blocks_custom_renderer_check check (custom_renderer_key is null or (block_type in ('custom_component', 'system_component') and btrim(custom_renderer_key) <> ''));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_metadata_object_check') then
    alter table public.content_blocks add constraint content_blocks_metadata_object_check check (jsonb_typeof(metadata) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_requirement_level_check') then
    alter table public.content_blocks add constraint content_blocks_requirement_level_check check (requirement_level in ('required', 'recommended', 'optional'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_status_check') then
    alter table public.content_blocks add constraint content_blocks_status_check check (status in ('active', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_visibility_check') then
    alter table public.content_blocks add constraint content_blocks_visibility_check check (visibility in ('visible', 'hidden'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_column_section_fk') then
    alter table public.content_blocks add constraint content_blocks_column_section_fk foreign key (column_id, section_id) references public.section_columns(id, section_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.content_blocks'::regclass and conname = 'content_blocks_section_lesson_fk') then
    alter table public.content_blocks add constraint content_blocks_section_lesson_fk foreign key (section_id, lesson_id) references public.experience_sections(id, lesson_id) on delete cascade;
  end if;
end $$;

create index if not exists content_blocks_column_idx on public.content_blocks (column_id);
create index if not exists content_blocks_column_sort_idx on public.content_blocks (column_id, sort_order) where column_id is not null;
create unique index if not exists content_blocks_section_block_key_uidx on public.content_blocks (section_id, block_key) where section_id is not null;
create index if not exists content_blocks_section_idx on public.content_blocks (section_id);

alter table public.experience_progress
  add column if not exists current_section_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.experience_progress'::regclass and conname = 'experience_progress_current_section_requires_lesson_check') then
    alter table public.experience_progress add constraint experience_progress_current_section_requires_lesson_check check (current_section_id is null or current_lesson_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.experience_progress'::regclass and conname = 'experience_progress_current_section_fk') then
    alter table public.experience_progress add constraint experience_progress_current_section_fk foreign key (current_section_id, current_lesson_id, experience_version_id) references public.experience_sections(id, lesson_id, experience_version_id);
  end if;
end $$;

create table if not exists public.section_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null,
  participant_id uuid not null,
  experience_version_id uuid not null,
  section_id uuid not null,
  status text not null default 'not_started',
  resume_state jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint section_progress_completed_timestamp_check check (status <> 'completed' or completed_at is not null),
  constraint section_progress_resume_state_object_check check (jsonb_typeof(resume_state) = 'object'),
  constraint section_progress_status_check check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  constraint section_progress_enrollment_fk foreign key (enrollment_id, participant_id, experience_version_id) references public.experience_enrollments(id, participant_id, experience_version_id) on delete cascade,
  constraint section_progress_section_version_fk foreign key (section_id, experience_version_id) references public.experience_sections(id, experience_version_id) on delete cascade
);

create index if not exists section_progress_active_idx
  on public.section_progress (enrollment_id, section_id) where status = 'in_progress';
create unique index if not exists section_progress_enrollment_section_uidx
  on public.section_progress (enrollment_id, section_id);
create index if not exists section_progress_participant_idx
  on public.section_progress (participant_id);
create index if not exists section_progress_section_idx
  on public.section_progress (section_id);
create index if not exists section_progress_version_idx
  on public.section_progress (experience_version_id);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'experience_sections', 'section_layouts', 'section_columns', 'section_progress'
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

alter table public.experience_sections enable row level security;
alter table public.section_layouts enable row level security;
alter table public.section_columns enable row level security;
alter table public.section_progress enable row level security;

revoke all on table public.experience_sections, public.section_layouts,
  public.section_columns, public.section_progress from anon, authenticated;
grant all on table public.experience_sections, public.section_layouts,
  public.section_columns, public.section_progress to service_role;
