import 'server-only';
import {getAdmin,auditSecurityEvent} from './auth';
import {createAdminSupabaseClient} from '@/lib/supabase/admin';
import {listCompletedAssessmentResults,loadCompletedAssessmentResult,type AssessmentResultKind} from '@/lib/assessment-results';
import {ResponseLibraryAccessError} from '@/lib/platform/response-library';
export async function adminAssessmentDownloads(participantId:string,selection?:{kind:AssessmentResultKind;id:string}){
 const identity=await getAdmin();if(!identity)throw new ResponseLibraryAccessError(403);
 const person=await createAdminSupabaseClient().from('participants').select('id,full_name,first_name').eq('id',participantId).maybeSingle();
 if(person.error)throw Error('Unable to load Wayfinder.');if(!person.data)throw new ResponseLibraryAccessError(404);
 if(!selection){
  const results=await listCompletedAssessmentResults(participantId,{adminReview:true});
  await auditSecurityEvent(identity,'viewed_assessment_downloads','participant',participantId,{resultCount:results.length});
  return {results};
 }
 const result=await loadCompletedAssessmentResult(participantId,selection.kind,selection.id,{adminReview:true});
 if(!result)throw new ResponseLibraryAccessError(404);
 await auditSecurityEvent(identity,'downloaded_assessment_pdf','participant',participantId,{kind:selection.kind,resultId:selection.id});
 return {result,participantName:person.data.full_name||person.data.first_name||'Wayfinder'};
}
