-- One durable learner journey per participant and Course. Cohort participation
-- remains in cohort_memberships and is intentionally not represented by a
-- second enrollment. Legacy cohort_id/offering_id columns remain for backward
-- compatibility, but new application code does not use them as context.

do $validation$
begin
  if exists (
    select 1
    from public.experience_enrollments
    group by participant_id, experience_id
    having count(*) > 1
  ) then
    raise unique_violation using
      message = 'Canonical enrollment migration requires manual reconciliation of duplicate participant/Course enrollments.';
  end if;
end;
$validation$;

alter table public.experience_enrollments
  add constraint experience_enrollments_participant_experience_key
  unique (participant_id, experience_id);

comment on constraint experience_enrollments_participant_experience_key
  on public.experience_enrollments is
  'One canonical durable Course journey per participant. Retakes reset active progress on this enrollment rather than creating another enrollment.';

comment on column public.experience_enrollments.cohort_id is
  'Legacy compatibility pointer only. Active Cohort context is resolved from cohort_memberships plus an explicit runtime Cohort selection.';

comment on column public.experience_enrollments.offering_id is
  'Legacy compatibility pointer only. Active delivery context is resolved from the explicitly selected Cohort and its Offering/Cohort Course Plan.';

-- Replace the original live Group integrity function. Participant-authored
-- rows now prove both canonical Course enrollment and active membership in the
-- delivery Cohort; they no longer require the enrollment to carry that one
-- Cohort/Offering as mutable pointers.
create or replace function public.enforce_companion_live_group_context()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_expected_module_type text;
  v_module_type text;
  v_audience text;
  v_experience_id uuid;
  v_delivery_cohort_id uuid;
  v_enrollment_id uuid;
  v_participant_id uuid;
begin
  if tg_table_name = 'companion_call_sessions' then
    v_expected_module_type := 'video_call';
    v_enrollment_id := new.started_by_enrollment_id;
    v_participant_id := new.started_by_participant_id;
  elsif tg_table_name = 'companion_chat_messages' then
    v_expected_module_type := 'chat';
    v_enrollment_id := new.author_enrollment_id;
    v_participant_id := new.author_participant_id;
  else
    raise exception 'Unsupported live Group Companion trigger source: %', tg_table_name;
  end if;

  select module.module_type,
    module.audience,
    version.experience_id,
    coalesce(offering.cohort_id, plan.cohort_id)
  into v_module_type, v_audience, v_experience_id, v_delivery_cohort_id
  from public.companion_delivery_overrides override_row
  join public.companion_modules module
    on module.id = override_row.companion_module_id
   and module.experience_version_id = override_row.experience_version_id
  join public.experience_versions version
    on version.id = override_row.experience_version_id
  left join public.experience_offerings offering
    on offering.id = override_row.offering_id
   and offering.experience_id = version.experience_id
  left join public.cohort_course_plans plan
    on plan.id = override_row.cohort_course_plan_id
   and plan.experience_id = version.experience_id
   and plan.experience_version_id = override_row.experience_version_id
  where override_row.id = new.delivery_override_id
    and override_row.companion_module_id = new.companion_module_id
    and override_row.experience_version_id = new.experience_version_id;

  if not found
    or v_module_type <> v_expected_module_type
    or v_audience <> 'group'
    or v_delivery_cohort_id is null
  then
    raise foreign_key_violation using
      message = 'Live Group Companion data requires a matching Cohort delivery override and Group-audience module type.';
  end if;

  if v_enrollment_id is not null and not exists (
    select 1
    from public.experience_enrollments enrollment
    join public.cohort_memberships membership
      on membership.participant_id = enrollment.participant_id
     and membership.cohort_id = v_delivery_cohort_id
     and membership.status = 'active'
    where enrollment.id = v_enrollment_id
      and enrollment.participant_id = v_participant_id
      and enrollment.experience_id = v_experience_id
      and enrollment.experience_version_id = new.experience_version_id
      and enrollment.status in ('enrolled', 'in_progress', 'completed')
  ) then
    raise foreign_key_violation using
      message = 'Live Group Companion participant requires the canonical Course enrollment and an active membership in the delivery Cohort.';
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_companion_live_group_context()
  from public, anon, authenticated;
