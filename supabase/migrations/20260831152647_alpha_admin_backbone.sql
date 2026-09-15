create table public.admin_members (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  email_normalized text not null unique check (email_normalized = lower(btrim(email_normalized))),
  auth_user_id uuid null references auth.users(id) on delete set null,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  invited_by uuid null references public.admin_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz null
);

create unique index admin_members_auth_user_id_idx on public.admin_members (auth_user_id)
where auth_user_id is not null;
create index admin_members_status_idx on public.admin_members (status);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid null references auth.users(id) on delete set null,
  admin_email text not null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text null,
  entity_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_admin_user_id_idx on public.admin_audit_log (admin_user_id);

create trigger admin_members_set_updated_at before update on public.admin_members
for each row execute function public.set_updated_at();

alter table public.admin_members enable row level security;
alter table public.admin_audit_log enable row level security;

-- Admin data is deliberately server-only. Authentication alone never grants
-- Data API access; every privileged operation passes through a Next.js guard.
revoke all on table public.admin_members from anon, authenticated;
revoke all on table public.admin_audit_log from anon, authenticated;

insert into public.admin_members (email, email_normalized, role, status)
values ('giles@yourwayfinders.org', 'giles@yourwayfinders.org', 'super_admin', 'invited')
on conflict (email_normalized) do update
set role = excluded.role
where public.admin_members.auth_user_id is null;
;
