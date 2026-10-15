import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from '../../scripts/performance/offline-module.mjs';
function fixture({role='admin',missing=false,readError=false,auditError=false}={}){
 const queries=[],audits=[];
 const assessment={id:'attempt',participant_id:'other-person',status:'in_progress'};
 const db={from(table){const q={table,filters:[]};queries.push(q);return {select(){return this},eq(key,value){q.filters.push([key,value]);return this},maybeSingle(){return this},then(resolve){const data=table==='lmu_assessments'?(missing?null:assessment):table==='lmu_responses'?[{section_key:'success_stories',response_data:{draft:{story:'Saved incomplete story'}}}]:table==='lmu_results'?[{section_key:'values',result_data:{result:{summary:'Saved result'}}}]:[{section_key:'success_stories',current_step:'editor',status:'in_progress'}];return Promise.resolve({data,error:readError?{message:'unavailable'}:null}).then(resolve)}}}};
 const mod=load('lib/admin/lmu-review.ts',{'server-only':{},'./auth':{requireAdmin:async()=>{if(!['admin','super_admin'].includes(role))throw Error('Admin required');return {id:'reviewer',role}},auditSecurityEvent:async(...args)=>{if(auditError)throw Error('Audit failed');audits.push(args)}},'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db}});
 return {run:()=>mod.loadAdminLmuReview('attempt'),queries,audits};
}
for(const role of ['admin','super_admin'])test(`${role} reviews another participant's drafts, saved step and results; never reads personal notes`,async()=>{
 const f=fixture({role}),result=await f.run();assert.equal(result.assessment.participant_id,'other-person');assert.equal(result.responses[0].response_data.draft.story,'Saved incomplete story');assert.equal(result.progress[0].current_step,'editor');assert.equal(result.results[0].result_data.result.summary,'Saved result');assert.deepEqual(f.queries.map(q=>q.table),['lmu_assessments','lmu_section_progress','lmu_responses','lmu_results']);for(const q of f.queries.slice(1))assert.deepEqual(q.filters,[['assessment_id','attempt']]);assert.equal(f.audits[0][1],'viewed_assessment_work');
});
test('participant and facilitator cannot use admin review or query any assessment',async()=>{for(const role of ['participant','facilitator']){const f=fixture({role});await assert.rejects(f.run(),/Admin required/);assert.equal(f.queries.length,0)}});
test('missing assessment avoids response queries',async()=>{const f=fixture({missing:true});assert.equal(await f.run(),null);assert.equal(f.queries.length,1)});
test('database and audit failures do not expose partial work',async()=>{await assert.rejects(fixture({readError:true}).run(),/unavailable/);await assert.rejects(fixture({auditError:true}).run(),/Audit failed/)});

test('admin detail renders another person’s incomplete saved answers, module step and completed section result',async()=>{
 const React=await import('react');const jsx=await import('react/jsx-runtime');const {renderToStaticMarkup}=await import('react-dom/server');
 const {readableResponseFields}=await import('../platform/response-library-policy.ts');
 const page=load('app/admin/life-mapping-u/[assessmentId]/page.tsx',{
  'react/jsx-runtime':jsx,'next/navigation':{notFound(){throw Error('not found')}},
  '@/components/admin/AdminShell':{AdminShell:({children})=>React.createElement('main',null,children)},
  '@/lib/admin/lmu-review':{loadAdminLmuReview:()=>fixture().run()},
  '@/lib/platform/response-library-policy':{readableResponseFields},
  '@/components/admin/LMUAdminResult':{LMUAdminResult:({value})=>React.createElement('p',null,value.result.summary)},
  '@/lib/admin/format':{humanize:v=>v??'Not started',formatDate:v=>v??'—'},
  '@/lib/experiences/lmu/completion':{assessmentProgress:()=>10,completedSectionCount:()=>1,LMU_SECTION_LABELS:{success_stories:'Success Stories',values:'Values'}},
  '@/lib/experiences/lmu/server/constants':{LMU_SECTION_KEYS:['success_stories','values']},
 });
 const html=renderToStaticMarkup(await page.default({params:Promise.resolve({assessmentId:'attempt'})}));assert.match(html,/Saved incomplete story/);assert.match(html,/Saved step: editor/);assert.match(html,/Saved result/);assert.ok(!html.includes('Response contents are private'));
});
