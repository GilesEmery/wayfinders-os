-- Personal Notes V2
--
-- One durable, private note entry per intentional learner save.
--
-- Companion invariant:
-- Individual describes learner-owned data context. Individual data belongs to
-- the participant's canonical Course journey and is not duplicated per Cohort,
-- Offering, or Cohort Course Plan.
--
-- Availability and curriculum scope remain independent concepts. Personal
-- Notes are Course scoped, but other Individual Companion modules may
-- legitimately have module, lesson, or page scope.

create table public.participant_personal_notes (
  id uuid primary key default gen_random_uuid(),

  enrollment_id uuid not null,
  participant_id uuid not null,
  experience_id uuid not null,

  -- Stable across Course Versions.
  companion_module_key uuid not null,

  -- Historical provenance only. Visibility must not depend on these columns.
  source_experience_version_id uuid null,
  source_companion_module_id uuid null,

  content text not null,
  curriculum_context jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint participant_personal_notes_enrollment_fk
    foreign key (
      enrollment_id,
      participant_id,
      experience_id
    )
    references public.experience_enrollments (
      id,
      participant_id,
      experience_id
    )
    on delete restrict,

  constraint participant_personal_notes_source_module_fk
    foreign key (
      source_companion_module_id,
      source_experience_version_id
    )
    references public.companion_modules (
      id,
      experience_version_id
    )
    match full
    on delete set null,

  constraint participant_personal_notes_content_check
    check (
      char_length(btrim(content)) between 1 and 30000
    ),

  constraint participant_personal_notes_context_object_check
    check (
      jsonb_typeof(curriculum_context) = 'object'
    ),

  constraint participant_personal_notes_context_module_key_check
    check (
      curriculum_context -> 'module_key' is null
      or jsonb_typeof(curriculum_context -> 'module_key') = 'string'
    ),

  constraint participant_personal_notes_context_module_title_check
    check (
      curriculum_context -> 'module_title' is null
      or jsonb_typeof(curriculum_context -> 'module_title') = 'string'
    ),

  constraint participant_personal_notes_context_lesson_key_check
    check (
      curriculum_context -> 'lesson_key' is null
      or jsonb_typeof(curriculum_context -> 'lesson_key') = 'string'
    ),

  constraint participant_personal_notes_context_lesson_title_check
    check (
      curriculum_context -> 'lesson_title' is null
      or jsonb_typeof(curriculum_context -> 'lesson_title') = 'string'
    ),

  constraint participant_personal_notes_context_section_key_check
    check (
      curriculum_context -> 'section_key' is null
      or jsonb_typeof(curriculum_context -> 'section_key') = 'string'
    ),

  constraint participant_personal_notes_context_section_title_check
    check (
      curriculum_context -> 'section_title' is null
      or jsonb_typeof(curriculum_context -> 'section_title') = 'string'
    )
);

comment on table public.participant_personal_notes is
  'Private Personal Notes entries owned by one participant and canonical Course enrollment. Individual data is shared across Personal and Cohort entry contexts and is never duplicated per Cohort.';

comment on column public.participant_personal_notes.companion_module_key is
  'Stable Personal Notes Companion identity preserved across Course Versions.';

comment on column public.participant_personal_notes.source_experience_version_id is
  'Optional historical Version provenance. This column must not control note visibility.';

comment on column public.participant_personal_notes.source_companion_module_id is
  'Optional historical Companion row provenance. The stable companion_module_key remains authoritative.';

comment on column public.participant_personal_notes.curriculum_context is
  'Immutable stable curriculum keys and readable title snapshots captured when the note was created.';

create index participant_personal_notes_enrollment_recent_idx
  on public.participant_personal_notes (
    enrollment_id,
    companion_module_key,
    created_at desc,
    id desc
  );

create index participant_personal_notes_participant_course_idx
  on public.participant_personal_notes (
    participant_id,
    experience_id,
    created_at desc
  );

create or replace function public.enforce_participant_personal_note()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_module_is_valid boolean;
  v_source_is_valid boolean;
begin
  if tg_op = 'UPDATE' then
    if new.enrollment_id is distinct from old.enrollment_id
      or new.participant_id is distinct from old.participant_id
      or new.experience_id is distinct from old.experience_id
      or new.companion_module_key
        is distinct from old.companion_module_key
      or new.curriculum_context
        is distinct from old.curriculum_context
      or new.created_at is distinct from old.created_at
    then
      raise exception
        'Personal Note ownership, Course location, Companion identity, and creation timestamp are immutable.';
    end if;

    if new.source_companion_module_id
        is distinct from old.source_companion_module_id
      or new.source_experience_version_id
        is distinct from old.source_experience_version_id
    then
      -- Provenance may only transition from a complete historical pair to
      -- both values being null. This permits ON DELETE SET NULL without
      -- allowing provenance to be reassigned.
      if not (
        old.source_companion_module_id is not null
        and old.source_experience_version_id is not null
        and new.source_companion_module_id is null
        and new.source_experience_version_id is null
      ) then
        raise exception
          'Personal Note source provenance cannot be reassigned or partially populated.';
      end if;
    end if;

    if new.content is distinct from old.content then
      new.updated_at := pg_catalog.now();
    else
      new.updated_at := old.updated_at;
    end if;
  end if;

  new.content := pg_catalog.btrim(new.content);

  select exists (
    select 1
    from public.companion_modules module
    join public.experience_versions version
      on version.id = module.experience_version_id
    where module.module_key = new.companion_module_key
      and module.module_type = 'personal_notes'
      and module.audience = 'personal'
      and module.availability_context = 'individual'
      and version.experience_id = new.experience_id
  )
  into v_module_is_valid;

  if not v_module_is_valid then
    raise foreign_key_violation using
      message =
        'Personal Note Companion identity is not valid for this Course.';
  end if;

  if new.source_companion_module_id is not null then
    select exists (
      select 1
      from public.companion_modules module
      join public.experience_versions version
        on version.id = module.experience_version_id
      where module.id = new.source_companion_module_id
        and module.experience_version_id =
          new.source_experience_version_id
        and module.module_key = new.companion_module_key
        and module.module_type = 'personal_notes'
        and module.audience = 'personal'
        and module.availability_context = 'individual'
        and version.experience_id = new.experience_id
    )
    into v_source_is_valid;

    if not v_source_is_valid then
      raise foreign_key_violation using
        message =
          'Personal Note source does not match its Course and Companion identity.';
    end if;
  end if;

  return new;
end;
$function$;

create trigger participant_personal_notes_enforce
before insert or update on public.participant_personal_notes
for each row
execute function public.enforce_participant_personal_note();

alter table public.participant_personal_notes
  enable row level security;

revoke all
  on table public.participant_personal_notes
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.participant_personal_notes
  to service_role;

-- Convert each existing non-empty Personal Notes blob into one first-class
-- note entry. Reuse the legacy UUID so provenance is deterministic.
--
-- Only curriculum targets encoded by the old Companion scope are retained.
-- Missing lesson/page location is intentionally not inferred.

insert into public.participant_personal_notes (
  id,
  enrollment_id,
  participant_id,
  experience_id,
  companion_module_key,
  source_experience_version_id,
  source_companion_module_id,
  content,
  curriculum_context,
  created_at,
  updated_at
)
select
  entry.id,
  entry.enrollment_id,
  entry.participant_id,
  enrollment.experience_id,
  companion.module_key,
  entry.experience_version_id,
  entry.companion_module_id,
  btrim(entry.entry_data ->> 'text'),
  jsonb_strip_nulls(
    jsonb_build_object(
      'module_key',
        case
          when companion.scope in ('module', 'lesson', 'page')
            then curriculum_module.module_key
          else null
        end,
      'module_title',
        case
          when companion.scope in ('module', 'lesson', 'page')
            then curriculum_module.title
          else null
        end,
      'lesson_key',
        case
          when companion.scope in ('lesson', 'page')
            then curriculum_lesson.lesson_key
          else null
        end,
      'lesson_title',
        case
          when companion.scope in ('lesson', 'page')
            then curriculum_lesson.title
          else null
        end,
      'section_key',
        case
          when companion.scope = 'page'
            then curriculum_section.section_key
          else null
        end,
      'section_title',
        case
          when companion.scope = 'page'
            then curriculum_section.title
          else null
        end
    )
  ),
  entry.created_at,
  entry.updated_at
from public.participant_companion_entries entry
join public.companion_modules companion
  on companion.id = entry.companion_module_id
 and companion.experience_version_id = entry.experience_version_id
join public.experience_enrollments enrollment
  on enrollment.id = entry.enrollment_id
 and enrollment.participant_id = entry.participant_id
left join public.experience_modules curriculum_module
  on curriculum_module.id = companion.target_module_id
 and curriculum_module.experience_version_id =
   companion.experience_version_id
left join public.experience_lessons curriculum_lesson
  on curriculum_lesson.id = companion.target_lesson_id
 and curriculum_lesson.module_id = companion.target_module_id
 and curriculum_lesson.experience_version_id =
   companion.experience_version_id
left join public.experience_sections curriculum_section
  on curriculum_section.id = companion.target_section_id
 and curriculum_section.lesson_id = companion.target_lesson_id
 and curriculum_section.experience_version_id =
   companion.experience_version_id
where companion.module_type = 'personal_notes'
  and companion.audience = 'personal'
  and companion.availability_context = 'individual'
  and jsonb_typeof(entry.entry_data) = 'object'
  and nullif(btrim(entry.entry_data ->> 'text'), '') is not null;

-- Personal Notes specifically are an Entire Course tool.
-- This does not change the permitted scope of other Individual modules.

update public.companion_modules
set scope = 'course',
    target_module_id = null,
    target_lesson_id = null,
    target_section_id = null,
    updated_at = pg_catalog.now()
where module_type = 'personal_notes'
  and (
    scope <> 'course'
    or target_module_id is not null
    or target_lesson_id is not null
    or target_section_id is not null
  );
