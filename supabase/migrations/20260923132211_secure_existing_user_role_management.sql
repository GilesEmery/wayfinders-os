-- GPT / agent rules for this migration:
-- 1. admin_members remains authoritative for global Admin/Super Admin access.
-- 2. This function manages existing authenticated users only and never sends
--    invitations or creates Auth identities.
-- 3. Only an active Super Admin may grant/remove Admin. This function never
--    grants, removes, or downgrades Super Admin.
-- 4. Hub membership is relational context. Hub Leader authorization requires
--    a separate active platform_role_assignments row scoped to that Hub.
-- 5. Removing Hub Leader authority preserves Hub membership and demotes its
--    relational capacity to member.
-- 6. Authority mutation and its audit event must commit atomically.
-- 7. This function is service-role-only. Do not grant it to client roles.

create or replace function public.manage_existing_user_authority(
  p_actor_auth_user_id uuid,
  p_target_participant_id uuid,
  p_role text,
  p_enabled boolean,
  p_hub_id uuid default null,
  p_now timestamptz default now()
)
returns table (managed_role text, enabled boolean, scope_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor public.admin_members%rowtype;
  v_target public.participants%rowtype;
  v_target_admin public.admin_members%rowtype;
  v_hub public.hubs%rowtype;
  v_action text;
begin
  select * into v_actor
  from public.admin_members
  where auth_user_id = p_actor_auth_user_id
    and status = 'active'
    and role in ('admin', 'super_admin')
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'active_administrator_required';
  end if;

  select * into v_target
  from public.participants
  where id = p_target_participant_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'participant_not_found';
  end if;
  if v_target.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'existing_auth_account_required';
  end if;
  if p_role not in ('admin', 'hub_leader') then
    raise exception using errcode = 'P0001', message = 'unsupported_managed_role';
  end if;

  if p_role = 'admin' then
    if p_hub_id is not null then
      raise exception using errcode = 'P0001', message = 'admin_scope_must_be_global';
    end if;
    if v_actor.role <> 'super_admin' then
      raise exception using errcode = '42501', message = 'super_admin_required';
    end if;
    if v_target.auth_user_id = p_actor_auth_user_id then
      raise exception using errcode = '42501', message = 'self_admin_mutation_not_allowed';
    end if;

    select * into v_target_admin
    from public.admin_members
    where auth_user_id = v_target.auth_user_id
       or email_normalized = v_target.email_normalized
    order by (auth_user_id = v_target.auth_user_id) desc
    limit 1
    for update;

    if found and v_target_admin.auth_user_id is not null
      and v_target_admin.auth_user_id <> v_target.auth_user_id then
      raise exception using errcode = 'P0001', message = 'administrator_identity_conflict';
    end if;
    if found and v_target_admin.role = 'super_admin' then
      raise exception using errcode = '42501', message = 'super_admin_is_protected';
    end if;

    if p_enabled then
      if found then
        update public.admin_members
        set auth_user_id = v_target.auth_user_id,
            email = v_target.email,
            email_normalized = v_target.email_normalized,
            role = 'admin',
            status = 'active',
            invitation_accepted_at = coalesce(invitation_accepted_at, p_now),
            invitation_revoked_at = null
        where id = v_target_admin.id;
      else
        insert into public.admin_members (
          email, email_normalized, auth_user_id, role, status,
          invitation_accepted_at, last_login_at
        ) values (
          v_target.email, v_target.email_normalized, v_target.auth_user_id,
          'admin', 'active', p_now, null
        );
      end if;
      v_action := 'existing_user_administrator_granted';
    else
      if found then
        update public.admin_members
        set status = 'disabled'
        where id = v_target_admin.id
          and role = 'admin';
      end if;
      v_action := 'existing_user_administrator_removed';
    end if;
  else
    if p_hub_id is null then
      raise exception using errcode = 'P0001', message = 'hub_scope_required';
    end if;

    select * into v_hub
    from public.hubs
    where id = p_hub_id and status = 'active'
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'active_hub_required';
    end if;

    if p_enabled then
      insert into public.hub_memberships (
        hub_id, participant_id, membership_role, status, joined_at
      ) values (
        p_hub_id, v_target.id, 'hub_leader', 'active', p_now
      )
      on conflict (hub_id, participant_id) do update
      set membership_role = 'hub_leader',
          status = 'active',
          joined_at = coalesce(public.hub_memberships.joined_at, excluded.joined_at);

      delete from public.platform_role_assignments
      where auth_user_id = v_target.auth_user_id
        and role = 'hub_leader'
        and scope_type = 'hub'
        and scope_id = p_hub_id;

      insert into public.platform_role_assignments (
        auth_user_id, role, scope_type, scope_id, status, granted_by
      ) values (
        v_target.auth_user_id, 'hub_leader', 'hub', p_hub_id, 'active', p_actor_auth_user_id
      );
      v_action := 'hub_leader_granted';
    else
      delete from public.platform_role_assignments
      where auth_user_id = v_target.auth_user_id
        and role = 'hub_leader'
        and scope_type = 'hub'
        and scope_id = p_hub_id;

      update public.hub_memberships
      set membership_role = 'member'
      where hub_id = p_hub_id
        and participant_id = v_target.id
        and status = 'active';
      v_action := 'hub_leader_removed';
    end if;
  end if;

  insert into public.admin_audit_log (
    admin_user_id, admin_email, action, entity_type, entity_id, metadata
  ) values (
    p_actor_auth_user_id,
    v_actor.email_normalized,
    v_action,
    'participant',
    v_target.id::text,
    jsonb_build_object(
      'target_participant_id', v_target.id,
      'target_auth_user_id', v_target.auth_user_id,
      'role', p_role,
      'enabled', p_enabled,
      'hub_id', p_hub_id,
      'occurred_at', p_now
    )
  );

  return query select p_role, p_enabled, p_hub_id;
end;
$$;

revoke all on function public.manage_existing_user_authority(uuid, uuid, text, boolean, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.manage_existing_user_authority(uuid, uuid, text, boolean, uuid, timestamptz) to service_role;

comment on function public.manage_existing_user_authority(uuid, uuid, text, boolean, uuid, timestamptz) is
  'Atomically manages Admin or Hub-scoped Hub Leader authority for an existing authenticated participant. Service-role only.';
