-- Separate where a Companion module is available from who may use it.
--
-- Existing audience values are retained as the first-pass role visibility
-- model. The backfill deliberately preserves existing runtime behavior:
-- personal modules were available without a Cohort, while group/leader
-- modules required delivery context. No existing row is silently broadened
-- into the new "both" behavior.

alter table public.companion_modules
  add column availability_context text;

do $validation$
begin
  if exists (
    select 1
    from public.companion_modules
    where audience not in ('personal', 'group', 'leaders')
  ) then
    raise check_violation using
      message = 'Companion availability backfill found an unsupported legacy audience value.';
  end if;
end;
$validation$;

update public.companion_modules
set availability_context = case
  when audience = 'personal' then 'individual'
  when audience in ('group', 'leaders') then 'cohort'
end;

do $validation$
begin
  if exists (
    select 1
    from public.companion_modules
    where availability_context is null
  ) then
    raise check_violation using
      message = 'Companion availability backfill could not classify every existing module.';
  end if;
end;
$validation$;

alter table public.companion_modules
  alter column availability_context set default 'individual',
  alter column availability_context set not null,
  add constraint companion_modules_availability_context_check
    check (availability_context in ('individual', 'cohort', 'both'));

comment on column public.companion_modules.availability_context is
  'Where the module is available: individual Course context, explicit Cohort context, or both. This is independent from role visibility in audience.';

comment on column public.companion_modules.audience is
  'First-pass role visibility, independent from availability_context. Legacy group means permitted Cohort participants, not module availability.';

-- The underlying legacy clone function inserts Companion rows without the new
-- column. Its approved wrapper already performs an exact one-to-one signature
-- match, so copy availability alongside the stable module key after cloning.
create or replace function public.clone_experience_version_with_companion_keys(
  p_experience_id uuid,
  p_source_version_id uuid,
  p_version_label text,
  p_actor_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_new_version_id uuid;
begin
  v_new_version_id := public.clone_experience_version(
    p_experience_id,
    p_source_version_id,
    p_version_label,
    p_actor_id
  );

  if exists (
    select 1
    from public.companion_modules source
    where source.experience_version_id = p_source_version_id
      and (
        select pg_catalog.count(*)
        from public.companion_modules target
        where target.experience_version_id = v_new_version_id
          and public.companion_module_clone_signature(target.id)
            = public.companion_module_clone_signature(source.id)
      ) <> 1
  ) or exists (
    select 1
    from public.companion_modules target
    where target.experience_version_id = v_new_version_id
      and (
        select pg_catalog.count(*)
        from public.companion_modules source
        where source.experience_version_id = p_source_version_id
          and public.companion_module_clone_signature(source.id)
            = public.companion_module_clone_signature(target.id)
      ) <> 1
  ) then
    raise exception 'Companion clone mapping is ambiguous';
  end if;

  update public.companion_modules target
  set module_key = source.module_key,
      availability_context = source.availability_context
  from public.companion_modules source
  where target.experience_version_id = v_new_version_id
    and source.experience_version_id = p_source_version_id
    and public.companion_module_clone_signature(target.id)
      = public.companion_module_clone_signature(source.id);

  if (select pg_catalog.count(*) from public.companion_modules
      where experience_version_id = v_new_version_id)
     <> (select pg_catalog.count(*) from public.companion_modules
         where experience_version_id = p_source_version_id)
    or exists (
    select 1
    from public.companion_modules target
    where target.experience_version_id = v_new_version_id
      and not exists (
        select 1
        from public.companion_modules source
        where source.experience_version_id = p_source_version_id
          and source.module_key = target.module_key
          and source.availability_context = target.availability_context
      )
  ) then
    raise exception 'Companion clone mapping failure';
  end if;

  return v_new_version_id;
end;
$function$;

revoke all on function public.clone_experience_version_with_companion_keys(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.clone_experience_version_with_companion_keys(uuid, uuid, text, uuid)
  to service_role;
