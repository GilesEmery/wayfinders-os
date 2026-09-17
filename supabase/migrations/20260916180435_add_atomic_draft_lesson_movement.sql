-- Allow the Lesson and all child Pages to change Week atomically.
alter table public.experience_sections
  alter constraint experience_sections_lesson_module_version_fk
  deferrable initially immediate;

create or replace function public.move_draft_experience_lesson(
  p_experience_id uuid,
  p_experience_version_id uuid,
  p_lesson_id uuid,
  p_target_module_id uuid,
  p_position integer default 0
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source_module_id uuid;
  v_lesson_key text;
  v_target_count integer;
  v_position integer;
  v_parking_base integer;
begin
  if p_position < 0 then
    raise exception 'Position must be zero or greater.';
  end if;

  perform 1
  from public.experience_versions
  where id = p_experience_version_id
    and experience_id = p_experience_id
    and status = 'draft'
  for update;

  if not found then
    raise exception 'Only an editable Draft Version may be restructured.';
  end if;

  select module_id, lesson_key
  into v_source_module_id, v_lesson_key
  from public.experience_lessons
  where id = p_lesson_id
    and experience_version_id = p_experience_version_id
  for update;

  if not found then
    raise exception 'Lesson is outside this Draft Version.';
  end if;

  perform 1
  from public.experience_modules
  where id = p_target_module_id
    and experience_version_id = p_experience_version_id
  for update;

  if not found then
    raise exception 'Destination Week is outside this Draft Version.';
  end if;

  if exists (
    select 1
    from public.experience_lessons
    where module_id = p_target_module_id
      and lesson_key = v_lesson_key
      and id <> p_lesson_id
  ) then
    raise exception
      'The destination Week already contains a Lesson with key "%".',
      v_lesson_key;
  end if;

  -- Serialize ordering changes in both affected Weeks.
  perform 1
  from public.experience_lessons
  where experience_version_id = p_experience_version_id
    and module_id in (v_source_module_id, p_target_module_id)
  order by module_id, sort_order, created_at, id
  for update;

  set constraints experience_sections_lesson_module_version_fk deferred;

  select count(*)
  into v_target_count
  from public.experience_lessons
  where module_id = p_target_module_id
    and id <> p_lesson_id;

  v_position := least(p_position, v_target_count);

  select coalesce(max(sort_order), -1) + v_target_count + 10
  into v_parking_base
  from public.experience_lessons
  where experience_version_id = p_experience_version_id;

  -- Move the parent and children together while the composite FK is deferred.
  update public.experience_lessons
  set module_id = p_target_module_id,
      sort_order = v_parking_base
  where id = p_lesson_id
    and experience_version_id = p_experience_version_id;

  update public.experience_sections
  set module_id = p_target_module_id
  where lesson_id = p_lesson_id
    and experience_version_id = p_experience_version_id;

  -- Park source siblings above their current range before normalizing.
  with ordered as (
    select
      id,
      row_number() over (order by sort_order, created_at, id) - 1 as new_order
    from public.experience_lessons
    where module_id = v_source_module_id
      and id <> p_lesson_id
  )
  update public.experience_lessons lesson
  set sort_order = v_parking_base + ordered.new_order + 1
  from ordered
  where lesson.id = ordered.id;

  with ordered as (
    select
      id,
      row_number() over (order by sort_order, created_at, id) - 1 as new_order
    from public.experience_lessons
    where module_id = v_source_module_id
      and id <> p_lesson_id
  )
  update public.experience_lessons lesson
  set sort_order = ordered.new_order
  from ordered
  where lesson.id = ordered.id;

  -- Park all destination Lessons, then assign the requested zero-based position.
  with ordered as (
    select
      id,
      row_number() over (order by sort_order, created_at, id) - 1 as old_order
    from public.experience_lessons
    where module_id = p_target_module_id
      and id <> p_lesson_id
  )
  update public.experience_lessons lesson
  set sort_order = v_parking_base + ordered.old_order + 1
  from ordered
  where lesson.id = ordered.id;

  with desired as (
    select
      id,
      case
        when old_order < v_position then old_order
        else old_order + 1
      end as new_order
    from (
      select
        id,
        row_number() over (order by sort_order, created_at, id) - 1 as old_order
      from public.experience_lessons
      where module_id = p_target_module_id
        and id <> p_lesson_id
    ) siblings

    union all

    select p_lesson_id, v_position
  )
  update public.experience_lessons lesson
  set sort_order = desired.new_order
  from desired
  where lesson.id = desired.id;

  set constraints experience_sections_lesson_module_version_fk immediate;
end;
$$;

revoke all
  on function public.move_draft_experience_lesson(uuid, uuid, uuid, uuid, integer)
  from public, anon, authenticated;

grant execute
  on function public.move_draft_experience_lesson(uuid, uuid, uuid, uuid, integer)
  to service_role;

comment on function public.move_draft_experience_lesson(
  uuid, uuid, uuid, uuid, integer
) is
  'Atomically moves an existing Lesson and its stable child Pages to another Week inside an editable Draft Version.';
