import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {load} from '../performance/offline-module.mjs';
import {getBlockDefinition} from '../../lib/experiences/builder/block-registry.ts';
import {validateResponseData,responseDataJson} from '../../lib/experiences/builder/response-registry.ts';
const configuration={options:[{key:'first',label:'First',sortOrder:0},{key:'second',label:'Second',sortOrder:1}],displayStyle:'cards'};
function fixture({response=null,ready=true,result={data:{id:'saved'},error:null}}={}){
 const writes=[],filters=[];const block={id:'block',block_key:'question',block_type:'card_selection',status:'active',visibility:'visible',configuration};
 const section={section_key:'section',renderer_mode:'builder',layout:{columns:[{blocks:[block]}]}};
 const resolution={status:ready?'ready':'unavailable',participantId:'authorized-person',enrollmentId:'enrollment',requirementsBypassed:false,structure:{version:{id:'version'},modules:[{module_key:'module',lessons:[{id:'lesson',lesson_key:'lesson',sections:[section]}]}]},responses:{block:{definition:{id:'definition',response_type:'choice',lesson_id:'lesson',experience_version_id:'version',is_required:true,configuration},response}}};
 const query={update(payload){writes.push(payload);return this;},insert(payload){writes.push(payload);return this;},eq(name,value){filters.push([name,value]);return this;},select(){return this;},maybeSingle(){return Promise.resolve(result);},single(){return Promise.resolve(result);}};
 const mod=load('lib/experiences/builder/response-mutations.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>({from(table){assert.equal(table,'participant_responses');return query;}})},'./block-registry':{getBlockDefinition},'./participant-runtime':{resolveParticipantCourseForMutation:async()=>resolution},'./progress-mutations':{recordSectionVisitForAuthorizedCourse:async()=>({ok:true})},'./response-registry':{validateResponseData,responseDataJson}});
 const save=(value='second',revision=response?.updated_at??'',final=false)=>{const form=new FormData();form.set('response',value);form.set('response_revision',revision);return (final?mod.finalizeParticipantResponse:mod.saveParticipantResponseDraft)('course','module','lesson','section','question',null,form);};
 return {save,writes,filters};
}
test('authorized single-select save stores only the stable key through the existing mutation',async()=>{const f=fixture();await f.save();assert.equal(f.writes.length,1);assert.deepEqual(f.writes[0].response_data,{value:'second'});assert.equal(f.writes[0].participant_id,'authorized-person');assert.equal(f.writes[0].status,'draft');});
test('single-select rejects unauthorized options, missing required finals and unavailable courses before writes',async()=>{for(const [config,value,final] of [[{},'unknown',false],[{},'',true],[{ready:false},'first',false]]){const f=fixture(config);await assert.rejects(f.save(value,'',final));assert.equal(f.writes.length,0);}});
test('single-select retains revision conflicts and finalized-response protections',async()=>{const response={id:'response',updated_at:'current',status:'draft'};const stale=fixture({response});await assert.rejects(stale.save('first','old'),/changed while saving/);assert.equal(stale.writes.length,0);const final=fixture({response:{...response,status:'finalized'}});await assert.rejects(final.save(),/already submitted/);assert.equal(final.writes.length,0);});
test('failed writes, duplicate submissions and concurrent updates never report successful completion',async()=>{for(const result of [{data:null,error:{code:'23505'}},{data:null,error:{message:'Offline failure'}},{data:null,error:null}]){const f=fixture({response:{id:'response',updated_at:'current',status:'draft'},result});await assert.rejects(f.save());assert.ok(f.filters.some(([name,value])=>name==='participant_id'&&value==='authorized-person'));assert.ok(f.filters.some(([name,value])=>name==='updated_at'&&value==='current'));assert.ok(f.filters.some(([name,value])=>name==='status'&&value==='draft'));}});
test('authoring saves preserve long existing option IDs while serializing presentation settings',()=>{
 const source=load('lib/experiences/admin/block-mutations.ts',{
  '../builder/media-source':{},'../builder/block-presentation':{},'@/lib/admin/auth':{},'@/lib/platform/authorization':{},'@/lib/supabase/admin':{},'./inline-draft':{},'../builder/block-registry':{},'../builder/validation':{},'./resource-copy':{},'../builder/resource-assets':{},
 },readFileSync('lib/experiences/admin/block-mutations.ts','utf8')+'\nexports.testConfiguration=formConfiguration;');
 const form=new FormData();const key='a'.repeat(80);for(const [name,value] of Object.entries({option_enabled_0:'on',option_key_0:key,option_label_0:'Renamed',option_order_0:'0',display_style:'dropdown',card_columns:'2',question_purpose:'reflection'}))form.set(name,value);
 const config=source.testConfiguration('card_selection',form);assert.equal(config.options[0].key,key);assert.equal(config.options[0].label,'Renamed');assert.equal(config.displayStyle,'dropdown');
});
