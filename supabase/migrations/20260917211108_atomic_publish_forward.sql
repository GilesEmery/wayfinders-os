-- Atomic publish-forward support for active follow-current enrollments.
-- This migration is append-only and depends on
-- 20260917210134_publish_forward_enrollment_policy.sql.

create table public.companion_draft_identity_decisions (
  draft_version_id uuid not null references public.experience_versions(id) on delete cascade,
  source_companion_module_id uuid not null references public.companion_modules(id) on delete restrict,
  decision text not null,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  constraint companion_draft_identity_decisions_pkey
    primary key (draft_version_id, source_companion_module_id),
  constraint companion_draft_identity_decisions_decision_check
    check (decision = 'removed')
);

alter table public.companion_draft_identity_decisions enable row level security;
revoke all on table public.companion_draft_identity_decisions from anon, authenticated;
grant all on table public.companion_draft_identity_decisions to service_role;

create or replace function public.companion_module_clone_signature(
  p_companion_module_id uuid
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'module_type', companion.module_type,
    'scope', companion.scope,
    'audience', companion.audience,
    'target_module_key', target_module.module_key,
    'target_lesson_key', target_lesson.lesson_key,
    'target_section_key', target_section.section_key,
    'display_title', companion.display_title,
    'sort_order', companion.sort_order,
    'visibility', companion.visibility,
    'configuration', companion.configuration
  )
  from public.companion_modules companion
  left join public.experience_modules target_module
    on target_module.id = companion.target_module_id
   and target_module.experience_version_id = companion.experience_version_id
  left join public.experience_lessons target_lesson
    on target_lesson.id = companion.target_lesson_id
   and target_lesson.experience_version_id = companion.experience_version_id
  left join public.experience_sections target_section
    on target_section.id = companion.target_section_id
   and target_section.experience_version_id = companion.experience_version_id
  where companion.id = p_companion_module_id;
$function$;

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
  set module_key = source.module_key
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

revoke all on function public.companion_module_clone_signature(uuid)
  from public, anon, authenticated;
grant execute on function public.companion_module_clone_signature(uuid)
  to service_role;

-- Existing edited Drafts are never reconciled automatically. An Admin-facing
-- reconciliation flow must identify the exact source and Draft rows, and this
-- function then verifies their lineage and stable curriculum targets.
create or replace function public.reconcile_draft_companion_module_key(
  p_draft_companion_module_id uuid,
  p_source_companion_module_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_draft public.companion_modules%rowtype;
  v_source public.companion_modules%rowtype;
  v_draft_version public.experience_versions%rowtype;
  v_draft_target jsonb;
  v_source_target jsonb;
begin
  select * into v_draft from public.companion_modules
  where id = p_draft_companion_module_id for update;
  if not found then raise exception 'Draft Companion module not found'; end if;

  select * into v_source from public.companion_modules
  where id = p_source_companion_module_id;
  if not found then raise exception 'Source Companion module not found'; end if;

  select * into v_draft_version from public.experience_versions
  where id = v_draft.experience_version_id;
  if not found or v_draft_version.status <> 'draft' then
    raise exception 'Companion reconciliation requires a Draft target Version';
  end if;
  if v_draft_version.based_on_version_id <> v_source.experience_version_id then
    raise exception 'Companion source is not the Draft based-on Version';
  end if;
  if v_draft.module_type <> v_source.module_type
    or v_draft.scope <> v_source.scope
    or v_draft.audience <> v_source.audience
  then
    raise exception 'Companion module type, scope, or audience does not match';
  end if;

  select pg_catalog.jsonb_build_object(
    'module_key', target_module.module_key,
    'lesson_key', target_lesson.lesson_key,
    'section_key', target_section.section_key
  ) into v_draft_target
  from (select 1) seed
  left join public.experience_modules target_module on target_module.id = v_draft.target_module_id
  left join public.experience_lessons target_lesson on target_lesson.id = v_draft.target_lesson_id
  left join public.experience_sections target_section on target_section.id = v_draft.target_section_id;

  select pg_catalog.jsonb_build_object(
    'module_key', target_module.module_key,
    'lesson_key', target_lesson.lesson_key,
    'section_key', target_section.section_key
  ) into v_source_target
  from (select 1) seed
  left join public.experience_modules target_module on target_module.id = v_source.target_module_id
  left join public.experience_lessons target_lesson on target_lesson.id = v_source.target_lesson_id
  left join public.experience_sections target_section on target_section.id = v_source.target_section_id;

  if v_draft_target is distinct from v_source_target then
    raise exception 'Companion stable curriculum target does not match';
  end if;

  update public.companion_modules
  set module_key = v_source.module_key
  where id = v_draft.id;

  delete from public.companion_draft_identity_decisions
  where draft_version_id = v_draft.experience_version_id
    and source_companion_module_id = v_source.id;
end;
$function$;

revoke all on function public.reconcile_draft_companion_module_key(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reconcile_draft_companion_module_key(uuid, uuid)
  to service_role;

create or replace function public.acknowledge_draft_companion_module_removal(
  p_draft_version_id uuid,
  p_source_companion_module_id uuid,
  p_actor_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_draft public.experience_versions%rowtype;
  v_source public.companion_modules%rowtype;
begin
  select * into v_draft from public.experience_versions
  where id = p_draft_version_id for update;
  if not found or v_draft.status <> 'draft' then
    raise exception 'Companion removal acknowledgement requires a Draft Version';
  end if;

  select * into v_source from public.companion_modules
  where id = p_source_companion_module_id;
  if not found or v_source.experience_version_id <> v_draft.based_on_version_id then
    raise exception 'Companion removal source is not from the Draft based-on Version';
  end if;

  if not exists (
    select 1 from public.admin_members
    where auth_user_id = p_actor_id
      and status = 'active'
      and role in ('admin', 'super_admin')
  ) then
    raise exception 'Valid Admin actor required for Companion removal acknowledgement';
  end if;

  if exists (
    select 1 from public.companion_modules target
    where target.experience_version_id = p_draft_version_id
      and target.module_key = v_source.module_key
  ) then
    raise exception 'Companion module is present in the Draft and is not removed';
  end if;

  insert into public.companion_draft_identity_decisions (
    draft_version_id, source_companion_module_id, decision, decided_by
  ) values (
    p_draft_version_id, p_source_companion_module_id, 'removed', p_actor_id
  )
  on conflict (draft_version_id, source_companion_module_id)
  do update set decided_by = excluded.decided_by, decided_at = pg_catalog.now();
end;
$function$;

revoke all on function public.acknowledge_draft_companion_module_removal(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.acknowledge_draft_companion_module_removal(uuid, uuid, uuid)
  to service_role;

create or replace function public.initialize_experience_enrollment_version_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.experience_version_id is not null then
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
      new.experience_version_id,
      case when new.status = 'completed' then 'completion' else 'initial' end,
      case when new.status = 'completed' then
        pg_catalog.jsonb_build_object(
          'completion', pg_catalog.jsonb_build_object(
            'experience_version_id', new.experience_version_id,
            'completed_at', coalesce(new.completed_at, pg_catalog.now()),
            'version_policy', 'locked'
          )
        )
      else '{}'::jsonb end,
      coalesce(new.enrolled_at, new.created_at, pg_catalog.now())
    );
  end if;
  return new;
end;
$function$;

create trigger experience_enrollments_initialize_version_history
after insert on public.experience_enrollments
for each row
execute function public.initialize_experience_enrollment_version_history();

create or replace function public.lock_completed_experience_enrollment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.status = 'completed' then
    new.version_policy := 'locked';
    new.completed_experience_version_id := coalesce(
      new.completed_experience_version_id,
      new.experience_version_id
    );
  end if;
  return new;
end;
$function$;

create trigger experience_enrollments_lock_completed
before insert or update of status on public.experience_enrollments
for each row
execute function public.lock_completed_experience_enrollment();

create or replace function public.record_completed_experience_enrollment_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
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

create trigger experience_enrollments_record_completion_history
after update of status on public.experience_enrollments
for each row
execute function public.record_completed_experience_enrollment_history();

create or replace function public.publish_forward_experience_enrollment(
  p_enrollment_id uuid,
  p_new_version_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_enrollment public.experience_enrollments%rowtype;
  v_new_version public.experience_versions%rowtype;
  v_snapshot jsonb;
begin
  select * into v_enrollment
  from public.experience_enrollments
  where id = p_enrollment_id
  for update;

  if not found then raise exception 'Publish-forward enrollment not found'; end if;
  if v_enrollment.version_policy <> 'follow_current'
    or v_enrollment.status not in ('invited', 'enrolled', 'in_progress')
    or v_enrollment.experience_version_id = p_new_version_id
  then
    return;
  end if;
  if v_enrollment.experience_version_id is null then
    raise exception 'Publish-forward requires a Version-pinned source enrollment: %', p_enrollment_id;
  end if;

  select * into v_new_version
  from public.experience_versions
  where id = p_new_version_id
    and experience_id = v_enrollment.experience_id
    and status = 'published';
  if not found then raise exception 'Publish-forward target is not the current Published Version'; end if;

  if exists (
    select 1
    from public.experience_offerings offering
    where offering.id = v_enrollment.offering_id
      and offering.experience_version_id is not null
      and offering.experience_version_id <> p_new_version_id
  ) or exists (
    select 1
    from public.cohorts cohort
    where cohort.id = v_enrollment.cohort_id
      and cohort.experience_version_id is not null
      and cohort.experience_version_id <> p_new_version_id
  ) then
    raise exception 'Enrollment % is follow_current but belongs to a Version-locked delivery', p_enrollment_id;
  end if;

  if exists (
    select 1
    from public.participant_companion_entries entry
    join public.companion_modules source
      on source.id = entry.companion_module_id
     and source.experience_version_id = v_enrollment.experience_version_id
    where entry.enrollment_id = p_enrollment_id
      and not exists (
        select 1
        from public.companion_modules target
        where target.experience_version_id = p_new_version_id
          and target.module_key = source.module_key
      )
      and not exists (
        select 1
        from public.companion_draft_identity_decisions decision
        where decision.draft_version_id = p_new_version_id
          and decision.source_companion_module_id = source.id
          and decision.decision = 'removed'
      )
  ) then
    raise exception 'Draft Companion modules require stable-key reconciliation before publishing.';
  end if;

  create temporary table if not exists publish_forward_experience_progress
    (like public.experience_progress including defaults) on commit drop;
  create temporary table if not exists publish_forward_lesson_progress
    (like public.lesson_progress including defaults) on commit drop;
  create temporary table if not exists publish_forward_section_progress
    (like public.section_progress including defaults) on commit drop;
  create temporary table if not exists publish_forward_responses
    (like public.participant_responses including defaults) on commit drop;
  create temporary table if not exists publish_forward_companion_entries
    (like public.participant_companion_entries including defaults) on commit drop;

  truncate pg_temp.publish_forward_experience_progress,
    pg_temp.publish_forward_lesson_progress,
    pg_temp.publish_forward_section_progress,
    pg_temp.publish_forward_responses,
    pg_temp.publish_forward_companion_entries;

  insert into pg_temp.publish_forward_experience_progress
    select * from public.experience_progress where enrollment_id = p_enrollment_id;
  insert into pg_temp.publish_forward_lesson_progress
    select * from public.lesson_progress where enrollment_id = p_enrollment_id;
  insert into pg_temp.publish_forward_section_progress
    select * from public.section_progress where enrollment_id = p_enrollment_id;
  insert into pg_temp.publish_forward_responses
    select * from public.participant_responses where enrollment_id = p_enrollment_id;
  insert into pg_temp.publish_forward_companion_entries
    select * from public.participant_companion_entries where enrollment_id = p_enrollment_id;

  select pg_catalog.jsonb_build_object(
    'source_version_id', v_enrollment.experience_version_id,
    'target_version_id', p_new_version_id,
    'removed_lessons', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'lesson_id', progress.lesson_id,
        'status', progress.status,
        'resume_state', progress.resume_state
      ))
      from pg_temp.publish_forward_lesson_progress progress
      join public.experience_lessons old_lesson on old_lesson.id = progress.lesson_id
      join public.experience_modules old_module on old_module.id = old_lesson.module_id
      where not exists (
        select 1
        from public.experience_modules new_module
        join public.experience_lessons new_lesson on new_lesson.module_id = new_module.id
        where new_module.experience_version_id = p_new_version_id
          and new_module.module_key = old_module.module_key
          and new_lesson.lesson_key = old_lesson.lesson_key
      )
    ), '[]'::jsonb),
    'removed_sections', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'section_id', progress.section_id,
        'status', progress.status,
        'resume_state', progress.resume_state,
        'completed_at', progress.completed_at
      ))
      from pg_temp.publish_forward_section_progress progress
      join public.experience_sections old_section on old_section.id = progress.section_id
      join public.experience_lessons old_lesson on old_lesson.id = old_section.lesson_id
      join public.experience_modules old_module on old_module.id = old_lesson.module_id
      where not exists (
        select 1
        from public.experience_modules new_module
        join public.experience_lessons new_lesson on new_lesson.module_id = new_module.id
        join public.experience_sections new_section on new_section.lesson_id = new_lesson.id
        where new_module.experience_version_id = p_new_version_id
          and new_module.module_key = old_module.module_key
          and new_lesson.lesson_key = old_lesson.lesson_key
          and new_section.section_key = old_section.section_key
      )
    ), '[]'::jsonb),
    'removed_responses', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'response_definition_id', response.response_definition_id,
        'response_key', old_definition.response_key,
        'status', response.status,
        'response_data', response.response_data,
        'finalized_at', response.finalized_at
      ))
      from pg_temp.publish_forward_responses response
      join public.response_definitions old_definition on old_definition.id = response.response_definition_id
      join public.experience_lessons old_lesson on old_lesson.id = old_definition.lesson_id
      join public.experience_modules old_module on old_module.id = old_lesson.module_id
      where not exists (
        select 1
        from public.experience_modules new_module
        join public.experience_lessons new_lesson on new_lesson.module_id = new_module.id
        join public.response_definitions new_definition on new_definition.lesson_id = new_lesson.id
        where new_module.experience_version_id = p_new_version_id
          and new_module.module_key = old_module.module_key
          and new_lesson.lesson_key = old_lesson.lesson_key
          and new_definition.response_key = old_definition.response_key
      )
    ), '[]'::jsonb),
    'removed_companion_entries', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'companion_module_id', entry.companion_module_id,
        'module_key', old_companion.module_key,
        'entry_data', entry.entry_data,
        'updated_at', entry.updated_at
      ))
      from pg_temp.publish_forward_companion_entries entry
      join public.companion_modules old_companion on old_companion.id = entry.companion_module_id
      where not exists (
        select 1
        from public.companion_modules new_companion
        where new_companion.experience_version_id = p_new_version_id
          and new_companion.module_key = old_companion.module_key
      )
    ), '[]'::jsonb)
  ) into v_snapshot;

  delete from public.participant_companion_entries where enrollment_id = p_enrollment_id;
  delete from public.participant_responses where enrollment_id = p_enrollment_id;
  delete from public.section_progress where enrollment_id = p_enrollment_id;
  delete from public.lesson_progress where enrollment_id = p_enrollment_id;
  delete from public.experience_progress where enrollment_id = p_enrollment_id;

  update public.experience_enrollments
  set experience_version_id = p_new_version_id,
      updated_at = pg_catalog.now()
  where id = p_enrollment_id;

  insert into public.lesson_progress (
    enrollment_id, participant_id, experience_version_id, lesson_id,
    status, resume_state, started_at, completed_at, created_at, updated_at
  )
  select progress.enrollment_id, progress.participant_id, p_new_version_id,
    new_lesson.id, progress.status, progress.resume_state,
    progress.started_at, progress.completed_at, progress.created_at, pg_catalog.now()
  from pg_temp.publish_forward_lesson_progress progress
  join public.experience_lessons old_lesson on old_lesson.id = progress.lesson_id
  join public.experience_modules old_module on old_module.id = old_lesson.module_id
  join public.experience_modules new_module
    on new_module.experience_version_id = p_new_version_id
   and new_module.module_key = old_module.module_key
  join public.experience_lessons new_lesson
    on new_lesson.module_id = new_module.id
   and new_lesson.lesson_key = old_lesson.lesson_key;

  insert into public.section_progress (
    enrollment_id, participant_id, experience_version_id, section_id,
    status, resume_state, started_at, completed_at, created_at, updated_at
  )
  select progress.enrollment_id, progress.participant_id, p_new_version_id,
    new_section.id, progress.status, progress.resume_state,
    progress.started_at, progress.completed_at, progress.created_at, pg_catalog.now()
  from pg_temp.publish_forward_section_progress progress
  join public.experience_sections old_section on old_section.id = progress.section_id
  join public.experience_lessons old_lesson on old_lesson.id = old_section.lesson_id
  join public.experience_modules old_module on old_module.id = old_lesson.module_id
  join public.experience_modules new_module
    on new_module.experience_version_id = p_new_version_id
   and new_module.module_key = old_module.module_key
  join public.experience_lessons new_lesson
    on new_lesson.module_id = new_module.id
   and new_lesson.lesson_key = old_lesson.lesson_key
  join public.experience_sections new_section
    on new_section.lesson_id = new_lesson.id
   and new_section.section_key = old_section.section_key;

  insert into public.participant_responses (
    participant_id, enrollment_id, experience_version_id,
    response_definition_id, response_data, status, finalized_at,
    created_at, updated_at
  )
  select response.participant_id, response.enrollment_id, p_new_version_id,
    new_definition.id, response.response_data, response.status,
    response.finalized_at, response.created_at, pg_catalog.now()
  from pg_temp.publish_forward_responses response
  join public.response_definitions old_definition on old_definition.id = response.response_definition_id
  join public.experience_lessons old_lesson on old_lesson.id = old_definition.lesson_id
  join public.experience_modules old_module on old_module.id = old_lesson.module_id
  join public.experience_modules new_module
    on new_module.experience_version_id = p_new_version_id
   and new_module.module_key = old_module.module_key
  join public.experience_lessons new_lesson
    on new_lesson.module_id = new_module.id
   and new_lesson.lesson_key = old_lesson.lesson_key
  join public.response_definitions new_definition
    on new_definition.lesson_id = new_lesson.id
   and new_definition.response_key = old_definition.response_key;

  insert into public.participant_companion_entries (
    companion_module_id, participant_id, enrollment_id,
    experience_version_id, entry_data, created_at, updated_at
  )
  select new_companion.id, entry.participant_id, entry.enrollment_id,
    p_new_version_id, entry.entry_data, entry.created_at, pg_catalog.now()
  from pg_temp.publish_forward_companion_entries entry
  join public.companion_modules old_companion on old_companion.id = entry.companion_module_id
  join public.companion_modules new_companion
    on new_companion.experience_version_id = p_new_version_id
   and new_companion.module_key = old_companion.module_key;

  insert into public.experience_progress (
    enrollment_id, participant_id, experience_id, experience_version_id,
    status, current_module_id, current_lesson_id, current_section_id,
    started_at, completed_at, created_at, updated_at
  )
  select progress.enrollment_id, progress.participant_id, progress.experience_id,
    p_new_version_id, progress.status,
    new_module.id, new_lesson.id, new_section.id,
    progress.started_at, progress.completed_at, progress.created_at, pg_catalog.now()
  from pg_temp.publish_forward_experience_progress progress
  left join public.experience_modules old_module on old_module.id = progress.current_module_id
  left join public.experience_lessons old_lesson on old_lesson.id = progress.current_lesson_id
  left join public.experience_sections old_section on old_section.id = progress.current_section_id
  left join public.experience_modules new_module
    on new_module.experience_version_id = p_new_version_id
   and new_module.module_key = old_module.module_key
  left join public.experience_lessons new_lesson
    on new_lesson.module_id = new_module.id
   and new_lesson.lesson_key = old_lesson.lesson_key
  left join public.experience_sections new_section
    on new_section.lesson_id = new_lesson.id
   and new_section.section_key = old_section.section_key;

  update public.experience_enrollment_version_history
  set ended_at = pg_catalog.now(),
      artifact_snapshot = v_snapshot
  where enrollment_id = p_enrollment_id
    and ended_at is null;

  insert into public.experience_enrollment_version_history (
    enrollment_id, participant_id, experience_id, experience_version_id,
    transition_reason, started_at
  ) values (
    p_enrollment_id, v_enrollment.participant_id, v_enrollment.experience_id,
    p_new_version_id, 'publish_forward', pg_catalog.now()
  );
end;
$function$;

revoke all on function public.publish_forward_experience_enrollment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_forward_experience_enrollment(uuid, uuid)
  to service_role;

create or replace function public.publish_forward_current_experience_enrollments()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  enrollment record;
begin
  if new.current_published_version_id is null
    or new.current_published_version_id is not distinct from old.current_published_version_id
  then
    return new;
  end if;

  for enrollment in
    select id
    from public.experience_enrollments
    where experience_id = new.id
      and version_policy = 'follow_current'
      and status in ('invited', 'enrolled', 'in_progress')
      and experience_version_id is distinct from new.current_published_version_id
    order by id
    for update
  loop
    perform public.publish_forward_experience_enrollment(
      enrollment.id,
      new.current_published_version_id
    );
  end loop;

  return new;
end;
$function$;

create trigger experiences_publish_forward_enrollments
after update of current_published_version_id on public.experiences
for each row
execute function public.publish_forward_current_experience_enrollments();

revoke all on function public.initialize_experience_enrollment_version_history()
  from public, anon, authenticated;
revoke all on function public.lock_completed_experience_enrollment()
  from public, anon, authenticated;
revoke all on function public.record_completed_experience_enrollment_history()
  from public, anon, authenticated;
revoke all on function public.publish_forward_current_experience_enrollments()
  from public, anon, authenticated;
