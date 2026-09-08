-- Stable, additive Wayfinder CRM foundation.
-- participants remains the canonical person/profile record.

alter table public.participants
  add column preferred_name text null,
  add column phone text null,
  add column city text null,
  add column state_region text null,
  add column country text null,
  add column timezone text null,
  add column short_bio text null;

alter table public.participants
  add constraint participants_preferred_name_length_check check (preferred_name is null or char_length(btrim(preferred_name)) between 1 and 80),
  add constraint participants_phone_length_check check (phone is null or char_length(btrim(phone)) between 3 and 40),
  add constraint participants_city_length_check check (city is null or char_length(btrim(city)) between 1 and 120),
  add constraint participants_state_region_length_check check (state_region is null or char_length(btrim(state_region)) between 1 and 120),
  add constraint participants_country_length_check check (country is null or char_length(btrim(country)) between 1 and 120),
  add constraint participants_timezone_length_check check (timezone is null or char_length(btrim(timezone)) between 1 and 80),
  add constraint participants_short_bio_length_check check (short_bio is null or char_length(btrim(short_bio)) between 1 and 1000);

create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid null references public.participants(id) on delete restrict,
  organization_id uuid null references public.organizations(id) on delete restrict,
  hub_id uuid null references public.hubs(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  visibility text not null default 'internal' check (visibility = 'internal'),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_notes_exactly_one_subject_check check (
    num_nonnulls(participant_id, organization_id, hub_id) = 1
  )
);

comment on table public.crm_notes is
  'Internal CRM notes with explicit subject foreign keys. Add future subject columns with matching integrity rather than weak type/id polymorphism.';

create index crm_notes_participant_timeline_idx on public.crm_notes (participant_id, created_at desc) where participant_id is not null;
create index crm_notes_organization_timeline_idx on public.crm_notes (organization_id, created_at desc) where organization_id is not null;
create index crm_notes_hub_timeline_idx on public.crm_notes (hub_id, created_at desc) where hub_id is not null;
create index crm_notes_created_by_idx on public.crm_notes (created_by) where created_by is not null;

create trigger crm_notes_set_updated_at
before update on public.crm_notes
for each row execute function public.set_updated_at();

alter table public.crm_notes enable row level security;

-- Server-authorized launch posture. Browser roles receive no direct CRM access.
revoke all on table public.crm_notes from anon, authenticated;
