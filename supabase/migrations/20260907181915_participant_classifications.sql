-- Reusable, non-authorizing Wayfinder journey classifications.
-- Tags describe journey context only and never grant platform permissions.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text null,
  category text not null default 'journey' check (category in ('journey', 'program', 'relationship', 'crm')),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tags is
  'Reusable descriptive classifications for Wayfinders. Tags do not grant authorization.';

create table public.participant_tags (
  participant_id uuid not null references public.participants(id) on delete restrict,
  tag_id uuid not null references public.tags(id) on delete restrict,
  assigned_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (participant_id, tag_id)
);

comment on table public.participant_tags is
  'Descriptive Wayfinder journey classifications only; authorization remains in platform_role_assignments/admin_members.';

create index participant_tags_tag_id_idx on public.participant_tags (tag_id);
create index participant_tags_assigned_by_idx on public.participant_tags (assigned_by) where assigned_by is not null;
create index tags_category_status_idx on public.tags (category, status);

create trigger tags_set_updated_at before update on public.tags
for each row execute function public.set_updated_at();

alter table public.tags enable row level security;
alter table public.participant_tags enable row level security;

-- Server-only launch posture. Future browser access requires both explicit grants
-- and participant-scoped RLS policies; neither control is sufficient by itself.
revoke all on table public.tags, public.participant_tags from anon, authenticated;

insert into public.tags (slug, name, description, category)
values (
  'impact-studio-candidate',
  'Impact Studio Candidate',
  'A Wayfinder currently identified for the Impact Studio candidate journey.',
  'program'
)
on conflict (slug) do nothing;
