begin;

-- One canonical assessment for standalone use and every course attachment.
-- Adds content to existing protected LMS tables; does not alter their RLS policies.
do $$
declare
  experience_id uuid := gen_random_uuid(); version_id uuid := gen_random_uuid();
  module_id uuid := gen_random_uuid(); lesson_id uuid := gen_random_uuid();
  section_id uuid := gen_random_uuid(); layout_id uuid := gen_random_uuid();
  column_id uuid := gen_random_uuid(); block_id uuid := gen_random_uuid();
begin
  -- Never replace a previously created or edited assessment.
  if exists(select 1 from public.experiences where slug='circle-of-influence') then
    raise exception 'Circle of Influence already exists. Review its release before registering it.';
  end if;
  insert into public.experiences(id,slug,name,description,experience_type,delivery_mode,status,accent_color,visibility,admission_policy)
  values(experience_id,'circle-of-influence','Circle of Influence','Recognize the people in your everyday communities and discern how to shepherd them with care.','assessment','builder','draft','#0054A1','public','open_enrollment');
  insert into public.experience_versions(id,experience_id,version_label,status,title,description,release_type,shell_mode,course_configuration)
  values(version_id,experience_id,'Circle of Influence v1','draft','Circle of Influence','A guided relationship map based on the Wayfinders Circle of Influence worksheet.','major','enhanced',
    '{"card":{"eyebrow":"Assessment","headline":"Circle of Influence","supporting_text":"Know your people. Listen with care. Lead with purpose.","image_resource_id":null},"appearance":{"header_treatment":"minimal","reading_width":"wide","accent_color":"#0054A1","colors":{"surface":"#FFFFFF","text":"#252A29"}}}'::jsonb);
  insert into public.experience_modules(id,experience_version_id,module_key,title,sort_order,is_required,requirement_level,metadata)
  values(module_id,version_id,'circle-of-influence','Circle of Influence',0,true,'required','{"source":"native"}'::jsonb);
  insert into public.experience_lessons(id,module_id,experience_version_id,lesson_key,title,sort_order,is_required,requirement_level,completion_rule,metadata)
  values(lesson_id,module_id,version_id,'reflection','Circle of Influence',0,true,'required','blocks_complete','{"source":"native"}'::jsonb);
  insert into public.experience_sections(id,lesson_id,module_id,experience_version_id,section_key,title,sort_order,requirement_level,renderer_mode,completion_rule,settings,metadata)
  values(section_id,lesson_id,module_id,version_id,'assessment','Circle of Influence',0,'required','builder','response_submitted','{}'::jsonb,'{"source":"native"}'::jsonb);
  insert into public.section_layouts(id,section_id,layout_mode,participant_resizing_enabled,settings)
  values(layout_id,section_id,'single_column',false,'{}'::jsonb);
  insert into public.section_columns(id,section_layout_id,section_id,column_key,sort_order,width_percent,sticky,collapsible,default_collapsed,mobile_order,mobile_behavior,settings)
  values(column_id,layout_id,section_id,'main',0,100,false,false,false,0,'stack','{}'::jsonb);
  insert into public.content_blocks(id,lesson_id,section_id,column_id,block_key,block_type,sort_order,content,settings,requirement_level,status,visibility,completion_rule,custom_renderer_key,metadata)
  values(block_id,lesson_id,section_id,column_id,'circle-of-influence','custom_component',0,'{}'::jsonb,'{}'::jsonb,'required','active','visible','response_submitted','circle-of-influence.v1','{"source":"native","schema_version":1}'::jsonb);
  insert into public.response_definitions(lesson_id,experience_version_id,block_id,response_key,response_type,label,instructions,is_required,configuration,raw_visibility,result_visibility,share_mode,visibility_settings)
  values(lesson_id,version_id,block_id,'circle_of_influence','structured_response','Circle of Influence','List up to 15 people in each applicable area, pray for them, and discern your next step.',true,'{"schemaVersion":1,"areaCount":8,"maxPeoplePerArea":15}'::jsonb,'participant_only','participant_only','disabled','{}'::jsonb);
  -- Assemble while Draft; publish only once the complete native structure exists.
  update public.experience_versions set status='published',published_at=now() where id=version_id;
  update public.experiences set status='active',current_published_version_id=version_id where id=experience_id;
  insert into public.prebuilt_assessments(experience_id,launch_path,completion_provider,status)
  values(experience_id,'/experiences/circle-of-influence','experience_enrollment','active');
end $$;

commit;
