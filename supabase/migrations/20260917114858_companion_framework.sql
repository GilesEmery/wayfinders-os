-- PurposeOS Companion framework.
--
-- Companion mode remains in experience_versions.course_configuration so it is
-- release-pinned with the rest of the Course appearance/configuration. Module
-- records are normalized because they need stable identity, ordering, scope,
-- audience, Resource relationships, and safe delivery/participant data.

create table public.companion_modules (
  id uuid primary key default gen_random_uuid(),
  experience_version_id uuid not null,
  module_type text not null,
  scope text not null,
  audience text not null,
  target_module_id uuid null,
  target_lesson_id uuid null,
  target_section_id uuid null,
  display_title text not null,
  sort_order integer not null default 0,
  visibility text not null default 'visible',
  configuration jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_modules_version_fk
    foreign key (experience_version_id)
    references public.experience_versions(id) on delete cascade,
  constraint companion_modules_target_module_fk
    foreign key (target_module_id, experience_version_id)
    references public.experience_modules(id, experience_version_id) on delete cascade,
  constraint companion_modules_target_lesson_fk
    foreign key (target_lesson_id, target_module_id, experience_version_id)
    references public.experience_lessons(id, module_id, experience_version_id) on delete cascade,
  constraint companion_modules_target_section_fk
    foreign key (target_section_id, target_lesson_id, experience_version_id)
    references public.experience_sections(id, lesson_id, experience_version_id) on delete cascade,
  constraint companion_modules_type_check check (module_type in (
    'personal_notes', 'resources', 'action_steps', 'reflection_prompt',
    'facilitator', 'next_gathering', 'custom_text', 'custom_link',
    'chat', 'video_call', 'group_members', 'prayer', 'announcements',
    'shared_resources', 'group_discussion_prompt', 'group_notes'
  )),
  constraint companion_modules_scope_check
    check (scope in ('course', 'module', 'lesson', 'page')),
  constraint companion_modules_audience_check
    check (audience in ('personal', 'group', 'leaders')),
  constraint companion_modules_visibility_check
    check (visibility in ('visible', 'hidden')),
  constraint companion_modules_sort_order_check check (sort_order >= 0),
  constraint companion_modules_title_check
    check (char_length(btrim(display_title)) between 1 and 200),
  constraint companion_modules_configuration_object_check
    check (jsonb_typeof(configuration) = 'object'),
  constraint companion_modules_scope_target_check check (
    (scope = 'course' and target_module_id is null and target_lesson_id is null and target_section_id is null)
    or (scope = 'module' and target_module_id is not null and target_lesson_id is null and target_section_id is null)
    or (scope = 'lesson' and target_module_id is not null and target_lesson_id is not null and target_section_id is null)
    or (scope = 'page' and target_module_id is not null and target_lesson_id is not null and target_section_id is not null)
  ),
  constraint companion_modules_id_version_key unique (id, experience_version_id),
  constraint companion_modules_version_order_key unique (experience_version_id, sort_order)
);

comment on table public.companion_modules is
  'Release-pinned Companion structure for an Enhanced Course Version. Configuration contains only type-specific defaults, never participant-private or delivery-specific data.';

create index companion_modules_scope_target_idx
  on public.companion_modules (experience_version_id, scope, target_module_id, target_lesson_id, target_section_id)
  where visibility = 'visible';
create index companion_modules_type_idx
  on public.companion_modules (experience_version_id, module_type);

create table public.companion_delivery_overrides (
  id uuid primary key default gen_random_uuid(),
  companion_module_id uuid not null,
  experience_version_id uuid not null,
  offering_id uuid null references public.experience_offerings(id) on delete cascade,
  cohort_course_plan_id uuid null,
  visibility text not null default 'inherit',
  configuration jsonb not null default '{}'::jsonb,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_delivery_overrides_module_fk
    foreign key (companion_module_id, experience_version_id)
    references public.companion_modules(id, experience_version_id) on delete cascade,
  constraint companion_delivery_overrides_plan_fk
    foreign key (cohort_course_plan_id, experience_version_id)
    references public.cohort_course_plans(id, experience_version_id) on delete cascade,
  constraint companion_delivery_overrides_context_check
    check (num_nonnulls(offering_id, cohort_course_plan_id) = 1),
  constraint companion_delivery_overrides_visibility_check
    check (visibility in ('inherit', 'visible', 'hidden')),
  constraint companion_delivery_overrides_configuration_object_check
    check (jsonb_typeof(configuration) = 'object'),
  constraint companion_delivery_overrides_id_module_key
    unique (id, companion_module_id)
);

comment on table public.companion_delivery_overrides is
  'Mutable Offering or Cohort Course Plan values for a version-owned Companion module, such as meeting links, gathering details, facilitator display, and announcements.';

create unique index companion_delivery_overrides_offering_uidx
  on public.companion_delivery_overrides (companion_module_id, offering_id)
  where offering_id is not null;
create unique index companion_delivery_overrides_plan_uidx
  on public.companion_delivery_overrides (companion_module_id, cohort_course_plan_id)
  where cohort_course_plan_id is not null;
create index companion_delivery_overrides_offering_idx
  on public.companion_delivery_overrides (offering_id)
  where offering_id is not null;
create index companion_delivery_overrides_plan_idx
  on public.companion_delivery_overrides (cohort_course_plan_id)
  where cohort_course_plan_id is not null;

create table public.companion_module_resources (
  companion_module_id uuid not null references public.companion_modules(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  delivery_override_id uuid null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint companion_module_resources_override_fk
    foreign key (delivery_override_id, companion_module_id)
    references public.companion_delivery_overrides(id, companion_module_id) on delete cascade,
  constraint companion_module_resources_sort_order_check check (sort_order >= 0)
);

comment on table public.companion_module_resources is
  'Links Companion modules to the existing PurposeOS Resource library. A null override is the Course Version default; a non-null override is delivery-specific.';

create unique index companion_module_resources_default_uidx
  on public.companion_module_resources (companion_module_id, resource_id)
  where delivery_override_id is null;
create unique index companion_module_resources_override_uidx
  on public.companion_module_resources (delivery_override_id, resource_id)
  where delivery_override_id is not null;
create index companion_module_resources_resource_idx
  on public.companion_module_resources (resource_id);

create table public.participant_companion_entries (
  id uuid primary key default gen_random_uuid(),
  companion_module_id uuid not null,
  participant_id uuid not null references public.participants(id) on delete restrict,
  enrollment_id uuid not null,
  experience_version_id uuid not null,
  entry_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participant_companion_entries_module_fk
    foreign key (companion_module_id, experience_version_id)
    references public.companion_modules(id, experience_version_id) on delete restrict,
  constraint participant_companion_entries_enrollment_fk
    foreign key (enrollment_id, participant_id, experience_version_id)
    references public.experience_enrollments(id, participant_id, experience_version_id) on delete restrict,
  constraint participant_companion_entries_data_object_check
    check (jsonb_typeof(entry_data) = 'object'),
  constraint participant_companion_entries_enrollment_module_key
    unique (enrollment_id, companion_module_id)
);

comment on table public.participant_companion_entries is
  'Private per-enrollment data for personal Companion modules. It is not group content and is never stored in Course or delivery configuration.';

create index participant_companion_entries_participant_idx
  on public.participant_companion_entries (participant_id, enrollment_id);
create index participant_companion_entries_module_idx
  on public.participant_companion_entries (companion_module_id);

create trigger companion_modules_set_updated_at
before update on public.companion_modules
for each row execute function public.purpose_os_set_updated_at();

create trigger companion_delivery_overrides_set_updated_at
before update on public.companion_delivery_overrides
for each row execute function public.purpose_os_set_updated_at();

create trigger participant_companion_entries_set_updated_at
before update on public.participant_companion_entries
for each row execute function public.purpose_os_set_updated_at();

alter table public.companion_modules enable row level security;
alter table public.companion_delivery_overrides enable row level security;
alter table public.companion_module_resources enable row level security;
alter table public.participant_companion_entries enable row level security;

revoke all on table public.companion_modules, public.companion_delivery_overrides,
  public.companion_module_resources, public.participant_companion_entries
  from anon, authenticated;
grant all on table public.companion_modules, public.companion_delivery_overrides,
  public.companion_module_resources, public.participant_companion_entries
  to service_role;

-- Extend the existing atomic deep-clone operation so draft Versions receive a
-- new set of module identities and course-default Resource links. Delivery
-- overrides and participant entries intentionally remain with their contexts.
create or replace function public.clone_experience_version(
  p_experience_id uuid, p_source_version_id uuid, p_version_label text, p_actor_id uuid
) returns uuid
language plpgsql security invoker set search_path = ''
as $function$
declare
  v_experience public.experiences%rowtype;
  v_source public.experience_versions%rowtype;
  v_actor_email text;
  v_new_version_id uuid;
  v_new_id uuid;
  v_module_map jsonb := '{}'::jsonb;
  v_lesson_map jsonb := '{}'::jsonb;
  v_section_map jsonb := '{}'::jsonb;
  v_layout_map jsonb := '{}'::jsonb;
  v_column_map jsonb := '{}'::jsonb;
  v_block_map jsonb := '{}'::jsonb;
  v_response_map jsonb := '{}'::jsonb;
  v_companion_map jsonb := '{}'::jsonb;
  r record;
begin
  select * into v_experience from public.experiences where id = p_experience_id for update;
  if not found then raise exception 'Experience not found'; end if;
  select * into v_source from public.experience_versions where id = p_source_version_id for update;
  if not found then raise exception 'Version not found'; end if;
  if v_source.experience_id <> p_experience_id then raise exception 'Version belongs to another Experience'; end if;
  if v_source.status <> 'published' then raise exception 'Clone requires a Published source Version'; end if;
  if p_version_label is null or char_length(pg_catalog.btrim(p_version_label)) not between 1 and 80 then
    raise exception 'Version label must contain 1 to 80 nonblank characters';
  end if;
  if exists (select 1 from public.experience_versions where experience_id = p_experience_id and version_label = p_version_label) then
    raise exception 'Duplicate Version label';
  end if;
  select email_normalized into v_actor_email from public.admin_members
    where auth_user_id = p_actor_id and status = 'active' and role in ('admin', 'super_admin');
  if v_actor_email is null or pg_catalog.btrim(v_actor_email) = '' then raise exception 'Valid actor email required for audit'; end if;

  insert into public.experience_versions (experience_id, version_label, status, title, description,
    based_on_version_id, release_type, theme_id, shell_mode, course_configuration, created_by)
  values (p_experience_id, p_version_label, 'draft', v_source.title, v_source.description,
    p_source_version_id, v_source.release_type, v_source.theme_id, v_source.shell_mode, v_source.course_configuration, p_actor_id)
  returning id into v_new_version_id;

  for r in select * from public.experience_modules where experience_version_id = p_source_version_id order by sort_order, id loop
    insert into public.experience_modules (experience_version_id, module_key, title, description, sort_order,
      is_required, requirement_level, metadata)
    values (v_new_version_id, r.module_key, r.title, r.description, r.sort_order,
      r.is_required, r.requirement_level, r.metadata) returning id into v_new_id;
    v_module_map := v_module_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select * from public.experience_lessons where experience_version_id = p_source_version_id order by module_id, sort_order, id loop
    if not v_module_map ? r.module_id::text then raise exception 'Clone mapping failure: Module'; end if;
    insert into public.experience_lessons (module_id, experience_version_id, lesson_key, title, description,
      sort_order, is_required, requirement_level, completion_rule, metadata)
    values ((v_module_map ->> r.module_id::text)::uuid, v_new_version_id, r.lesson_key, r.title, r.description,
      r.sort_order, r.is_required, r.requirement_level, r.completion_rule, r.metadata) returning id into v_new_id;
    v_lesson_map := v_lesson_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select * from public.experience_sections where experience_version_id = p_source_version_id order by lesson_id, sort_order, id loop
    if not v_lesson_map ? r.lesson_id::text or not v_module_map ? r.module_id::text then
      raise exception 'Clone mapping failure: Page parent';
    end if;
    insert into public.experience_sections (lesson_id, module_id, experience_version_id, section_key, title,
      description, sort_order, requirement_level, renderer_mode, custom_renderer_key, completion_rule, settings, metadata)
    values ((v_lesson_map ->> r.lesson_id::text)::uuid, (v_module_map ->> r.module_id::text)::uuid,
      v_new_version_id, r.section_key, r.title, r.description, r.sort_order, r.requirement_level,
      r.renderer_mode, r.custom_renderer_key, r.completion_rule, r.settings, r.metadata) returning id into v_new_id;
    v_section_map := v_section_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select layout.* from public.section_layouts layout
    join public.experience_sections s on s.id = layout.section_id
    where s.experience_version_id = p_source_version_id order by layout.section_id, layout.id loop
    if not v_section_map ? r.section_id::text then raise exception 'Clone mapping failure: Page layout'; end if;
    insert into public.section_layouts (section_id, layout_mode, participant_resizing_enabled, settings)
    values ((v_section_map ->> r.section_id::text)::uuid, r.layout_mode, r.participant_resizing_enabled, r.settings)
    returning id into v_new_id;
    v_layout_map := v_layout_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select c.* from public.section_columns c
    join public.experience_sections s on s.id = c.section_id
    where s.experience_version_id = p_source_version_id order by c.section_layout_id, c.sort_order, c.id loop
    if not v_layout_map ? r.section_layout_id::text or not v_section_map ? r.section_id::text then
      raise exception 'Clone mapping failure: Column parent';
    end if;
    insert into public.section_columns (section_layout_id, section_id, column_key, label, sort_order,
      width_percent, sticky, collapsible, default_collapsed, mobile_order, mobile_behavior, settings)
    values ((v_layout_map ->> r.section_layout_id::text)::uuid, (v_section_map ->> r.section_id::text)::uuid,
      r.column_key, r.label, r.sort_order, r.width_percent, r.sticky, r.collapsible, r.default_collapsed,
      r.mobile_order, r.mobile_behavior, r.settings) returning id into v_new_id;
    v_column_map := v_column_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select b.* from public.content_blocks b
    join public.experience_lessons l on l.id = b.lesson_id
    where l.experience_version_id = p_source_version_id order by b.lesson_id, b.sort_order, b.id loop
    if not v_lesson_map ? r.lesson_id::text
      or (r.section_id is not null and not v_section_map ? r.section_id::text)
      or (r.column_id is not null and not v_column_map ? r.column_id::text) then
      raise exception 'Clone mapping failure: Content parent';
    end if;
    insert into public.content_blocks (lesson_id, section_id, column_id, block_key, block_type, sort_order,
      content, settings, requirement_level, status, visibility, completion_rule, custom_renderer_key, metadata)
    values ((v_lesson_map ->> r.lesson_id::text)::uuid,
      case when r.section_id is null then null else (v_section_map ->> r.section_id::text)::uuid end,
      case when r.column_id is null then null else (v_column_map ->> r.column_id::text)::uuid end,
      r.block_key, r.block_type, r.sort_order, r.content, r.settings, r.requirement_level,
      r.status, r.visibility, r.completion_rule, r.custom_renderer_key, r.metadata) returning id into v_new_id;
    v_block_map := v_block_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select d.* from public.response_definitions d
    where d.experience_version_id = p_source_version_id order by d.lesson_id, d.response_key, d.id loop
    if not v_lesson_map ? r.lesson_id::text or (r.block_id is not null and not v_block_map ? r.block_id::text) then
      raise exception 'Clone mapping failure: Response parent';
    end if;
    insert into public.response_definitions (lesson_id, experience_version_id, block_id, response_key,
      response_type, label, instructions, is_required, configuration, raw_visibility,
      result_visibility, share_mode, visibility_settings)
    values ((v_lesson_map ->> r.lesson_id::text)::uuid, v_new_version_id,
      case when r.block_id is null then null else (v_block_map ->> r.block_id::text)::uuid end,
      r.response_key, r.response_type, r.label, r.instructions, r.is_required, r.configuration,
      r.raw_visibility, r.result_visibility, r.share_mode, r.visibility_settings) returning id into v_new_id;
    v_response_map := v_response_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select link.* from public.content_block_resources link
    join public.content_blocks b on b.id = link.content_block_id
    join public.experience_lessons l on l.id = b.lesson_id
    where l.experience_version_id = p_source_version_id order by link.content_block_id, link.sort_order, link.resource_id loop
    if not v_block_map ? r.content_block_id::text then raise exception 'Clone mapping failure: Resource link'; end if;
    insert into public.content_block_resources (content_block_id, resource_id, sort_order)
    values ((v_block_map ->> r.content_block_id::text)::uuid, r.resource_id, r.sort_order);
  end loop;
  for r in select * from public.companion_modules
    where experience_version_id = p_source_version_id order by sort_order, id loop
    insert into public.companion_modules (experience_version_id, module_type, scope, audience,
      target_module_id, target_lesson_id, target_section_id, display_title, sort_order,
      visibility, configuration, created_by)
    values (v_new_version_id, r.module_type, r.scope, r.audience,
      case when r.target_module_id is null then null else (v_module_map ->> r.target_module_id::text)::uuid end,
      case when r.target_lesson_id is null then null else (v_lesson_map ->> r.target_lesson_id::text)::uuid end,
      case when r.target_section_id is null then null else (v_section_map ->> r.target_section_id::text)::uuid end,
      r.display_title, r.sort_order, r.visibility, r.configuration, p_actor_id)
    returning id into v_new_id;
    v_companion_map := v_companion_map || pg_catalog.jsonb_build_object(r.id::text, v_new_id::text);
  end loop;
  for r in select link.* from public.companion_module_resources link
    join public.companion_modules module on module.id = link.companion_module_id
    where module.experience_version_id = p_source_version_id
      and link.delivery_override_id is null
    order by link.companion_module_id, link.sort_order, link.resource_id loop
    if not v_companion_map ? r.companion_module_id::text then raise exception 'Clone mapping failure: Companion Resource link'; end if;
    insert into public.companion_module_resources
      (companion_module_id, resource_id, delivery_override_id, sort_order)
    values ((v_companion_map ->> r.companion_module_id::text)::uuid, r.resource_id, null, r.sort_order);
  end loop;
  insert into public.admin_audit_log (admin_user_id, admin_email, action, entity_type, entity_id, metadata)
  values (p_actor_id, v_actor_email, 'cloned_experience_version', 'experience_version', v_new_version_id::text,
    pg_catalog.jsonb_build_object('experience_id', p_experience_id, 'source_version_id', p_source_version_id,
      'new_version_id', v_new_version_id, 'actor_id', p_actor_id,
      'version_label', p_version_label));
  return v_new_version_id;
end;
$function$;

revoke all on function public.clone_experience_version(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.clone_experience_version(uuid, uuid, text, uuid) to service_role;
