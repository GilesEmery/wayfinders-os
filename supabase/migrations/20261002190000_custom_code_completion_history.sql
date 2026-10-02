-- REVIEW ONLY: do not apply automatically. No participant backfill.
create or replace function public.record_completed_experience_enrollment_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  -- Custom-code Experiences have no builder version. Their provider attempt is
  -- the immutable result; the canonical enrollment still records completion.
  if new.completed_experience_version_id is null and exists (
    select 1 from public.experiences e
    where e.id = new.experience_id and e.delivery_mode = 'custom_code'
  ) then
    return new;
  end if;
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.experience_enrollment_version_history
    set transition_reason = 'completion',
        artifact_snapshot = artifact_snapshot || pg_catalog.jsonb_build_object(
          'completion', pg_catalog.jsonb_build_object(
            'experience_version_id', new.completed_experience_version_id,
            'completed_at', coalesce(new.completed_at, pg_catalog.now()),
            'version_policy', 'locked'
          )
        )
    where enrollment_id = new.id
      and experience_version_id = new.completed_experience_version_id
      and ended_at is null;

    if not found then
      insert into public.experience_enrollment_version_history (
        enrollment_id,
        participant_id,
        experience_id,
        experience_version_id,
        transition_reason,
        artifact_snapshot,
        started_at
      ) values (
        new.id,
        new.participant_id,
        new.experience_id,
        new.completed_experience_version_id,
        'completion',
        pg_catalog.jsonb_build_object(
          'completion', pg_catalog.jsonb_build_object(
            'experience_version_id', new.completed_experience_version_id,
            'completed_at', coalesce(new.completed_at, pg_catalog.now()),
            'version_policy', 'locked'
          )
        ),
        coalesce(new.started_at, new.enrolled_at, new.created_at, pg_catalog.now())
      );
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.record_completed_experience_enrollment_history() from public, anon, authenticated;
