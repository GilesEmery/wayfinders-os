-- GPT / agent rules for this migration:
-- 1. Navigation entitlements are not authorization. Server permission checks
--    remain mandatory for every protected action.
-- 2. admin_members remains authoritative for Administrator and Super Admin.
-- 3. Every active authenticated participant implicitly has the Member role;
--    do not manufacture redundant Member assignment rows.
-- 4. Explicit DENY overrides explicit ALLOW and inherited role defaults.
-- 5. Course Creator is not Administrator and receives neither publish nor
--    edit-any authority through its defaults.
-- 6. All privileged mutations are service-role-only and audited atomically.

create table public.authorization_roles (
  role_key text primary key check (role_key ~ '^[a-z][a-z0-9_]*$'),
  display_name text not null unique,
  description text not null,
  is_system_protected boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.authorization_entitlements (
  entitlement_key text primary key check (entitlement_key ~ '^[a-z][a-z0-9_]*$'),
  display_name text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.authorization_permissions (
  permission_key text primary key check (permission_key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.authorization_role_entitlements (
  role_key text not null references public.authorization_roles(role_key) on delete restrict,
  entitlement_key text not null references public.authorization_entitlements(entitlement_key) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_key, entitlement_key)
);

create table public.authorization_role_permissions (
  role_key text not null references public.authorization_roles(role_key) on delete restrict,
  permission_key text not null references public.authorization_permissions(permission_key) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table public.authorization_entitlement_overrides (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null references public.authorization_entitlements(entitlement_key) on delete restrict,
  effect text not null check (effect in ('allow', 'deny')),
  granted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (auth_user_id, entitlement_key)
);

create table public.authorization_permission_overrides (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null references public.authorization_permissions(permission_key) on delete restrict,
  effect text not null check (effect in ('allow', 'deny')),
  scope_type text not null default 'platform' check (scope_type in ('platform', 'hub', 'training', 'cohort', 'resource')),
  scope_id uuid null,
  granted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authorization_permission_overrides_scope_check
    check ((scope_type = 'platform' and scope_id is null) or (scope_type <> 'platform' and scope_id is not null)),
  constraint authorization_permission_overrides_key unique nulls not distinct
    (auth_user_id, permission_key, scope_type, scope_id)
);

create index authorization_entitlement_overrides_user_idx
  on public.authorization_entitlement_overrides (auth_user_id);
create index authorization_permission_overrides_user_scope_idx
  on public.authorization_permission_overrides (auth_user_id, scope_type, scope_id);

alter table public.authorization_roles enable row level security;
alter table public.authorization_entitlements enable row level security;
alter table public.authorization_permissions enable row level security;
alter table public.authorization_role_entitlements enable row level security;
alter table public.authorization_role_permissions enable row level security;
alter table public.authorization_entitlement_overrides enable row level security;
alter table public.authorization_permission_overrides enable row level security;

revoke all on table public.authorization_roles from anon, authenticated;
revoke all on table public.authorization_entitlements from anon, authenticated;
revoke all on table public.authorization_permissions from anon, authenticated;
revoke all on table public.authorization_role_entitlements from anon, authenticated;
revoke all on table public.authorization_role_permissions from anon, authenticated;
revoke all on table public.authorization_entitlement_overrides from anon, authenticated;
revoke all on table public.authorization_permission_overrides from anon, authenticated;

insert into public.authorization_roles (role_key, display_name, description, is_system_protected) values
  ('member', 'Member', 'Base role implicitly held by every active PurposeOS participant.', true),
  ('course_creator', 'Course Creator', 'May create and work on owned or explicitly assigned trainings.', false),
  ('hub_leader', 'Hub Leader', 'Operational authority scoped to one or more Hubs.', false),
  ('admin', 'Administrator', 'Platform administration without Super Admin security authority.', true),
  ('super_admin', 'Super Admin', 'Protected platform-wide security authority.', true);

insert into public.authorization_entitlements (entitlement_key, display_name, description) values
  ('wayfinders', 'Wayfinders', 'Wayfinder registry and relationship workspace.'),
  ('hubs', 'Hubs', 'Hub management surfaces.'),
  ('partners', 'Partners', 'Partner and organization surfaces.'),
  ('my_tasks', 'My Tasks', 'Personal and assigned task surfaces.'),
  ('projects', 'Projects', 'Project collaboration surfaces.'),
  ('boards', 'Boards', 'Board planning surfaces.'),
  ('timeline', 'Timeline', 'Timeline surfaces.'),
  ('channels', 'Channels', 'Channel communication surfaces.'),
  ('messages', 'Messages', 'Direct messaging surfaces.'),
  ('notifications', 'Notifications', 'Notification surfaces.'),
  ('assessments', 'Assessments', 'Assessment management surfaces.'),
  ('manage_trainings', 'Manage Trainings', 'Training creation and management surfaces.');

insert into public.authorization_permissions (permission_key, description) values
  ('training.create', 'Create a training.'),
  ('training.edit_owned', 'Edit a training owned by the actor.'),
  ('training.edit_assigned', 'Edit a training explicitly assigned to the actor.'),
  ('training.edit_any', 'Edit any training.'),
  ('training.publish', 'Publish a training version.'),
  ('training.manage_versions', 'Manage training versions.'),
  ('training.manage_cohorts', 'Manage training cohorts.'),
  ('training.manage_enrollments', 'Manage training enrollments.'),
  ('hub.view', 'View an authorized Hub.'),
  ('hub.edit', 'Edit an authorized Hub.'),
  ('hub.manage_members', 'Manage members in an authorized Hub.'),
  ('hub.manage_leaders', 'Manage leaders in an authorized Hub.'),
  ('hub.manage_catalog', 'Manage catalog presentation in an authorized Hub.'),
  ('wayfinder.view', 'View Wayfinder records.'),
  ('wayfinder.edit', 'Edit Wayfinder records.'),
  ('wayfinder.manage_relationships', 'Manage Wayfinder relationships.'),
  ('platform.manage_admins', 'Manage Administrator authority.'),
  ('platform.manage_entitlements', 'Manage roles, entitlements, permissions, and overrides.'),
  ('platform.manage_security', 'Manage protected platform security configuration.');

insert into public.authorization_role_entitlements (role_key, entitlement_key) values
  ('member', 'my_tasks'), ('member', 'messages'), ('member', 'notifications'),
  ('course_creator', 'manage_trainings'),
  ('hub_leader', 'hubs'), ('hub_leader', 'wayfinders'), ('hub_leader', 'projects'),
  ('admin', 'wayfinders'), ('admin', 'hubs'), ('admin', 'partners'), ('admin', 'my_tasks'),
  ('admin', 'projects'), ('admin', 'boards'), ('admin', 'timeline'), ('admin', 'channels'),
  ('admin', 'messages'), ('admin', 'notifications'), ('admin', 'assessments'), ('admin', 'manage_trainings'),
  ('super_admin', 'wayfinders'), ('super_admin', 'hubs'), ('super_admin', 'partners'), ('super_admin', 'my_tasks'),
  ('super_admin', 'projects'), ('super_admin', 'boards'), ('super_admin', 'timeline'), ('super_admin', 'channels'),
  ('super_admin', 'messages'), ('super_admin', 'notifications'), ('super_admin', 'assessments'), ('super_admin', 'manage_trainings');

insert into public.authorization_role_permissions (role_key, permission_key) values
  ('course_creator', 'training.create'), ('course_creator', 'training.edit_owned'),
  ('course_creator', 'training.edit_assigned'), ('course_creator', 'training.manage_versions'),
  ('hub_leader', 'hub.view'), ('hub_leader', 'hub.edit'), ('hub_leader', 'hub.manage_members'),
  ('hub_leader', 'hub.manage_catalog'), ('hub_leader', 'wayfinder.view'),
  ('hub_leader', 'wayfinder.manage_relationships'),
  ('admin', 'training.create'), ('admin', 'training.edit_any'), ('admin', 'training.publish'),
  ('admin', 'training.manage_versions'), ('admin', 'training.manage_cohorts'),
  ('admin', 'training.manage_enrollments'), ('admin', 'hub.view'), ('admin', 'hub.edit'),
  ('admin', 'hub.manage_members'), ('admin', 'hub.manage_leaders'), ('admin', 'hub.manage_catalog'),
  ('admin', 'wayfinder.view'), ('admin', 'wayfinder.edit'), ('admin', 'wayfinder.manage_relationships'),
  ('super_admin', 'training.create'), ('super_admin', 'training.edit_any'), ('super_admin', 'training.publish'),
  ('super_admin', 'training.manage_versions'), ('super_admin', 'training.manage_cohorts'),
  ('super_admin', 'training.manage_enrollments'), ('super_admin', 'hub.view'), ('super_admin', 'hub.edit'),
  ('super_admin', 'hub.manage_members'), ('super_admin', 'hub.manage_leaders'), ('super_admin', 'hub.manage_catalog'),
  ('super_admin', 'wayfinder.view'), ('super_admin', 'wayfinder.edit'), ('super_admin', 'wayfinder.manage_relationships'),
  ('super_admin', 'platform.manage_admins'), ('super_admin', 'platform.manage_entitlements'),
  ('super_admin', 'platform.manage_security');

alter table public.platform_role_assignments
  drop constraint if exists platform_role_assignments_role_check;
alter table public.platform_role_assignments
  add constraint platform_role_assignments_role_check
  check (role in ('admin', 'super_admin', 'organization_admin', 'hub_leader', 'facilitator', 'course_builder', 'course_admin', 'course_creator'));

alter table public.platform_role_assignments
  drop constraint if exists platform_role_assignments_scope_type_check;
alter table public.platform_role_assignments
  add constraint platform_role_assignments_scope_type_check
  check (scope_type in ('platform', 'global', 'organization', 'hub', 'cohort', 'experience', 'training', 'resource'));

create or replace function public.manage_authorization_foundation(
  p_actor_auth_user_id uuid,
  p_target_participant_id uuid,
  p_assignment_type text,
  p_key text,
  p_effect text default null,
  p_scope_type text default 'platform',
  p_scope_id uuid default null,
  p_now timestamptz default now()
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor public.admin_members%rowtype;
  v_target public.participants%rowtype;
  v_action text;
begin
  select * into v_actor from public.admin_members
  where auth_user_id = p_actor_auth_user_id and role = 'super_admin' and status = 'active'
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'super_admin_required';
  end if;

  select * into v_target from public.participants
  where id = p_target_participant_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'participant_not_found'; end if;
  if v_target.auth_user_id is null then raise exception using errcode = 'P0001', message = 'existing_auth_account_required'; end if;
  if v_target.auth_user_id = p_actor_auth_user_id and p_assignment_type = 'role' then
    raise exception using errcode = '42501', message = 'self_role_mutation_not_allowed';
  end if;

  if p_assignment_type = 'role' then
    if p_key <> 'course_creator' then raise exception using errcode = 'P0001', message = 'unsupported_role_mutation'; end if;
    if p_scope_type not in ('platform', 'hub', 'training') then raise exception using errcode = 'P0001', message = 'invalid_role_scope'; end if;
    if (p_scope_type = 'platform' and p_scope_id is not null) or (p_scope_type <> 'platform' and p_scope_id is null) then
      raise exception using errcode = 'P0001', message = 'invalid_role_scope';
    end if;
    delete from public.platform_role_assignments
    where auth_user_id = v_target.auth_user_id and role = 'course_creator'
      and scope_type = case when p_scope_type = 'platform' then 'global' else p_scope_type end
      and scope_id is not distinct from p_scope_id;
    if p_effect = 'allow' then
      insert into public.platform_role_assignments (auth_user_id, role, scope_type, scope_id, status, granted_by)
      values (v_target.auth_user_id, 'course_creator', case when p_scope_type = 'platform' then 'global' else p_scope_type end, p_scope_id, 'active', p_actor_auth_user_id);
      v_action := 'course_creator_granted';
    elsif p_effect is null then
      v_action := 'course_creator_removed';
    else
      raise exception using errcode = 'P0001', message = 'invalid_role_effect';
    end if;
  elsif p_assignment_type = 'entitlement_override' then
    if not exists (select 1 from public.authorization_entitlements where entitlement_key = p_key) then
      raise exception using errcode = 'P0001', message = 'unknown_entitlement';
    end if;
    if p_scope_type <> 'platform' or p_scope_id is not null then raise exception using errcode = 'P0001', message = 'entitlement_scope_must_be_platform'; end if;
    delete from public.authorization_entitlement_overrides where auth_user_id = v_target.auth_user_id and entitlement_key = p_key;
    if p_effect in ('allow', 'deny') then
      insert into public.authorization_entitlement_overrides (auth_user_id, entitlement_key, effect, granted_by, created_at, updated_at)
      values (v_target.auth_user_id, p_key, p_effect, p_actor_auth_user_id, p_now, p_now);
      v_action := 'entitlement_override_' || p_effect || 'ed';
    elsif p_effect is null then
      v_action := 'entitlement_override_removed';
    else
      raise exception using errcode = 'P0001', message = 'invalid_override_effect';
    end if;
  elsif p_assignment_type = 'permission_override' then
    if not exists (select 1 from public.authorization_permissions where permission_key = p_key) then
      raise exception using errcode = 'P0001', message = 'unknown_permission';
    end if;
    if p_scope_type not in ('platform', 'hub', 'training', 'cohort', 'resource') then raise exception using errcode = 'P0001', message = 'invalid_permission_scope'; end if;
    if (p_scope_type = 'platform' and p_scope_id is not null) or (p_scope_type <> 'platform' and p_scope_id is null) then raise exception using errcode = 'P0001', message = 'invalid_permission_scope'; end if;
    delete from public.authorization_permission_overrides
    where auth_user_id = v_target.auth_user_id and permission_key = p_key
      and scope_type = p_scope_type and scope_id is not distinct from p_scope_id;
    if p_effect in ('allow', 'deny') then
      insert into public.authorization_permission_overrides (auth_user_id, permission_key, effect, scope_type, scope_id, granted_by, created_at, updated_at)
      values (v_target.auth_user_id, p_key, p_effect, p_scope_type, p_scope_id, p_actor_auth_user_id, p_now, p_now);
      v_action := 'permission_override_' || p_effect || 'ed';
    elsif p_effect is null then
      v_action := 'permission_override_removed';
    else
      raise exception using errcode = 'P0001', message = 'invalid_override_effect';
    end if;
  else
    raise exception using errcode = 'P0001', message = 'unsupported_assignment_type';
  end if;

  insert into public.admin_audit_log (admin_user_id, admin_email, action, entity_type, entity_id, metadata)
  values (p_actor_auth_user_id, v_actor.email_normalized, v_action, 'participant', v_target.id::text,
    jsonb_build_object('target_auth_user_id', v_target.auth_user_id, 'assignment_type', p_assignment_type,
      'key', p_key, 'effect', p_effect, 'scope_type', p_scope_type, 'scope_id', p_scope_id, 'occurred_at', p_now));
end;
$$;

revoke all on function public.manage_authorization_foundation(uuid, uuid, text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.manage_authorization_foundation(uuid, uuid, text, text, text, text, uuid, timestamptz) to service_role;

comment on function public.manage_authorization_foundation(uuid, uuid, text, text, text, text, uuid, timestamptz) is
  'Atomically manages Course Creator assignments and explicit entitlement/permission overrides. Super Admin via service role only.';
