import 'server-only';
import {requireAdmin,auditSecurityEvent} from './auth';
import {createAdminSupabaseClient} from '@/lib/supabase/admin';

// Administrative assessment review is distinct from participant/facilitator sharing.
// These tables contain LMU work only; course personal notes are never queried.
export async function loadAdminLmuReview(assessmentId:string){
 const identity=await requireAdmin();
 const db=createAdminSupabaseClient();
 const assessmentRead=await db.from('lmu_assessments').select('id,participant_id,status,current_module,started_at,completed_at,updated_at').eq('id',assessmentId).maybeSingle();
 if(assessmentRead.error)throw Error('Assessment information is unavailable.');
 if(!assessmentRead.data)return null;
 const [progress,responses,results]=await Promise.all([
  db.from('lmu_section_progress').select('section_key,status,current_step,updated_at,completed_at').eq('assessment_id',assessmentRead.data.id),
  db.from('lmu_responses').select('section_key,response_data,updated_at').eq('assessment_id',assessmentRead.data.id),
  db.from('lmu_results').select('section_key,result_data,finalized_at').eq('assessment_id',assessmentRead.data.id),
 ]);
 if(progress.error||responses.error||results.error)throw Error('Assessment work is unavailable.');
 await auditSecurityEvent(identity,'viewed_assessment_work','lmu_assessment',assessmentId,{participantId:assessmentRead.data.participant_id});
 return {identity,assessment:assessmentRead.data,progress:progress.data??[],responses:responses.data??[],results:results.data??[]};
}
