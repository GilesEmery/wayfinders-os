begin;

-- Optional Experience-level gate; visibility and admission remain authoritative.
-- No row means no password gate. No existing Experience is protected here.
create table public.experience_password_credentials (
  experience_id uuid primary key
    references public.experiences(id) on delete cascade,
  password_hash text not null,
  credential_revision uuid not null default gen_random_uuid(),
  password_updated_at timestamptz not null default now(),
  constraint experience_password_hash_format check (
    password_hash ~ '^scrypt\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$'
  )
);

comment on table public.experience_password_credentials is
  'Server-only shared-password gate, independent of curriculum and enrollment. Presence requires verification in application runtime authorities; this table alone does not enforce runtime access.';
comment on column public.experience_password_credentials.password_hash is
  'Node crypto.scrypt: N=131072, r=8, p=1, random 16-byte salt, 64-byte derived key; serialized scrypt$N$r$p$saltHex$keyHex. Never return to clients or audit logs.';
comment on column public.experience_password_credentials.credential_revision is
  'Fresh random revision on every credential write. Runtime grants must match the current Experience ID and revision; deleting and recreating a credential must not revive old grants.';

alter table public.experience_password_credentials enable row level security;
revoke all on table public.experience_password_credentials
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.experience_password_credentials to service_role;

-- Invoker trigger, never a client-callable privileged mutation RPC.
create function public.rotate_experience_password_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' and new.experience_id is distinct from old.experience_id then
    raise exception 'Experience credential identity cannot be changed';
  end if;
  new.credential_revision := gen_random_uuid();
  new.password_updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function public.rotate_experience_password_revision()
  from public, anon, authenticated;
grant execute on function public.rotate_experience_password_revision()
  to service_role;

create trigger experience_password_revision_before_write
before insert or update on public.experience_password_credentials
for each row execute function public.rotate_experience_password_revision();

commit;
