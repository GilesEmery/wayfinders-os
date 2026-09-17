-- PurposeOS live Group Companion persistence.
--
-- Delivery configuration remains in companion_delivery_overrides.configuration.
-- Mutable call lifecycle and participant-authored Chat messages use dedicated
-- records so they are delivery-isolated, timestamped, and concurrency-safe.

create table public.companion_call_sessions (
  id uuid primary key default gen_random_uuid(),
  delivery_override_id uuid not null,
  companion_module_id uuid not null,
  experience_version_id uuid not null,
  status text not null default 'live',
  started_by_participant_id uuid null references public.participants(id) on delete restrict,
  started_by_enrollment_id uuid null,
  started_by_auth_user_id uuid null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_call_sessions_override_fk
    foreign key (delivery_override_id, companion_module_id)
    references public.companion_delivery_overrides(id, companion_module_id) on delete cascade,
  constraint companion_call_sessions_module_fk
    foreign key (companion_module_id, experience_version_id)
    references public.companion_modules(id, experience_version_id) on delete cascade,
  constraint companion_call_sessions_starter_enrollment_fk
    foreign key (started_by_enrollment_id, started_by_participant_id, experience_version_id)
    references public.experience_enrollments(id, participant_id, experience_version_id) on delete restrict,
  constraint companion_call_sessions_status_check
    check (status in ('live', 'ended')),
  constraint companion_call_sessions_starter_shape_check check (
    (started_by_participant_id is null) = (started_by_enrollment_id is null)
    and num_nonnulls(started_by_participant_id, started_by_auth_user_id) >= 1
  ),
  constraint companion_call_sessions_time_check check (
    (status = 'live' and ended_at is null)
    or (status = 'ended' and ended_at is not null and ended_at >= started_at)
  )
);

comment on table public.companion_call_sessions is
  'Delivery-scoped lifecycle records for provider-hosted Group Companion calls. PurposeOS stores availability only and never conferencing media.';

create unique index companion_call_sessions_one_live_uidx
  on public.companion_call_sessions (delivery_override_id)
  where status = 'live';
create index companion_call_sessions_recent_idx
  on public.companion_call_sessions (delivery_override_id, started_at desc);

create table public.companion_chat_messages (
  id uuid primary key default gen_random_uuid(),
  delivery_override_id uuid not null,
  companion_module_id uuid not null,
  experience_version_id uuid not null,
  author_participant_id uuid not null references public.participants(id) on delete restrict,
  author_enrollment_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint companion_chat_messages_override_fk
    foreign key (delivery_override_id, companion_module_id)
    references public.companion_delivery_overrides(id, companion_module_id) on delete cascade,
  constraint companion_chat_messages_module_fk
    foreign key (companion_module_id, experience_version_id)
    references public.companion_modules(id, experience_version_id) on delete cascade,
  constraint companion_chat_messages_author_enrollment_fk
    foreign key (author_enrollment_id, author_participant_id, experience_version_id)
    references public.experience_enrollments(id, participant_id, experience_version_id) on delete restrict,
  constraint companion_chat_messages_body_check
    check (char_length(btrim(body)) between 1 and 4000)
);

comment on table public.companion_chat_messages is
  'Plain-text Group Companion messages isolated to one delivery override and authored through an enrollment in that delivery context.';

create index companion_chat_messages_delivery_chronology_idx
  on public.companion_chat_messages (delivery_override_id, created_at, id);
create index companion_chat_messages_author_idx
  on public.companion_chat_messages (author_participant_id, created_at desc);

create function public.enforce_companion_live_group_context()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_expected_module_type text;
  v_module_type text;
  v_audience text;
  v_offering_id uuid;
  v_plan_id uuid;
  v_plan_cohort_id uuid;
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

  select module.module_type, module.audience,
    override_row.offering_id, override_row.cohort_course_plan_id,
    plan.cohort_id
  into v_module_type, v_audience, v_offering_id, v_plan_id, v_plan_cohort_id
  from public.companion_delivery_overrides override_row
  join public.companion_modules module
    on module.id = override_row.companion_module_id
   and module.experience_version_id = override_row.experience_version_id
  left join public.cohort_course_plans plan
    on plan.id = override_row.cohort_course_plan_id
   and plan.experience_version_id = override_row.experience_version_id
  where override_row.id = new.delivery_override_id
    and override_row.companion_module_id = new.companion_module_id
    and override_row.experience_version_id = new.experience_version_id;

  if not found or v_module_type <> v_expected_module_type or v_audience <> 'group' then
    raise foreign_key_violation using
      message = 'Live Group Companion data requires a matching Group-audience delivery override and module type.';
  end if;

  if v_enrollment_id is not null and not exists (
    select 1
    from public.experience_enrollments enrollment
    where enrollment.id = v_enrollment_id
      and enrollment.participant_id = v_participant_id
      and enrollment.experience_version_id = new.experience_version_id
      and (
        (v_offering_id is not null and enrollment.offering_id = v_offering_id)
        or (v_plan_id is not null and enrollment.cohort_id = v_plan_cohort_id)
      )
  ) then
    raise foreign_key_violation using
      message = 'Live Group Companion participant must belong to the delivery override context.';
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_companion_live_group_context()
  from public, anon, authenticated;

create constraint trigger companion_call_sessions_context_check
after insert or update on public.companion_call_sessions
deferrable initially immediate
for each row
execute function public.enforce_companion_live_group_context();

create constraint trigger companion_chat_messages_context_check
after insert or update on public.companion_chat_messages
deferrable initially immediate
for each row
execute function public.enforce_companion_live_group_context();

create trigger companion_call_sessions_set_updated_at
before update on public.companion_call_sessions
for each row execute function public.purpose_os_set_updated_at();

alter table public.companion_call_sessions enable row level security;
alter table public.companion_chat_messages enable row level security;

-- Keep the first release behind the existing server-side authorization layer.
-- Realtime publication is intentionally deferred until direct authenticated
-- access has dedicated, tested participant and future-leader RLS policies.
revoke all on table public.companion_call_sessions, public.companion_chat_messages
  from anon, authenticated;
grant all on table public.companion_call_sessions, public.companion_chat_messages
  to service_role;
