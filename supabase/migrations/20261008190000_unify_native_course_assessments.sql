begin;

-- Route legacy inline course assessments through the shared canonical enrollment.
-- Preserve original course responses for history; never delete or complete parent enrollments.
lock table public.participant_responses, public.experience_enrollments, public.content_blocks in share row exclusive mode;

create temporary table native_assessment_links on commit drop as
select b.id block_id, d.id source_definition_id, x.id assessment_id, x.name,
       x.slug, x.current_published_version_id version_id, target.id target_definition_id,
       d.response_key
from public.content_blocks b
join public.response_definitions d on d.block_id = b.id
join public.experience_versions v on v.id = d.experience_version_id
join (values
 ('personal-impact-statement.v1', 'personal-impact-statement'),
 ('start-something.v1', 'start-something'),
 ('activate-your-purpose-assessment.v1', 'activate-your-purpose'),
 ('wayfinders-ethos-assessment.v1', 'wayfinders-ethos')
) map(renderer, slug) on map.renderer = b.custom_renderer_key
join public.experiences x on x.slug = map.slug and x.status = 'active'
join public.response_definitions target on target.experience_version_id = x.current_published_version_id
  and target.response_key = d.response_key
where v.experience_id <> x.id and b.block_type in ('custom_component', 'system_component');

insert into public.prebuilt_assessments(experience_id, launch_path, completion_provider)
select distinct assessment_id, '/experiences/' || slug, 'experience_enrollment'
from native_assessment_links
on conflict(experience_id) do nothing;

-- A single child enrollment is shared by every course link and standalone entry point.
do $$
declare source record; child public.experience_enrollments%rowtype;
  payload jsonb; finished_at timestamptz; existing public.participant_responses%rowtype;
begin
  for source in
    select r.*, link.assessment_id, link.version_id, link.target_definition_id, link.block_id, link.slug
    from public.participant_responses r
    join native_assessment_links link on link.source_definition_id = r.response_definition_id
    join public.experience_enrollments parent on parent.id = r.enrollment_id
      and parent.participant_id = r.participant_id
    order by r.updated_at
  loop
    insert into public.experience_enrollments(participant_id, experience_id, experience_version_id, status, source_type, source_id, version_policy)
    values(source.participant_id, source.assessment_id, source.version_id, 'in_progress', 'embedded_assessment', source.block_id, 'follow_current')
    on conflict(participant_id, experience_id) do nothing;
    select * into child from public.experience_enrollments
      where participant_id = source.participant_id and experience_id = source.assessment_id;
    -- Do not overwrite a historical/version-pinned or withdrawn enrollment.
    if child.experience_version_id is distinct from source.version_id or child.status not in ('enrolled','in_progress','completed') then continue; end if;
    payload := source.response_data;
    if source.slug = 'activate-your-purpose' and source.status in ('submitted','finalized')
      and source.finalized_at is not null and payload->'finished' is null
      and jsonb_typeof(payload->'answers') = 'object'
      and not exists(select 1 from generate_series(1,15) q where coalesce(payload->'answers'->>('q'||q),'') not in ('A','B','C','D')) then
      payload := payload || jsonb_build_object('finished', jsonb_build_object('completedAt',source.finalized_at,'answers',payload->'answers'));
    end if;
    finished_at := null;
    if source.status in ('submitted','finalized') and payload->'finished'->>'completedAt' is not null then
      finished_at := (payload->'finished'->>'completedAt')::timestamptz;
    end if;
    select * into existing from public.participant_responses
      where enrollment_id = child.id and response_definition_id = source.target_definition_id;
    -- A draft must never replace a completed snapshot; otherwise preserve the newest save.
    if found and (existing.finalized_at is not null and (finished_at is null or existing.finalized_at >= finished_at)
      or existing.finalized_at is null and finished_at is null and existing.updated_at >= source.updated_at) then continue; end if;
    insert into public.participant_responses(participant_id,enrollment_id,experience_version_id,response_definition_id,response_data,status,finalized_at,updated_at)
    values(source.participant_id,child.id,child.experience_version_id,source.target_definition_id,payload,
      case when finished_at is null then 'draft' else 'submitted' end,finished_at,source.updated_at)
    on conflict(enrollment_id,response_definition_id) do update
      set response_data=excluded.response_data,status=excluded.status,finalized_at=excluded.finalized_at,updated_at=excluded.updated_at;
    if finished_at is not null then
      update public.experience_enrollments set status='completed',completed_at=finished_at,updated_at=now()
      where id=child.id;
    end if;
  end loop;
end $$;

update public.content_blocks b
set block_type='prebuilt_assessment',custom_renderer_key=null,
    content=jsonb_build_object('assessmentExperienceId',link.assessment_id,'title',link.name,'description',''),
    completion_rule='interaction',updated_at=now()
from native_assessment_links link where b.id=link.block_id;

-- Connect existing course enrollments so shared completion can satisfy the course block.
insert into public.embedded_assessment_attempts(parent_enrollment_id,parent_content_block_id,participant_id,
  assessment_experience_id,assessment_enrollment_id,status,completed_at)
select distinct r.enrollment_id,link.block_id,r.participant_id,link.assessment_id,child.id,
  case when child.status='completed' then 'completed' else 'in_progress' end,
  case when child.status='completed' then child.completed_at else null end
from public.participant_responses r
join native_assessment_links link on link.source_definition_id=r.response_definition_id
join public.experience_enrollments child on child.participant_id=r.participant_id and child.experience_id=link.assessment_id
where child.status in ('enrolled','in_progress','completed')
on conflict(parent_enrollment_id,parent_content_block_id) do nothing;

commit;
