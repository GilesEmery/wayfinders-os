-- GPT / agent rules for this migration:
-- 1. An email match alone must never activate an administrator.
-- 2. Supabase Auth owns the cryptographically secure, expiring, single-use
--    email invitation credential. This table records only its lifecycle.
-- 3. auth_user_id is bound when the invitation is issued and must match the
--    verified Supabase Auth user at activation.
-- 4. Activation and its security audit event must commit atomically.
-- 5. This function is service-role-only. Do not grant it to client roles.

alter table public.admin_members
  add column invitation_issued_at timestamptz null,
  add column invitation_expires_at timestamptz null,
  add column invitation_accepted_at timestamptz null,
  add column invitation_revoked_at timestamptz null;

alter table public.admin_members
  add constraint admin_members_invitation_window_check
  check (
    invitation_expires_at is null
    or (
      invitation_issued_at is not null
      and invitation_expires_at > invitation_issued_at
    )
  );

-- Preserve the ability to disable and later re-enable administrators who were
-- legitimately active before this invitation lifecycle was introduced.
update public.admin_members
set invitation_accepted_at = coalesce(last_login_at, updated_at)
where status = 'active'
  and auth_user_id is not null
  and invitation_accepted_at is null;

create or replace function public.activate_admin_invitation(
  p_auth_user_id uuid,
  p_email text,
  p_now timestamptz default now()
)
returns table (member_id uuid, activated_role text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_member public.admin_members%rowtype;
  v_email text := lower(btrim(p_email));
begin
  if p_auth_user_id is null or v_email = '' then
    raise exception using errcode = 'P0001', message = 'admin_invitation_invalid_identity';
  end if;

  select *
  into v_member
  from public.admin_members
  where auth_user_id = p_auth_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'admin_invitation_not_found';
  end if;

  if v_member.email_normalized <> v_email then
    raise exception using errcode = 'P0001', message = 'admin_invitation_identity_mismatch';
  end if;

  if v_member.invitation_revoked_at is not null then
    raise exception using errcode = 'P0001', message = 'admin_invitation_revoked';
  end if;

  if v_member.status <> 'invited' or v_member.invitation_accepted_at is not null then
    raise exception using errcode = 'P0001', message = 'admin_invitation_already_used';
  end if;

  if v_member.invitation_issued_at is null
    or v_member.invitation_expires_at is null
    or v_member.invitation_expires_at <= p_now then
    raise exception using errcode = 'P0001', message = 'admin_invitation_expired';
  end if;

  update public.admin_members
  set status = 'active',
      invitation_accepted_at = p_now,
      last_login_at = p_now
  where id = v_member.id
    and status = 'invited'
    and invitation_accepted_at is null;

  if not found then
    raise exception using errcode = 'P0001', message = 'admin_invitation_already_used';
  end if;

  insert into public.admin_audit_log (
    admin_user_id,
    admin_email,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_auth_user_id,
    v_email,
    'admin_invitation_activated',
    'admin_member',
    v_member.id::text,
    jsonb_build_object('role', v_member.role, 'activated_at', p_now)
  );

  return query select v_member.id, v_member.role;
end;
$$;

revoke all on function public.activate_admin_invitation(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.activate_admin_invitation(uuid, text, timestamptz) to service_role;

comment on function public.activate_admin_invitation(uuid, text, timestamptz) is
  'Atomically activates a Supabase-verified, unexpired admin invitation already bound to the same Auth user. Service-role only.';
