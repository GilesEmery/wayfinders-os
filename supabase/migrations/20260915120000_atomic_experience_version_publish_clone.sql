-- Atomic trusted-server LMS release operations. Application authorization and the
-- richer TypeScript Block/renderer registry checks must run before these RPCs.
-- SECURITY INVOKER is intentional: service_role supplies table access and bypasses
-- RLS; an actor UUID is audit attribution, never an authorization grant.

create function public.publish_experience_version(
  p_experience_id uuid, p_version_id uuid, p_actor_id uuid
) returns uuid
language plpgsql security invoker set search_path = ''
as $function$
declare
  v_experience public.experiences%rowtype;
  v_version public.experience_versions%rowtype;
  v_actor_email text;
begin
  select * into v_experience from public.experiences where id = p_experience_id for update;
  if not found then raise exception 'Experience not found'; end if;
  select * into v_version from public.experience_versions where id = p_version_id for update;
  if not found then raise exception 'Version not found'; end if;
  if v_version.experience_id <> p_experience_id then raise exception 'Version belongs to another Experience'; end if;
  if v_version.status <> 'draft' then raise exception 'Publish requires a Draft Version'; end if;
  -- Match the existing requireAdmin() identity source; no auth.users SELECT grant needed.
  select email_normalized into v_actor_email from public.admin_members
    where auth_user_id = p_actor_id and status = 'active' and role in ('admin', 'super_admin');
  if v_actor_email is null or pg_catalog.btrim(v_actor_email) = '' then raise exception 'Valid actor email required for audit'; end if;

  if not exists (select 1 from public.experience_modules where experience_version_id = p_version_id) then
    raise exception 'Cannot publish: empty curriculum (no Modules)';
  end if;
  if not exists (select 1 from public.experience_lessons where experience_version_id = p_version_id) then
    raise exception 'Cannot publish: missing Lessons';
  end if;
  if not exists (select 1 from public.experience_sections where experience_version_id = p_version_id) then
    raise exception 'Cannot publish: missing Pages';
  end if;
  if exists (
    select 1 from public.experience_modules m
    where m.experience_version_id = p_version_id
      and not exists (select 1 from public.experience_lessons l where l.module_id = m.id and l.experience_version_id = p_version_id)
  ) then raise exception 'Cannot publish: Module without Lessons'; end if;
  if exists (
    select 1 from public.experience_lessons l
    where l.experience_version_id = p_version_id
      and not exists (select 1 from public.experience_sections s where s.lesson_id = l.id and s.experience_version_id = p_version_id)
  ) then raise exception 'Cannot publish: Lesson without Pages'; end if;
  -- Composite FKs also enforce these relationships. Recheck here for a clear RPC error.
  if exists (
    select 1 from public.experience_sections s
    left join public.experience_lessons l on l.id = s.lesson_id and l.module_id = s.module_id and l.experience_version_id = s.experience_version_id
    where s.experience_version_id = p_version_id and l.id is null
  ) then raise exception 'Cannot publish: invalid Page hierarchy'; end if;
  if exists (
    select 1 from public.experience_sections s
    left join public.section_layouts layout on layout.section_id = s.id
    where s.experience_version_id = p_version_id and s.renderer_mode in ('builder', 'hybrid')
      and layout.id is null
  ) then raise exception 'Cannot publish: Builder/Hybrid Page missing layout'; end if;
  if exists (
    select 1 from public.experience_sections s
    join public.section_layouts layout on layout.section_id = s.id
    left join public.section_columns c on c.section_layout_id = layout.id and c.section_id = s.id
    where s.experience_version_id = p_version_id and s.renderer_mode in ('builder', 'hybrid')
    group by s.id, layout.id, layout.layout_mode
    having count(c.id) <> case layout.layout_mode when 'single_column' then 1 when 'two_column' then 2 else 3 end
      or coalesce(sum(c.width_percent), 0) <> 100
      or count(distinct c.sort_order) <> count(c.id)
      or count(distinct c.mobile_order) <> count(c.id)
  ) then raise exception 'Cannot publish: invalid layout structure'; end if;
  if exists (
    select 1 from public.content_blocks b
    join public.experience_lessons l on l.id = b.lesson_id
    left join public.experience_sections s on s.id = b.section_id and s.lesson_id = b.lesson_id
    left join public.section_columns c on c.id = b.column_id and c.section_id = b.section_id
    where l.experience_version_id = p_version_id and b.status = 'active' and b.visibility = 'visible'
      and b.requirement_level = 'required'
      and (b.section_id is null or b.column_id is null or s.id is null or c.id is null)
  ) then raise exception 'Cannot publish: structurally broken required Content'; end if;
  if exists (
    select 1 from public.content_blocks b
    join public.experience_lessons l on l.id = b.lesson_id
    where l.experience_version_id = p_version_id and b.status = 'active' and b.visibility = 'visible'
      and b.requirement_level = 'required'
      and (b.completion_rule = 'response_submitted' or b.block_type in ('structured_response', 'reflection', 'card_selection', 'checklist', 'check_in'))
      and not exists (
        select 1 from public.response_definitions d
        where d.block_id = b.id and d.lesson_id = b.lesson_id and d.experience_version_id = p_version_id
      )
  ) then raise exception 'Cannot publish: required response Content missing definition'; end if;
  if exists (
    select 1 from public.response_definitions d
    left join public.experience_lessons l on l.id = d.lesson_id and l.experience_version_id = d.experience_version_id
    where d.experience_version_id = p_version_id and l.id is null
  ) then raise exception 'Cannot publish: invalid response definition hierarchy'; end if;

  update public.experience_versions
    set status = 'published', published_at = pg_catalog.now(), published_by = p_actor_id
    where id = p_version_id;
  update public.experiences set current_published_version_id = p_version_id where id = p_experience_id;
  insert into public.admin_audit_log (admin_user_id, admin_email, action, entity_type, entity_id, metadata)
    values (p_actor_id, v_actor_email, 'published_experience_version', 'experience_version', p_version_id::text,
      pg_catalog.jsonb_build_object('experience_id', p_experience_id, 'version_id', p_version_id, 'actor_id', p_actor_id,
        'previous_current_version_id', v_experience.current_published_version_id));
  return p_version_id;
end;
$function$;

create function public.clone_experience_version(
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
  -- Match the existing requireAdmin() identity source; no auth.users SELECT grant needed.
  select email_normalized into v_actor_email from public.admin_members
    where auth_user_id = p_actor_id and status = 'active' and role in ('admin', 'super_admin');
  if v_actor_email is null or pg_catalog.btrim(v_actor_email) = '' then raise exception 'Valid actor email required for audit'; end if;

  insert into public.experience_versions (experience_id, version_label, status, title, description,
    based_on_version_id, release_type, theme_id, created_by)
  values (p_experience_id, p_version_label, 'draft', v_source.title, v_source.description,
    p_source_version_id, v_source.release_type, v_source.theme_id, p_actor_id)
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
  insert into public.admin_audit_log (admin_user_id, admin_email, action, entity_type, entity_id, metadata)
  values (p_actor_id, v_actor_email, 'cloned_experience_version', 'experience_version', v_new_version_id::text,
    pg_catalog.jsonb_build_object('experience_id', p_experience_id, 'source_version_id', p_source_version_id,
      'new_version_id', v_new_version_id, 'actor_id', p_actor_id,
      'version_label', p_version_label));
  return v_new_version_id;
end;
$function$;

comment on function public.publish_experience_version(uuid, uuid, uuid) is
  'Trusted-server atomic publish. requireAdmin() and full Block/renderer validation remain application-side.';
comment on function public.clone_experience_version(uuid, uuid, text, uuid) is
  'Trusted-server deep curriculum clone. Explicit semantic-key-preserving UUID maps; participant state is not copied.';

revoke all on function public.publish_experience_version(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.clone_experience_version(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.publish_experience_version(uuid, uuid, uuid) to service_role;
grant execute on function public.clone_experience_version(uuid, uuid, text, uuid) to service_role;
