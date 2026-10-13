'use server';
import {revalidatePath} from 'next/cache';
import {requireAdmin,audit} from '@/lib/admin/auth';
import {getAuthorizationContext,canBuildExperienceById} from '@/lib/platform/authorization';
import {createAdminSupabaseClient} from '@/lib/supabase/admin';
import {applyLessonHeadingPatch,type LessonHeadingReceipt} from '@/lib/experiences/builder/lesson-heading';
import type {Json} from '@/lib/supabase/database.types';
export async function saveLessonHeadingAction(experienceId:string,versionId:string,sectionId:string,form:FormData):Promise<LessonHeadingReceipt>{try{
 const admin=await requireAdmin();if(!await canBuildExperienceById(await getAuthorizationContext(admin.id,admin.email),experienceId))throw Error('You are not authorized to edit this course');const db=createAdminSupabaseClient();
 const [version,section]=await Promise.all([db.from('experience_versions').select('status').eq('id',versionId).eq('experience_id',experienceId).maybeSingle(),db.from('experience_sections').select('title,description,settings,updated_at').eq('id',sectionId).eq('experience_version_id',versionId).maybeSingle()]);
 if(version.error||section.error||version.data?.status!=='draft'||!section.data)throw Error('Only a lesson in this draft course can be edited');
 const expected=String(form.get('expected_revision')??'');if(expected!==section.data.updated_at)throw Error('This lesson changed elsewhere. Your edits are retained; reload before saving');const raw=String(form.get('heading_patch')??'');if(raw.length>30000)throw Error('Heading edit is too large');
 const next=applyLessonHeadingPatch(section.data.title,section.data.description,section.data.settings,JSON.parse(raw));if(!next.changed)return {ok:true,revision:section.data.updated_at,unchanged:true};
 const result=await db.from('experience_sections').update({title:next.title,description:next.description,settings:next.settings as Json,updated_at:new Date().toISOString()}).eq('id',sectionId).eq('experience_version_id',versionId).eq('updated_at',expected).select('updated_at').maybeSingle();if(result.error||!result.data)throw Error('Save could not be confirmed or the lesson changed. Your edits are retained');
 await audit(admin,'course.lesson_heading.updated','experience_section',sectionId,{experienceId,versionId});revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}`);return {ok:true,revision:result.data.updated_at};
 }catch(error){return {ok:false,error:error instanceof Error?error.message:'Heading save failed; your edits are retained'};}}
