create table public.participants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  email_normalized text not null check (email_normalized = lower(btrim(email_normalized))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_user_id uuid null references auth.users(id) on delete set null
);

create index participants_email_normalized_idx on public.participants (email_normalized);
create index participants_auth_user_id_idx on public.participants (auth_user_id) where auth_user_id is not null;

create table public.lmu_assessments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  experience_type text not null default 'original'
    check (experience_type in ('original', 'student', 'empty_nesters')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  assessment_version text not null default '1.0',
  current_module text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lmu_assessments_participant_id_idx on public.lmu_assessments (participant_id);
alter table public.lmu_assessments add constraint lmu_assessments_id_participant_id_key unique (id, participant_id);

create table public.lmu_section_progress (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.lmu_assessments(id) on delete cascade,
  section_key text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  current_step text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (assessment_id, section_key)
);

create index lmu_section_progress_assessment_id_idx on public.lmu_section_progress (assessment_id);

create table public.lmu_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.lmu_assessments(id) on delete cascade,
  section_key text not null,
  response_data jsonb not null default '{}'::jsonb,
  schema_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, section_key)
);

create index lmu_responses_assessment_id_idx on public.lmu_responses (assessment_id);

create table public.lmu_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.lmu_assessments(id) on delete cascade,
  section_key text not null,
  result_data jsonb not null default '{}'::jsonb,
  schema_version text not null default '1.0',
  finalized_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, section_key)
);

create index lmu_results_assessment_id_idx on public.lmu_results (assessment_id);

create table public.participant_sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  assessment_id uuid not null,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  foreign key (assessment_id, participant_id)
    references public.lmu_assessments(id, participant_id) on delete cascade
);

create index participant_sessions_participant_id_idx on public.participant_sessions (participant_id);
create index participant_sessions_assessment_participant_idx on public.participant_sessions (assessment_id, participant_id);
create index participant_sessions_expires_at_idx on public.participant_sessions (expires_at);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger participants_set_updated_at before update on public.participants
for each row execute function public.set_updated_at();
create trigger lmu_assessments_set_updated_at before update on public.lmu_assessments
for each row execute function public.set_updated_at();
create trigger lmu_section_progress_set_updated_at before update on public.lmu_section_progress
for each row execute function public.set_updated_at();
create trigger lmu_responses_set_updated_at before update on public.lmu_responses
for each row execute function public.set_updated_at();
create trigger lmu_results_set_updated_at before update on public.lmu_results
for each row execute function public.set_updated_at();

alter table public.participants enable row level security;
alter table public.lmu_assessments enable row level security;
alter table public.lmu_section_progress enable row level security;
alter table public.lmu_responses enable row level security;
alter table public.lmu_results enable row level security;
alter table public.participant_sessions enable row level security;

-- Phase 1 intentionally has no anon/authenticated policies. Only the server-side
-- Supabase secret client may access participant data until Supabase Auth ships.
revoke all on table public.participants from anon, authenticated;
revoke all on table public.lmu_assessments from anon, authenticated;
revoke all on table public.lmu_section_progress from anon, authenticated;
revoke all on table public.lmu_responses from anon, authenticated;
revoke all on table public.lmu_results from anon, authenticated;
revoke all on table public.participant_sessions from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
;
