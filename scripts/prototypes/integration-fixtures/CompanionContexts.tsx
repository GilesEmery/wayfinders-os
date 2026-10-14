import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {PreviewDeviceFrame} from '@/components/admin/PreviewDeviceFrame';
import {ParticipantCompanion} from '@/components/experiences/builder/ParticipantCompanion';
import {loadCompanionRuntime} from '@/lib/experiences/builder/companion-data';
export default async function CompanionContexts({searchParams}:{searchParams:Promise<{cohort?:string}>}){
 const query=await searchParams,cohort=query.cohort==='preview',source=JSON.parse(readFileSync(join(process.cwd(),'.local/course-review/hub-leader-published.json'),'utf8'));
 // Authoring configuration only. Every other table is an empty read-only fixture.
 const db={from(table:string){if(!['companion_modules','companion_delivery_overrides','companion_module_resources'].includes(table))throw Error('Preview prohibits '+table);const data=table==='companion_modules'?source.companion:[];const q={select(){return q},eq(){return q},in(){return q},is(){return q},order(){return q},then(resolve:(value:unknown)=>unknown){return Promise.resolve({data,error:null}).then(resolve)}};return q}};
 const companion=await loadCompanionRuntime({versionId:source.version.id,offering:null,preview:true,previewCohort:cohort,db:db as never});
 const current={moduleId:source.sections[0].module_id,lessonId:source.sections[0].lesson_id,section:source.sections[0]};
 return <PreviewDeviceFrame contexts={[{cohortId:'preview',label:'Cohort preview'}]} selectedContext={cohort?'preview':''}><div className="participant-course" style={{padding:24}}><p>Local Companion field preview · Course content and participant data are unchanged.</p><div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,2fr)',gap:24}}><main><h1>Hub Leader Cohort</h1><p>Use Companion context above to switch between Personal and Cohort fields.</p></main><ParticipantCompanion companion={companion} current={current as never} preview route={{slug:'preview',moduleKey:'preview',lessonKey:'preview',sectionKey:'preview'}}/></div></div></PreviewDeviceFrame>;
}
