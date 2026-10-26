import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
let rows, enrollment, failWrite, failCompletion, visits, writes, course;
const db={from(table){let filters=[],operation='read',payload;
 const query={select(){return query;},eq(k,v){filters.push(r=>r[k]===v);return query;},update(v){operation='update';payload=v;return query;},insert(v){operation='insert';payload=v;return query;},maybeSingle(){return execute(true);},single(){return execute(true);},then(yes,no){return execute(false).then(yes,no);}};
 async function execute(single){
  let data=table==='participant_responses'?rows:[enrollment];
  const matching=data.filter(r=>filters.every(fn=>fn(r)));
  if(operation!=='read'){
   writes++;
   if(failWrite)return {data:null,error:{message:'fixture disk unavailable'}};
   if(operation==='insert'){
    if(rows.some(r=>r.enrollment_id===payload.enrollment_id&&r.response_definition_id===payload.response_definition_id))return {data:null,error:{code:'23505'}};
    const row={...structuredClone(payload),id:`r-${rows.length}`};rows.push(row);return {data:single?structuredClone(row):[structuredClone(row)],error:null};
   }
   matching.forEach(r=>Object.assign(r,structuredClone(payload)));
  }
  return {data:single?structuredClone(matching[0]??null):structuredClone(matching),error:null};
 }return query;
}};
globalThis.__completionFixture={db,course:()=>course,visit:()=>{visits++;},complete:()=>{if(!failCompletion){enrollment.status='completed';enrollment.completed_at??='2026-10-02T12:00:00Z';}return {ok:!failCompletion};}};
const mocks={
 'server-only':'export {};',
 './performance-measurement':'export const measureOperation=(_,work)=>work();',
 '@/lib/supabase/admin':'export const createAdminSupabaseClient=()=>globalThis.__completionFixture.db;',
 './participant-runtime':'export const resolveParticipantCourseForMutation=async()=>globalThis.__completionFixture.course();',
 './progress-mutations':'export const recordSectionVisitForAuthorizedCourse=async()=>globalThis.__completionFixture.visit(); export const completeSectionResponsesForAuthorizedCourse=async()=>globalThis.__completionFixture.complete();',
};
registerHooks({resolve(specifier,context,next){if(mocks[specifier])return {url:`mock:${specifier}`,shortCircuit:true};let path;if(specifier.startsWith('@/'))path=resolve(root,specifier.slice(2));else if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))path=resolve(dirname(fileURLToPath(context.parentURL)),specifier);if(path&&!existsSync(path)&&existsSync(path+'.ts'))path+='.ts';if(path&&existsSync(path))return {url:pathToFileURL(path).href,shortCircuit:true};return next(specifier,context);},load(url,context,next){if(url.startsWith('mock:'))return {format:'module',source:mocks[url.slice(5)],shortCircuit:true};if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context);}});
const args=['fixture','module','lesson','section','block',null];
function ready(renderer){return {status:'ready',enrollmentId:'e',participantId:'p',responses:{b:{definition:{id:'d',response_type:'structured_response',is_required:true},response:null}},structure:{version:{id:'v'},modules:[{module_key:'module',lessons:[{lesson_key:'lesson',sections:[{section_key:'section',layout:{columns:[{blocks:[{id:'b',block_key:'block',block_type:'custom_component',custom_renderer_key:renderer,status:'active',visibility:'visible'}]}]}}]}]}]}};}
beforeEach(()=>{rows=[];enrollment={id:'e',participant_id:'p',experience_version_id:'v',status:'enrolled',completed_at:null};course=ready('microchurch.v1');failWrite=false;failCompletion=false;visits=0;writes=0;});
const {saveMicrochurch}=await import('./microchurch-mutations.ts');
const {emptyMicrochurchData}=await import('./microchurch.ts');
function complete(){return {ratings:Array.from({length:21},()=>3)};}
test('incomplete and fully answered autosaves are drafts and do not complete an enrollment',async()=>{for(const d of [emptyMicrochurchData(),complete()]){const result=await saveMicrochurch(...args,d);assert.equal(result.envelope.finished,null);assert.equal(rows[0].status,'draft');assert.equal(enrollment.status,'enrolled');}});
test('invalid final completion creates no response or progress',async()=>{await assert.rejects(saveMicrochurch(...args,{},true));assert.equal(writes,0);assert.equal(visits,0);assert.equal(enrollment.status,'enrolled');});
test('only successful persistence and canonical enrollment completion confirm a finished assessment',async()=>{const saved=await saveMicrochurch(...args,complete(),true);assert.ok(saved.completedAt);assert.equal(saved.envelope.finished.completedAt,saved.completedAt);assert.equal(rows[0].status,'submitted');assert.equal(enrollment.status,'completed');});
test('save failures and completion failures preserve content and cannot report false success',async()=>{failWrite=true;await assert.rejects(saveMicrochurch(...args,complete(),true));assert.equal(visits,0);assert.equal(enrollment.status,'enrolled');failWrite=false;failCompletion=true;await assert.rejects(saveMicrochurch(...args,complete(),true),/completion could not be confirmed/);const original=structuredClone(rows[0].response_data.finished);failCompletion=false;const changed=complete();changed.ratings[0]=5;const saved=await saveMicrochurch(...args,changed,true);assert.deepEqual(saved.envelope.finished,original);});
test('concurrent and late draft saves never erase a finished snapshot',async()=>{await Promise.all([saveMicrochurch(...args,complete(),true),saveMicrochurch(...args,emptyMicrochurchData())]);assert.equal(rows.length,1);assert.ok(rows[0].response_data.finished);const original=structuredClone(rows[0].response_data.finished);await saveMicrochurch(...args,complete(),true);assert.deepEqual(rows[0].response_data.finished,original);});
test('explicit retakes retain completed history and stale retake tokens cannot overwrite a later result',async()=>{const first=await saveMicrochurch(...args,complete(),true);const d=complete();d.ratings[0]=5;const retake=await saveMicrochurch(...args,d,true,first.completedAt);assert.equal(retake.envelope.previousResults.length,1);assert.equal(retake.envelope.previousResults[0].completedAt,first.completedAt);assert.equal(retake.envelope.finished.participantMaterial.ratings[0],5);const repeated=await saveMicrochurch(...args,complete(),true,first.completedAt);assert.deepEqual(repeated.envelope.finished,retake.envelope.finished);});
test('unavailable, unenrolled, hidden, wrong renderer and nonstructured-response targets fail before writing',async()=>{for(const change of [()=>course.status='unavailable',()=>course.enrollmentId=null,()=>course.structure.modules[0].lessons[0].sections[0].layout.columns[0].blocks[0].visibility='hidden',()=>course.structure.modules[0].lessons[0].sections[0].layout.columns[0].blocks[0].custom_renderer_key='unknown',()=>course.responses.b.definition.response_type='short_text']){course=ready('microchurch.v1');change();await assert.rejects(saveMicrochurch(...args,complete(),true));assert.equal(writes,0);}});
test('response persistence stays scoped to the authorized participant, enrollment, version and response definition',async()=>{rows=[{id:'other',participant_id:'other',enrollment_id:'other-e',experience_version_id:'v',response_definition_id:'d',response_data:{secret:'preserved'},updated_at:'2026-01-01'}];await saveMicrochurch(...args,complete());assert.deepEqual(rows[0].response_data,{secret:'preserved'});assert.equal(rows[1].participant_id,'p');assert.equal(rows[1].enrollment_id,'e');assert.equal(rows[1].experience_version_id,'v');assert.equal(rows[1].response_definition_id,'d');});
