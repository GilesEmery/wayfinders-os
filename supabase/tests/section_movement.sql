do $$
declare
  e uuid := gen_random_uuid(); v uuid := gen_random_uuid(); m uuid := gen_random_uuid(); m2 uuid := gen_random_uuid();
  l uuid := gen_random_uuid(); l2 uuid := gen_random_uuid(); s uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); b uuid := gen_random_uuid();
begin
  insert into public.experiences(id,slug,name,experience_type) values(e,'move-test-' || e,'Fixture','course');
  insert into public.experience_versions(id,experience_id,version_label,title,status) values(v,e,'Fixture','Fixture','draft');
  insert into public.experience_modules(id,experience_version_id,module_key,title,sort_order) values(m,v,'source','Source',0),(m2,v,'target','Target',1);
  insert into public.experience_lessons(id,experience_version_id,module_id,lesson_key,title,sort_order) values(l,v,m,'source','Source',0),(l2,v,m2,'target','Target',0);
  insert into public.experience_sections(id,experience_version_id,module_id,lesson_id,section_key,title,sort_order) values(s,v,m,l,'moving','Moving',0),(s2,v,m2,l2,'existing','Existing',0);
  insert into public.content_blocks(id,lesson_id,section_id,block_key,block_type,sort_order) values(b,l,s,'reflection','reflection',0),(gen_random_uuid(),l2,s2,'existing','rich_text',0);
  insert into public.response_definitions(lesson_id,experience_version_id,block_id,response_key,response_type,label) values(l,v,b,'reflection','reflection','Reflection');
  insert into public.companion_modules(experience_version_id,module_type,scope,audience,target_module_id,target_lesson_id,target_section_id,display_title) values(v,'personal_notes','page','personal',m,l,s,'Notes');
  perform public.move_draft_experience_section(e,v,s,l2,0);
  if not exists(select 1 from public.experience_sections where id=s and lesson_id=l2 and module_id=m2 and sort_order=0)
    or not exists(select 1 from public.content_blocks where id=b and lesson_id=l2)
    or not exists(select 1 from public.response_definitions where block_id=b and lesson_id=l2)
    or not exists(select 1 from public.companion_modules where target_section_id=s and target_lesson_id=l2 and target_module_id=m2)
    or not exists(select 1 from public.experience_sections where id=s2 and sort_order=1) then
    raise exception 'Cross-lesson move did not preserve hierarchy and ordering';
  end if;
  perform public.move_draft_experience_section(e,v,s,l2,2147483647);
  if not exists(select 1 from public.experience_sections where id=s and sort_order=1) then raise exception 'Same-lesson reorder failed'; end if;
  -- A destination response-key collision must roll back the entire move.
  insert into public.response_definitions(lesson_id,experience_version_id,response_key,response_type,label) values(l,v,'reflection','reflection','Collision');
  begin
    perform public.move_draft_experience_section(e,v,s,l,0);
    raise exception 'Collision unexpectedly succeeded';
  exception when unique_violation then null; end;
  if not exists(select 1 from public.content_blocks where id=b and lesson_id=l2)
    or not exists(select 1 from public.experience_sections where id=s and lesson_id=l2) then raise exception 'Failed move left partial changes'; end if;
  update public.experience_versions set status='published',published_at=now() where id=v;
  begin
    perform public.move_draft_experience_section(e,v,s,l,0);
    raise exception 'Published version unexpectedly moved';
  exception when raise_exception then
    if sqlerrm <> 'Only an editable Draft Version may be restructured.' then raise; end if;
  end;
  if has_function_privilege('authenticated','public.move_draft_experience_section(uuid,uuid,uuid,uuid,integer)','EXECUTE') then raise exception 'RPC exposed to clients'; end if;
end $$;
select 'PASS: cross-lesson move, content, responses, Companion, ordering, rollback, draft and role restrictions' as verification;
