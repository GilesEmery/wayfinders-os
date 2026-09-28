-- GPT / agent rules for this migration:
-- 1. A prebuilt Assessment is a first-class Experience and keeps ownership of
--    its interface, responses, scoring, results, and completion definition.
-- 2. A Course Block references an Assessment; it never copies Assessment
--    questions or result data into the parent Course Version.
-- 3. Automatic Assessment enrollment is allowed only from an active parent
--    enrollment owned by the same participant and a published parent Block.
-- 4. Required/optional progression remains owned by the parent content Block.
--    An attempt marked completed is the only Assessment completion signal.
-- 5. Embedded launch and completion writes are service-role-only. Never grant
--    these functions or tables to browser client roles.

alter table public.content_blocks
  drop constraint if exists content_blocks_block_type_check;

alter table public.content_blocks
  add constraint content_blocks_block_type_check
  check (block_type in (
    'heading', 'rich_text', 'video', 'image', 'scripture', 'quote', 'callout',
    'reflection', 'journal', 'discussion_prompt', 'practice', 'assignment',
    'quiz', 'check_in', 'worksheet', 'checklist', 'resource', 'button', 'embed',
    'action_step', 'ranking', 'card_selection', 'structured_response',
    'custom_component', 'system_component', 'pdf_reader', 'document',
    'download', 'external_link', 'prebuilt_assessment'
  ));

alter table public.experience_enrollments
  drop constraint if exists experience_enrollments_source_type_check;

alter table public.experience_enrollments
  add constraint experience_enrollments_source_type_check
  check (source_type in (
    'legacy', 'admin', 'self', 'invitation', 'approval', 'offering', 'cohort',
    'hub', 'entitlement', 'purchase', 'scholarship', 'comp', 'organization',
    'embedded_assessment'
  ));

create table public.prebuilt_assessments (
  experience_id uuid primary key references public.experiences(id) on delete restrict,
  launch_path text not null check (launch_path like '/%' and launch_path !~ '[[:space:]]'),
  completion_provider text not null default 'experience_enrollment'
    check (completion_provider in ('experience_enrollment', 'lmu_assessment')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.prebuilt_assessments is
  'Allowlist of reusable, native PurposeOS Assessment Experiences that may be selected by a Course prebuilt_assessment Block.';

create table public.embedded_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  parent_enrollment_id uuid not null references public.experience_enrollments(id) on delete restrict,
  parent_content_block_id uuid not null references public.content_blocks(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  assessment_experience_id uuid not null references public.experiences(id) on delete restrict,
  assessment_enrollment_id uuid not null references public.experience_enrollments(id) on delete restrict,
  provider_attempt_id uuid null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint embedded_assessment_attempts_parent_block_key
    unique (parent_enrollment_id, parent_content_block_id),
  constraint embedded_assessment_attempts_completion_check
    check ((status = 'completed') = (completed_at is not null)),
  constraint embedded_assessment_attempts_parent_owner_fkey
    foreign key (parent_enrollment_id, participant_id)
    references public.experience_enrollments(id, participant_id) on delete restrict,
  constraint embedded_assessment_attempts_child_owner_fkey
    foreign key (assessment_enrollment_id, participant_id, assessment_experience_id)
    references public.experience_enrollments(id, participant_id, experience_id) on delete restrict
);

create unique index embedded_assessment_attempts_provider_attempt_key
  on public.embedded_assessment_attempts (assessment_experience_id, provider_attempt_id)
  where provider_attempt_id is not null;

create index embedded_assessment_attempts_parent_status_idx
  on public.embedded_assessment_attempts (parent_enrollment_id, status);

create index embedded_assessment_attempts_child_enrollment_idx
  on public.embedded_assessment_attempts (assessment_enrollment_id);

alter table public.prebuilt_assessments enable row level security;
alter table public.embedded_assessment_attempts enable row level security;

revoke all on table public.prebuilt_assessments from public, anon, authenticated;
revoke all on table public.embedded_assessment_attempts from public, anon, authenticated;
grant all on table public.prebuilt_assessments to service_role;
grant all on table public.embedded_assessment_attempts to service_role;

create or replace function public.begin_embedded_assessment(
  p_parent_enrollment_id uuid,
  p_parent_content_block_id uuid,
  p_participant_id uuid,
  p_now timestamptz default now()
)
returns table (
  attempt_id uuid,
  assessment_enrollment_id uuid,
  assessment_slug text,
  launch_path text,
  attempt_status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_parent public.experience_enrollments%rowtype;
  v_block public.content_blocks%rowtype;
  v_assessment public.experiences%rowtype;
  v_prebuilt public.prebuilt_assessments%rowtype;
  v_child public.experience_enrollments%rowtype;
  v_attempt public.embedded_assessment_attempts%rowtype;
  v_assessment_id uuid;
begin
  select * into v_parent
  from public.experience_enrollments
  where id = p_parent_enrollment_id
    and participant_id = p_participant_id
    and status in ('enrolled', 'in_progress', 'completed')
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'active_parent_enrollment_required';
  end if;

  select block.* into v_block
  from public.content_blocks block
  join public.experience_sections section on section.id = block.section_id
  join public.experience_versions version on version.id = section.experience_version_id
  where block.id = p_parent_content_block_id
    and block.block_type = 'prebuilt_assessment'
    and block.status = 'active'
    and block.visibility = 'visible'
    and version.id = v_parent.experience_version_id
    and version.experience_id = v_parent.experience_id
    and version.status = 'published'
  for update of block;
  if not found then
    raise exception using errcode = '42501', message = 'published_assessment_block_required';
  end if;

  begin
    v_assessment_id := (v_block.content ->> 'assessmentExperienceId')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = 'P0001', message = 'assessment_block_configuration_invalid';
  end;
  if v_assessment_id is null or v_assessment_id = v_parent.experience_id then
    raise exception using errcode = 'P0001', message = 'assessment_block_configuration_invalid';
  end if;

  select experience.* into v_assessment
  from public.experiences experience
  join public.prebuilt_assessments prebuilt on prebuilt.experience_id = experience.id
  where experience.id = v_assessment_id
    and experience.experience_type = 'assessment'
    and experience.status = 'active'
    and prebuilt.status = 'active';
  if not found then
    raise exception using errcode = 'P0001', message = 'active_prebuilt_assessment_required';
  end if;

  select * into v_prebuilt
  from public.prebuilt_assessments
  where experience_id = v_assessment.id
    and status = 'active';

  select * into v_child
  from public.experience_enrollments
  where participant_id = p_participant_id
    and experience_id = v_assessment.id
  for update;

  if not found then
    insert into public.experience_enrollments (
      participant_id, experience_id, experience_version_id, status,
      source_type, source_id, version_policy, enrolled_at, started_at
    ) values (
      p_participant_id, v_assessment.id, v_assessment.current_published_version_id,
      'in_progress', 'embedded_assessment', p_parent_content_block_id,
      'follow_current', p_now, p_now
    ) returning * into v_child;
  elsif v_child.status in ('withdrawn', 'expired') then
    update public.experience_enrollments
    set status = 'in_progress',
        experience_version_id = coalesce(v_assessment.current_published_version_id, experience_version_id),
        source_type = 'embedded_assessment',
        source_id = p_parent_content_block_id,
        started_at = coalesce(started_at, p_now),
        completed_at = null,
        updated_at = p_now
    where id = v_child.id
    returning * into v_child;
  elsif v_child.status = 'enrolled' then
    update public.experience_enrollments
    set status = 'in_progress', started_at = coalesce(started_at, p_now), updated_at = p_now
    where id = v_child.id
    returning * into v_child;
  end if;

  insert into public.embedded_assessment_attempts as existing (
    parent_enrollment_id, parent_content_block_id, participant_id,
    assessment_experience_id, assessment_enrollment_id, status,
    started_at, completed_at, updated_at
  ) values (
    v_parent.id, v_block.id, p_participant_id, v_assessment.id, v_child.id,
    case when v_child.status = 'completed' then 'completed' else 'in_progress' end,
    coalesce(v_child.started_at, p_now),
    case when v_child.status = 'completed' then coalesce(v_child.completed_at, p_now) else null end,
    p_now
  )
  on conflict (parent_enrollment_id, parent_content_block_id) do update
  set assessment_enrollment_id = excluded.assessment_enrollment_id,
      assessment_experience_id = excluded.assessment_experience_id,
      status = case when existing.status = 'completed' then 'completed' else excluded.status end,
      completed_at = coalesce(existing.completed_at, excluded.completed_at),
      updated_at = excluded.updated_at
  returning * into v_attempt;

  return query select v_attempt.id, v_child.id, v_assessment.slug,
    v_prebuilt.launch_path, v_attempt.status;
end;
$$;

revoke all on function public.begin_embedded_assessment(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.begin_embedded_assessment(uuid, uuid, uuid, timestamptz)
  to service_role;

create or replace function public.sync_embedded_assessment_enrollment_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    update public.embedded_assessment_attempts
    set status = 'completed',
        completed_at = coalesce(new.completed_at, now()),
        updated_at = now()
    where assessment_enrollment_id = new.id
      and status <> 'completed';
  end if;
  return new;
end;
$$;

create trigger sync_embedded_assessment_enrollment_completion
after update of status on public.experience_enrollments
for each row execute function public.sync_embedded_assessment_enrollment_completion();

revoke all on function public.sync_embedded_assessment_enrollment_completion()
  from public, anon, authenticated;

insert into public.prebuilt_assessments (experience_id, launch_path, completion_provider)
select id, '/experiences/life-mapping-u/original', 'lmu_assessment'
from public.experiences
where slug = 'life-mapping-u'
  and experience_type = 'assessment'
on conflict (experience_id) do update
set launch_path = excluded.launch_path,
    completion_provider = excluded.completion_provider,
    status = 'active',
    updated_at = now();

comment on function public.begin_embedded_assessment(uuid, uuid, uuid, timestamptz) is
  'Idempotently creates or reuses the participant Assessment enrollment authorized by a published parent Course Block. Service-role only.';
