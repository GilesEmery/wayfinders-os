-- Moving a Page must preserve its content, response definitions, and Companion.
alter table public.content_blocks alter constraint content_blocks_section_lesson_fk deferrable initially immediate;
alter table public.response_definitions alter constraint response_definitions_block_lesson_fkey deferrable initially immediate;
alter table public.companion_modules alter constraint companion_modules_target_section_fk deferrable initially immediate;
alter table public.experience_progress alter constraint experience_progress_current_section_fk deferrable initially immediate;

create or replace function public.move_draft_experience_section(
  p_experience_id uuid, p_experience_version_id uuid, p_section_id uuid,
  p_target_lesson_id uuid, p_position integer default 2147483647
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_source uuid;
  v_module uuid;
  v_key text;
  v_order integer;
  v_position integer;
  v_ids uuid[];
begin
  if p_position is null or p_position < 0 then raise exception 'Position must be zero or greater.'; end if;
  perform 1 from public.experience_versions
    where id = p_experience_version_id and experience_id = p_experience_id and status = 'draft' for update;
  if not found then raise exception 'Only an editable Draft Version may be restructured.'; end if;
  select lesson_id, section_key into v_source, v_key from public.experience_sections
    where id = p_section_id and experience_version_id = p_experience_version_id for update;
  if not found then raise exception 'Source Page is outside this Draft Version.'; end if;
  select module_id into v_module from public.experience_lessons
    where id = p_target_lesson_id and experience_version_id = p_experience_version_id for update;
  if not found then raise exception 'Destination Lesson is outside this Draft Version.'; end if;
  if exists (select 1 from public.experience_sections where lesson_id = p_target_lesson_id
    and section_key = v_key and id <> p_section_id) then
    raise exception 'The destination Lesson already contains a Page with key "%".', v_key;
  end if;

  set constraints public.content_blocks_section_lesson_fk, public.response_definitions_block_lesson_fkey,
    public.companion_modules_target_section_fk, public.experience_progress_current_section_fk deferred;

  if v_source <> p_target_lesson_id then
    -- Legacy blocks have lesson-wide unique order values. Append the moving blocks
    -- above both lessons' current ranges to avoid collisions and retain their order.
    select coalesce(max(sort_order), -1) + 1 into v_order from public.content_blocks
      where lesson_id in (v_source, p_target_lesson_id);
    with ordered as (
      select id, row_number() over (order by sort_order, created_at, id) - 1 as n
      from public.content_blocks where section_id = p_section_id
    ) update public.content_blocks b set lesson_id = p_target_lesson_id, sort_order = v_order + ordered.n
      from ordered where b.id = ordered.id;
    update public.response_definitions r set lesson_id = p_target_lesson_id
      where block_id in (select id from public.content_blocks where section_id = p_section_id);
    update public.companion_modules set target_lesson_id = p_target_lesson_id, target_module_id = v_module
      where target_section_id = p_section_id;
    update public.experience_progress set current_lesson_id = p_target_lesson_id, current_module_id = v_module
      where current_section_id = p_section_id;
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_order from public.experience_sections
    where lesson_id in (v_source, p_target_lesson_id);
  update public.experience_sections set lesson_id = p_target_lesson_id, module_id = v_module, sort_order = v_order
    where id = p_section_id;

  select coalesce(array_agg(id order by sort_order, created_at, id), '{}'::uuid[]) into v_ids
    from public.experience_sections where lesson_id = p_target_lesson_id and id <> p_section_id;
  v_position := least(p_position, cardinality(v_ids));
  v_ids := v_ids[1:v_position] || array[p_section_id] || v_ids[v_position + 1:cardinality(v_ids)];
  -- Park before normalizing so immediate uniqueness constraints remain valid.
  select coalesce(max(sort_order), -1) + cardinality(v_ids) + 10 into v_order
    from public.experience_sections where lesson_id in (v_source, p_target_lesson_id);
  update public.experience_sections s set sort_order = v_order + desired.n
    from unnest(v_ids) with ordinality as desired(id, n) where s.id = desired.id;
  update public.experience_sections s set sort_order = desired.n - 1
    from unnest(v_ids) with ordinality as desired(id, n) where s.id = desired.id;
  if v_source <> p_target_lesson_id then
    select coalesce(array_agg(id order by sort_order, created_at, id), '{}'::uuid[]) into v_ids
      from public.experience_sections where lesson_id = v_source;
    update public.experience_sections s set sort_order = v_order + desired.n
      from unnest(v_ids) with ordinality as desired(id, n) where s.id = desired.id;
    update public.experience_sections s set sort_order = desired.n - 1
      from unnest(v_ids) with ordinality as desired(id, n) where s.id = desired.id;
  end if;
  set constraints public.content_blocks_section_lesson_fk, public.response_definitions_block_lesson_fkey,
    public.companion_modules_target_section_fk, public.experience_progress_current_section_fk immediate;
end;
$$;
revoke all on function public.move_draft_experience_section(uuid, uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.move_draft_experience_section(uuid, uuid, uuid, uuid, integer) to service_role;
