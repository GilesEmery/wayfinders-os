with fully_completed as (
  select assessment_id, max(completed_at) as completed_at
  from public.lmu_section_progress
  where status = 'completed'
    and section_key in (
      'success_stories', 'transferable_skills', 'teammates', 'supervisor',
      'values', 'growth', 'location', 'x_factor', 'salary', 'motivator_rankings'
    )
  group by assessment_id
  having count(distinct section_key) = 10
)
update public.lmu_assessments as assessment
set status = 'completed',
    completed_at = coalesce(assessment.completed_at, fully_completed.completed_at, now())
from fully_completed
where assessment.id = fully_completed.assessment_id
  and assessment.status <> 'completed';
