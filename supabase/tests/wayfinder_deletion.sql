-- Run after the deletion migration inside BEGIN / ROLLBACK. Fixtures only.
do $$
declare
  v_companion uuid := gen_random_uuid();
  v_experience uuid := gen_random_uuid();
  v_version uuid := gen_random_uuid();
  v_enrollment uuid := gen_random_uuid();
  v_actor uuid := gen_random_uuid();
  v_user uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_profile uuid := gen_random_uuid();
  v_empty uuid := gen_random_uuid();
  v_actor_profile uuid := gen_random_uuid();
  v_email text := 'delete-test-' || v_user || '@example.invalid';
  v_actor_email text := 'delete-test-' || v_actor || '@example.invalid';
  v_empty_email text := 'delete-test-' || v_empty || '@example.invalid';
begin
  insert into auth.users(id,email) values(v_actor,v_actor_email),(v_user,v_email),(v_other,'delete-test-' || v_other || '@example.invalid');
  insert into public.admin_members(auth_user_id,email,email_normalized,role,status) values(v_actor,v_actor_email,v_actor_email,'super_admin','active');
  insert into public.participants(id,first_name,email,email_normalized,auth_user_id) values
    (v_actor_profile,'Fixture',v_actor_email,v_actor_email,v_actor),
    (v_profile,'Fixture',v_email,v_email,v_user),
    (v_empty,'Fixture',v_empty_email,v_empty_email,null);
  insert into public.participant_preferences(participant_id) values(v_profile),(v_empty);
  insert into public.lmu_assessments(participant_id) values(v_profile),(v_empty);
  insert into public.experiences(id,slug,name,experience_type) values(v_experience,'delete-test-' || v_experience,'Fixture course','course');
  insert into public.experience_versions(id,experience_id,version_label,title,status,published_at) values(v_version,v_experience,'Fixture','Fixture','published',now());
  update public.experiences set current_published_version_id=v_version where id=v_experience;
  insert into public.experience_enrollments(id,experience_id,experience_version_id,participant_id) values(v_enrollment,v_experience,v_version,v_profile);
  insert into public.companion_modules(experience_version_id,module_key,module_type,scope,audience,display_title) values(v_version,v_companion,'personal_notes','course','personal','Notes');
  insert into public.participant_personal_notes(enrollment_id,participant_id,experience_id,companion_module_key,content) values(v_enrollment,v_profile,v_experience,v_companion,'Fixture private note');
  begin
    perform public.prepare_wayfinder_deletion(v_other,v_profile,v_email);
    raise exception 'non-super-admin unexpectedly authorized';
  exception when insufficient_privilege then null; end;
  begin
    perform public.prepare_wayfinder_deletion(v_actor,v_profile,'wrong@example.invalid');
    raise exception 'wrong confirmation unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.prepare_wayfinder_deletion(v_actor,v_actor_profile,v_actor_email);
    raise exception 'self deletion unexpectedly authorized';
  exception when insufficient_privilege then null; end;
  begin
    delete from auth.users where id=v_actor;
    raise exception 'protected Super Admin unexpectedly deleted';
  exception when insufficient_privilege then null; end;
  if has_function_privilege('authenticated','public.prepare_wayfinder_deletion(uuid,uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.delete_unactivated_wayfinder(uuid,uuid,text)','EXECUTE') then
    raise exception 'deletion RPC exposed to clients';
  end if;
  -- An unknown restrictive FK must roll back every cleanup operation.
  create table private.deletion_fixture_guard(user_id uuid references auth.users(id) on delete restrict);
  insert into private.deletion_fixture_guard values(v_user);
  begin
    delete from auth.users where id=v_user;
    raise exception 'restricted account unexpectedly deleted';
  exception when foreign_key_violation then null; end;
  if not exists(select 1 from public.participants where id=v_profile)
    or not exists(select 1 from public.participant_preferences where participant_id=v_profile)
    or not exists(select 1 from public.lmu_assessments where participant_id=v_profile)
    or not exists(select 1 from public.participant_personal_notes where participant_id=v_profile) then
    raise exception 'failed account deletion left partial cleanup';
  end if;
  delete from private.deletion_fixture_guard;
  perform public.prepare_wayfinder_deletion(v_actor,v_profile,v_email);
  delete from auth.users where id=v_user;
  if exists(select 1 from public.participants where id=v_profile)
    or exists(select 1 from public.lmu_assessments where participant_id=v_profile)
    or exists(select 1 from public.participant_preferences where participant_id=v_profile)
    or exists(select 1 from public.experience_enrollments where participant_id=v_profile)
    or exists(select 1 from public.participant_personal_notes where participant_id=v_profile) then
    raise exception 'activated account cleanup incomplete';
  end if;
  perform public.delete_unactivated_wayfinder(v_actor,v_empty,v_empty_email);
  if exists(select 1 from public.participants where id=v_empty)
    or exists(select 1 from public.lmu_assessments where participant_id=v_empty) then
    raise exception 'unactivated profile cleanup incomplete';
  end if;
  if not exists(select 1 from public.admin_audit_log where entity_id=v_empty::text and action='wayfinder.deleted') then
    raise exception 'unactivated deletion audit missing';
  end if;
end;
$$;
select 'PASS: permissions, confirmation, self/Super Admin protection, rollback, activated and unactivated cleanup, audit' as verification;
