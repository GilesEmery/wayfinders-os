-- Keep Offering-scoped Companion overrides inside the Companion module's
-- Experience. A pinned Offering must also pin the module's exact Version;
-- a null Offering Version remains valid and continues to resolve dynamically.

create function public.enforce_companion_offering_isolation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if tg_table_name = 'companion_delivery_overrides' then
    if new.offering_id is null then
      return new;
    end if;

    if not exists (
      select 1
      from public.experience_offerings offering
      join public.experience_versions version
        on version.id = new.experience_version_id
      where offering.id = new.offering_id
        and offering.experience_id = version.experience_id
        and (
          offering.experience_version_id is null
          or offering.experience_version_id = new.experience_version_id
        )
    ) then
      raise foreign_key_violation using
        message = 'Companion Offering override must use the module Experience and, when pinned, the module Version.';
    end if;

    return new;
  end if;

  if tg_table_name = 'experience_offerings' then
    if exists (
      select 1
      from public.companion_delivery_overrides override_row
      join public.experience_versions version
        on version.id = override_row.experience_version_id
      where override_row.offering_id = new.id
        and (
          new.experience_id <> version.experience_id
          or (
            new.experience_version_id is not null
            and new.experience_version_id <> override_row.experience_version_id
          )
        )
    ) then
      raise foreign_key_violation using
        message = 'Offering update would invalidate an existing Companion delivery override.';
    end if;

    return new;
  end if;

  raise exception 'Unsupported Companion Offering isolation trigger source: %', tg_table_name;
end;
$function$;

revoke all on function public.enforce_companion_offering_isolation()
  from public, anon, authenticated;

-- Fail safely if manually-created rows already violate the intended rule.
do $validation$
begin
  if exists (
    select 1
    from public.companion_delivery_overrides override_row
    join public.experience_offerings offering
      on offering.id = override_row.offering_id
    join public.experience_versions version
      on version.id = override_row.experience_version_id
    where override_row.offering_id is not null
      and (
        offering.experience_id <> version.experience_id
        or (
          offering.experience_version_id is not null
          and offering.experience_version_id <> override_row.experience_version_id
        )
      )
  ) then
    raise foreign_key_violation using
      message = 'Existing Companion Offering overrides violate Experience or Version isolation.';
  end if;
end;
$validation$;

create constraint trigger companion_delivery_overrides_offering_isolation_check
after insert or update on public.companion_delivery_overrides
deferrable initially immediate
for each row
execute function public.enforce_companion_offering_isolation();

create constraint trigger experience_offerings_companion_isolation_check
after update on public.experience_offerings
deferrable initially immediate
for each row
execute function public.enforce_companion_offering_isolation();
