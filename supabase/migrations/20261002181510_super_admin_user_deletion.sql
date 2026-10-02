-- Account deletion goes through Supabase Auth's Admin API. Its BEFORE DELETE
-- trigger cleans the profile in the same transaction, so FK/storage failures
-- roll back the cleanup. No existing accounts are deleted by this migration.
create schema if not exists private;

create function private.remove_wayfinder_records(p_participant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.companion_call_sessions where started_by_participant_id = p_participant_id) then
    raise exception 'shared_call_history_requires_transfer' using errcode = '23503';
  end if;
  -- Import batches remain operational history; detach only the person links.
  update public.crm_import_rows set existing_participant_id = null where existing_participant_id = p_participant_id;
  update public.crm_import_rows set created_participant_id = null where created_participant_id = p_participant_id;
  delete from public.companion_chat_messages where author_participant_id = p_participant_id;
  delete from public.embedded_assessment_attempts where participant_id = p_participant_id;
  delete from public.participant_personal_notes where participant_id = p_participant_id;
  delete from public.participant_companion_entries where participant_id = p_participant_id;
  delete from public.participant_responses where participant_id = p_participant_id;
  delete from public.lesson_progress where participant_id = p_participant_id;
  delete from public.experience_progress where participant_id = p_participant_id;
  delete from public.experience_enrollment_version_history where participant_id = p_participant_id;
  delete from public.experience_enrollments where participant_id = p_participant_id;
  delete from public.participant_offering_assignments where participant_id = p_participant_id;
  delete from public.experience_entitlements where participant_id = p_participant_id;
  delete from public.participant_preferences where participant_id = p_participant_id;
  delete from public.participant_tags where participant_id = p_participant_id;
  delete from public.organization_memberships where participant_id = p_participant_id;
  delete from public.hub_memberships where participant_id = p_participant_id;
  delete from public.cohort_memberships where participant_id = p_participant_id;
  delete from public.crm_notes where participant_id = p_participant_id;
  -- LMU attempts/results/responses, legacy sessions, and section progress cascade.
  delete from public.participants where id = p_participant_id;
end;
$$;
revoke all on function private.remove_wayfinder_records(uuid) from public, anon, authenticated, service_role;

create function public.prepare_wayfinder_deletion(p_actor_id uuid, p_participant_id uuid, p_confirmation_email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_person public.participants%rowtype;
begin
  if not exists (select 1 from public.admin_members where auth_user_id = p_actor_id and role = 'super_admin' and status = 'active') then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  select * into v_person from public.participants where id = p_participant_id for update;
  if not found then raise exception 'participant_not_found' using errcode = 'P0002'; end if;
  if v_person.auth_user_id = p_actor_id then raise exception 'self_deletion_not_allowed' using errcode = '42501'; end if;
  if lower(btrim(p_confirmation_email)) is distinct from lower(v_person.email) then
    raise exception 'confirmation_email_mismatch' using errcode = '22023';
  end if;
  if exists (select 1 from public.admin_members where (auth_user_id = v_person.auth_user_id or email_normalized = lower(v_person.email)) and role = 'super_admin') then
    raise exception 'super_admin_is_protected' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_members where email_normalized = lower(v_person.email) and auth_user_id is not null and auth_user_id is distinct from v_person.auth_user_id) then
    raise exception 'administrator_identity_conflict' using errcode = '23503';
  end if;
  if v_person.auth_user_id is not null and not exists (select 1 from auth.users where id = v_person.auth_user_id and lower(email) = lower(v_person.email)) then
    raise exception 'account_identity_conflict' using errcode = '23503';
  end if;
  return pg_catalog.jsonb_build_object('authUserId', v_person.auth_user_id, 'email', v_person.email);
end;
$$;
revoke all on function public.prepare_wayfinder_deletion(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_wayfinder_deletion(uuid, uuid, text) to service_role;

create function private.remove_deleted_auth_wayfinder()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_person record;
begin
  if exists (select 1 from public.admin_members where (auth_user_id = old.id or email_normalized = lower(old.email)) and role = 'super_admin') then
    raise exception 'super_admin_is_protected' using errcode = '42501';
  end if;
  for v_person in select id from public.participants where auth_user_id = old.id for update loop
    perform private.remove_wayfinder_records(v_person.id);
  end loop;
  delete from public.authorization_permission_overrides where auth_user_id = old.id;
  delete from public.authorization_entitlement_overrides where auth_user_id = old.id;
  delete from public.platform_role_assignments where auth_user_id = old.id;
  delete from public.admin_members where auth_user_id = old.id or (auth_user_id is null and email_normalized = lower(old.email));
  -- References to shared records created/granted to others retain their FK guards.
  return old;
end;
$$;
revoke all on function private.remove_deleted_auth_wayfinder() from public, anon, authenticated, service_role;
create trigger remove_deleted_auth_wayfinder before delete on auth.users
for each row execute function private.remove_deleted_auth_wayfinder();

create function public.delete_unactivated_wayfinder(p_actor_id uuid, p_participant_id uuid, p_confirmation_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_target jsonb;
begin
  v_target := public.prepare_wayfinder_deletion(p_actor_id, p_participant_id, p_confirmation_email);
  if v_target ->> 'authUserId' is not null then raise exception 'auth_api_deletion_required' using errcode = '22023'; end if;
  perform private.remove_wayfinder_records(p_participant_id);
  delete from public.admin_members where auth_user_id is null and email_normalized = lower(v_target ->> 'email');
  insert into public.admin_audit_log(admin_user_id, admin_email, action, entity_type, entity_id, metadata)
  select p_actor_id, email_normalized, 'wayfinder.deleted', 'participant', p_participant_id, pg_catalog.jsonb_build_object('accountActivated', false)
  from public.admin_members where auth_user_id = p_actor_id;
end;
$$;
revoke all on function public.delete_unactivated_wayfinder(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.delete_unactivated_wayfinder(uuid, uuid, text) to service_role;
