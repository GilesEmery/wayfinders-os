alter table public.participants
  add column if not exists full_name text null;

alter table public.participants
  add constraint participants_full_name_length_check
  check (full_name is null or char_length(btrim(full_name)) between 1 and 160);

create unique index participants_auth_user_id_unique_idx
  on public.participants (auth_user_id)
  where auth_user_id is not null;

create unique index lmu_assessments_one_active_per_participant_idx
  on public.lmu_assessments (participant_id)
  where status = 'in_progress';
