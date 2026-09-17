-- Schema gate for safe Course publish-forward behavior.
--
-- This migration records whether an enrollment follows the Course's current
-- Published Version or is intentionally locked to one release. It also keeps
-- immutable Version provenance and gives Companion modules a stable identity
-- that future clone/publish-forward logic can preserve across Version UUIDs.
--
-- This migration deliberately does not move enrollments or participant data.

alter table public.experience_enrollments
  add column version_policy text not null default 'follow_current',
  add column completed_experience_version_id uuid null;

alter table public.experience_enrollments
  add constraint experience_enrollments_version_policy_check
    check (version_policy in ('follow_current', 'locked')),
  add constraint experience_enrollments_completed_version_experience_fk
    foreign key (completed_experience_version_id, experience_id)
    references public.experience_versions(id, experience_id)
    on delete restrict;

-- A completed enrollment is historical. Existing delivery-pinned enrollments
-- are also conservatively treated as intentional locks. Ordinary active
-- enrollments follow the current Published Version.
update public.experience_enrollments enrollment
set version_policy = case
  when enrollment.status = 'completed' then 'locked'
  when exists (
    select 1
    from public.experience_offerings offering
    where offering.id = enrollment.offering_id
      and offering.experience_version_id is not null
  ) then 'locked'
  when exists (
    select 1
    from public.cohorts cohort
    where cohort.id = enrollment.cohort_id
      and cohort.experience_version_id is not null
  ) then 'locked'
  else 'follow_current'
end;

update public.experience_enrollments
set completed_experience_version_id = experience_version_id
where status = 'completed'
  and completed_experience_version_id is null;

create index experience_enrollments_version_policy_idx
  on public.experience_enrollments (experience_id, version_policy, status);

create table public.experience_enrollment_version_history (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.experience_enrollments(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete restrict,
  experience_id uuid not null references public.experiences(id) on delete restrict,
  experience_version_id uuid not null,
  transition_reason text not null,
  artifact_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint experience_enrollment_version_history_enrollment_owner_fk
    foreign key (enrollment_id, participant_id, experience_id)
    references public.experience_enrollments(id, participant_id, experience_id)
    on delete cascade,
  constraint experience_enrollment_version_history_version_experience_fk
    foreign key (experience_version_id, experience_id)
    references public.experience_versions(id, experience_id)
    on delete restrict,
  constraint experience_enrollment_version_history_reason_check
    check (transition_reason in ('initial', 'publish_forward', 'delivery_lock', 'admin_lock', 'completion')),
  constraint experience_enrollment_version_history_snapshot_object_check
    check (jsonb_typeof(artifact_snapshot) = 'object'),
  constraint experience_enrollment_version_history_time_check
    check (ended_at is null or ended_at >= started_at)
);

create unique index experience_enrollment_version_history_current_uidx
  on public.experience_enrollment_version_history (enrollment_id)
  where ended_at is null;

create index experience_enrollment_version_history_version_idx
  on public.experience_enrollment_version_history (experience_version_id, enrollment_id);

insert into public.experience_enrollment_version_history (
  enrollment_id,
  participant_id,
  experience_id,
  experience_version_id,
  transition_reason,
  started_at
)
select
  enrollment.id,
  enrollment.participant_id,
  enrollment.experience_id,
  enrollment.experience_version_id,
  case when enrollment.status = 'completed' then 'completion' else 'initial' end,
  coalesce(enrollment.enrolled_at, enrollment.created_at)
from public.experience_enrollments enrollment
where enrollment.experience_version_id is not null;

alter table public.experience_enrollment_version_history enable row level security;

revoke all on table public.experience_enrollment_version_history
  from anon, authenticated;
grant all on table public.experience_enrollment_version_history
  to service_role;

alter table public.companion_modules
  add column module_key uuid not null default gen_random_uuid();

alter table public.companion_modules
  add constraint companion_modules_version_module_key_key
    unique (experience_version_id, module_key);

comment on column public.experience_enrollments.version_policy is
  'follow_current advances through Published Versions; locked remains on the explicitly selected Version.';

comment on column public.experience_enrollments.completed_experience_version_id is
  'Historical release provenance retained when an enrollment completes.';

comment on table public.experience_enrollment_version_history is
  'Immutable enrollment release provenance and transition snapshot. Publish-forward closes the current row and opens the next row atomically.';

comment on column public.companion_modules.module_key is
  'Stable Companion identity that clone operations must preserve across Course Versions.';
