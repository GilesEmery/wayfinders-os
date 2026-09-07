-- Purpose OS Hub context, preferences, and experience offerings.
-- Additive only. Organizations remain available as Partner/CRM relationships and
-- do not become part of the authorization hierarchy.
-- Hub membership, leadership, or offering access does not imply visibility into
-- private participant responses. Response-level visibility remains a separate,
-- deliberately deferred privacy domain.

alter table public.hubs
  add column membership_mode text not null default 'invite_only'
  check (membership_mode in ('open', 'approval_required', 'invite_only'));

comment on column public.hubs.membership_mode is
  'How a Wayfinder may request or receive Hub membership; full approval workflows are deferred.';

create table public.participant_preferences (
  participant_id uuid primary key references public.participants(id) on delete restrict,
  default_hub_id uuid null references public.hubs(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.participant_preferences is
  'Wayfinder UI preferences. default_hub_id selects context only and never grants membership or authorization.';

create index participant_preferences_default_hub_id_idx
  on public.participant_preferences (default_hub_id)
  where default_hub_id is not null;

create trigger participant_preferences_set_updated_at
before update on public.participant_preferences
for each row execute function public.set_updated_at();

alter table public.cohorts
  add constraint cohorts_id_experience_key unique (id, experience_id);

create table public.experience_offerings (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete restrict,
  experience_version_id uuid null,
  hub_id uuid null references public.hubs(id) on delete restrict,
  cohort_id uuid null references public.cohorts(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  slug text not null check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'archived')),
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  access_mode text not null default 'assignment' check (access_mode in ('open', 'hub_membership', 'cohort_membership', 'entitlement', 'assignment')),
  is_default boolean not null default false,
  starts_at timestamptz null,
  ends_at timestamptz null,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_offerings_time_order_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint experience_offerings_version_experience_fkey foreign key (experience_version_id, experience_id) references public.experience_versions(id, experience_id) on delete restrict,
  constraint experience_offerings_cohort_experience_fkey foreign key (cohort_id, experience_id) references public.cohorts(id, experience_id) on delete restrict,
  constraint experience_offerings_context_check check (cohort_id is null or hub_id is null),
  constraint experience_offerings_access_context_check check (
    (access_mode <> 'hub_membership' or hub_id is not null)
    and (access_mode <> 'cohort_membership' or cohort_id is not null)
  )
);

comment on table public.experience_offerings is
  'Contextual availability/configuration for a master experience. Offerings do not determine whether rendering is custom_code, builder, or hybrid.';

create unique index experience_offerings_global_slug_key
  on public.experience_offerings (slug)
  where hub_id is null and cohort_id is null;
create unique index experience_offerings_hub_slug_key
  on public.experience_offerings (hub_id, slug)
  where hub_id is not null;
create unique index experience_offerings_cohort_slug_key
  on public.experience_offerings (cohort_id, slug)
  where cohort_id is not null;
create unique index experience_offerings_global_default_key
  on public.experience_offerings (experience_id)
  where is_default and hub_id is null and cohort_id is null and status = 'active';
create unique index experience_offerings_hub_default_key
  on public.experience_offerings (experience_id, hub_id)
  where is_default and hub_id is not null and status = 'active';
create unique index experience_offerings_cohort_default_key
  on public.experience_offerings (experience_id, cohort_id)
  where is_default and cohort_id is not null and status = 'active';
create index experience_offerings_experience_id_idx on public.experience_offerings (experience_id);
create index experience_offerings_version_id_idx on public.experience_offerings (experience_version_id) where experience_version_id is not null;
create index experience_offerings_hub_id_idx on public.experience_offerings (hub_id) where hub_id is not null;
create index experience_offerings_cohort_id_idx on public.experience_offerings (cohort_id) where cohort_id is not null;
create index experience_offerings_created_by_idx on public.experience_offerings (created_by) where created_by is not null;

create trigger experience_offerings_set_updated_at
before update on public.experience_offerings
for each row execute function public.set_updated_at();

create table public.participant_offering_assignments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete restrict,
  offering_id uuid not null references public.experience_offerings(id) on delete restrict,
  source_type text not null default 'direct_assignment' check (source_type in ('direct_assignment', 'admin_grant', 'purchase', 'scholarship')),
  source_id uuid null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz null,
  assigned_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participant_offering_assignments_time_order_check check (expires_at is null or expires_at > starts_at),
  constraint participant_offering_assignments_participant_offering_key unique (participant_id, offering_id)
);

comment on table public.participant_offering_assignments is
  'Explicit Wayfinder-to-offering access. The source fields explain why direct access exists.';

create index participant_offering_assignments_offering_id_idx on public.participant_offering_assignments (offering_id);
create index participant_offering_assignments_assigned_by_idx on public.participant_offering_assignments (assigned_by) where assigned_by is not null;
create index participant_offering_assignments_status_idx on public.participant_offering_assignments (participant_id, status);

create trigger participant_offering_assignments_set_updated_at
before update on public.participant_offering_assignments
for each row execute function public.set_updated_at();

alter table public.participant_preferences enable row level security;
alter table public.experience_offerings enable row level security;
alter table public.participant_offering_assignments enable row level security;

-- Server-only launch posture. Future browser access requires explicit grants and
-- appropriately scoped RLS policies. Hub context never substitutes for authorization.
revoke all on table public.participant_preferences, public.experience_offerings,
  public.participant_offering_assignments from anon, authenticated;
