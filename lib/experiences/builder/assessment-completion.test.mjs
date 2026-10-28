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
const {savePersonalImpactStatement}=await import('./personal-impact-statement-mutations.ts');
const {saveStartSomething}=await import('./start-something-mutations.ts');
const {PERSONAL_IMPACT_FIELDS,normalizePersonalImpactData}=await import('./personal-impact-statement.ts');
const {emptyStartSomethingData}=await import('./start-something.ts');
const {persistAssessmentResponse,confirmAssessmentCompletion}=await import('./assessment-response-save.ts');
const args=['fixture','module','lesson','section','block',null];
function pis(){const draft=normalizePersonalImpactData({});for(const key of PERSONAL_IMPACT_FIELDS)if(key!=='causes')draft[key]='Fixture answer';draft.causes=['Education'];return draft;}
function ready(renderer){return {status:'ready',enrollmentId:'e',participantId:'p',responses:{b:{definition:{id:'d',response_type:'structured_response',is_required:true},response:null}},structure:{version:{id:'v'},modules:[{module_key:'module',lessons:[{lesson_key:'lesson',sections:[{section_key:'section',layout:{columns:[{blocks:[{id:'b',block_key:'block',block_type:'custom_component',custom_renderer_key:renderer,status:'active',visibility:'visible'}]}]}}]}]}]}};}
beforeEach(()=>{rows=[];enrollment={id:'e',participant_id:'p',experience_version_id:'v',status:'enrolled',completed_at:null};course=ready('personal-impact-statement.v1');failWrite=false;failCompletion=false;visits=0;writes=0;});
test('fully answered PIS autosave persists only a private draft',async()=>{await savePersonalImpactStatement(...args,pis());assert.equal(rows[0].status,'draft');assert.equal(rows[0].response_data.finished,null);assert.equal(enrollment.status,'enrolled');});
test('invalid PIS final response creates no snapshot or progress',async()=>{await assert.rejects(savePersonalImpactStatement(...args,{},true));assert.equal(writes,0);assert.equal(visits,0);});
test('Other requires an explanation on the server',async()=>{await assert.rejects(savePersonalImpactStatement(...args,{...pis(),causes:['Other'],causes_other:''},true));assert.equal(writes,0);});
test('explicit PIS finish saves snapshot and confirms canonical completion',async()=>{const result=await savePersonalImpactStatement(...args,pis(),true);assert.ok(result.completedAt);assert.equal(rows[0].status,'submitted');assert.equal(enrollment.status,'completed');});
test('save failure never visits, completes, or reports success',async()=>{failWrite=true;await assert.rejects(savePersonalImpactStatement(...args,pis(),true));assert.equal(rows.length,0);assert.equal(visits,0);assert.equal(enrollment.status,'enrolled');});
test('completion failure can retry the original immutable snapshot',async()=>{failCompletion=true;await assert.rejects(savePersonalImpactStatement(...args,pis(),true),/completion could not be confirmed/);const first=structuredClone(rows[0].response_data.finished);failCompletion=false;await savePersonalImpactStatement(...args,{...pis(),final_impact_statement:'Changed'},true);assert.deepEqual(rows[0].response_data.finished,first);assert.equal(enrollment.status,'completed');});
test('concurrent repeated finishes create one response and one immutable result',async()=>{await Promise.all([savePersonalImpactStatement(...args,pis(),true),savePersonalImpactStatement(...args,pis(),true)]);assert.equal(rows.length,1);const snapshot=structuredClone(rows[0].response_data.finished);await savePersonalImpactStatement(...args,{...pis(),final_impact_statement:'Edited draft'});assert.deepEqual(rows[0].response_data.finished,snapshot);});
test('late draft concurrent with finish cannot erase the result',async()=>{await Promise.all([savePersonalImpactStatement(...args,pis(),true),savePersonalImpactStatement(...args,{...pis(),final_impact_statement:'Later'})]);assert.ok(rows[0].response_data.finished);assert.equal(rows[0].status,'submitted');});
test('unauthorized or preview resolution creates no participant response',async()=>{course.status='preview';await assert.rejects(savePersonalImpactStatement(...args,pis(),true));assert.equal(writes,0);});
test('response reads and writes do not select another participant',async()=>{rows=[{id:'other',participant_id:'other',enrollment_id:'other-e',experience_version_id:'v',response_definition_id:'d',response_data:{private:'secret'},updated_at:'2026-01-01'}];await savePersonalImpactStatement(...args,pis());assert.deepEqual(rows[0].response_data,{private:'secret'});assert.equal(rows[1].participant_id,'p');});
test('canonical confirmation refuses another participant or version',async()=>{await assert.rejects(confirmAssessmentCompletion('other','e','v'));enrollment.status='completed';enrollment.completed_at='2026-10-02';await assert.rejects(confirmAssessmentCompletion('p','e','other-version'));});
test('Start Something Save Draft is not completion; optional answers can explicitly finish',async()=>{course=ready('start-something.v1');await saveStartSomething(...args,emptyStartSomethingData(),false);assert.equal(rows[0].response_data.finished,null);await saveStartSomething(...args,emptyStartSomethingData(),true);assert.equal(enrollment.status,'completed');});
test('Start Something edits and repeated finish preserve the original completed material',async()=>{course=ready('start-something.v1');const first=emptyStartSomethingData();first.idea.idea_summary='First';await saveStartSomething(...args,first,true);const snapshot=structuredClone(rows[0].response_data.finished);first.idea.idea_summary='Edited';await saveStartSomething(...args,first,true);assert.deepEqual(rows[0].response_data.finished,snapshot);});
test('compare-and-swap returns an actionable error when a response keeps changing',async()=>{const original=db.from;db.from=(table)=>{const query=original(table);const update=query.update;query.update=(value)=>{const result=update(value);rows[0].updated_at=String(Math.random());return result;};return query;};rows=[{id:'r',participant_id:'p',enrollment_id:'e',experience_version_id:'v',response_definition_id:'d',response_data:{},finalized_at:null,updated_at:'2026-01-01'}];try{await assert.rejects(persistAssessmentResponse({participantId:'p',enrollmentId:'e',versionId:'v',definitionId:'d'},()=>{rows[0].updated_at=String(Math.random());return {finished:null};}),/changed while saving/);}finally{db.from=original;}});

const {saveApestAssessment}=await import('./apest-mutations.ts');
const {APEST_QUESTIONS}=await import('./apest.ts');
function apestReady(){course=ready('apest-assessment.v1');course.responses.b.definition.response_key='apest_assessment';}
const apestArgs=['apest','module','lesson','section','block',null];
const apestAnswers=()=>Object.fromEntries(APEST_QUESTIONS.map(q=>[q.key,2.5]));
test('APEST full autosave stays draft; explicit finish saves five scores and confirms completion',async()=>{
 apestReady();await saveApestAssessment(...apestArgs,{answers:apestAnswers()});assert.equal(rows[0].status,'draft');assert.equal(enrollment.status,'enrolled');
 const saved=await saveApestAssessment(...apestArgs,{answers:apestAnswers()},true);assert.ok(saved.completedAt);assert.equal(enrollment.status,'completed');assert.deepEqual(rows[0].response_data.finished.scores,{A:12.5,P:12.5,E:12.5,S:12.5,T:12.5});
});
test('APEST rejects incomplete completion, wrong definition, and unauthorized resolution before any write',async()=>{
 apestReady();await assert.rejects(saveApestAssessment(...apestArgs,{answers:{q1:2.5}},true));assert.equal(writes,0);
 course.responses.b.definition.response_key='other';await assert.rejects(saveApestAssessment(...apestArgs,{answers:apestAnswers()},true));assert.equal(writes,0);
 course.status='signed_out';await assert.rejects(saveApestAssessment(...apestArgs,{answers:apestAnswers()},true));assert.equal(writes,0);
});
test('APEST retries completion failure using the same durable snapshot',async()=>{
 apestReady();failCompletion=true;await assert.rejects(saveApestAssessment(...apestArgs,{answers:apestAnswers()},true),/completion could not be confirmed/);
 const snapshot=structuredClone(rows[0].response_data.finished);failCompletion=false;await saveApestAssessment(...apestArgs,{answers:apestAnswers()},true);assert.deepEqual(rows[0].response_data.finished,snapshot);assert.equal(enrollment.status,'completed');
});
test('APEST retake draft retains old finalized result; explicit retake keeps its history',async()=>{
 apestReady();const old=await saveApestAssessment(...apestArgs,{answers:apestAnswers()},true);
 await saveApestAssessment(...apestArgs,{answers:{q1:1}},false,old.completedAt);assert.equal(rows[0].finalized_at,old.completedAt);
 const next=Object.fromEntries(APEST_QUESTIONS.map(q=>[q.key,1]));await saveApestAssessment(...apestArgs,{answers:next},true,old.completedAt);
 assert.equal(rows[0].response_data.history.length,1);assert.equal(rows[0].response_data.history[0].scores.A,12.5);assert.equal(rows[0].response_data.finished.scores.A,5);
});
test('APEST failed persistence cannot complete enrollment or expose saved results',async()=>{
 apestReady();failWrite=true;await assert.rejects(saveApestAssessment(...apestArgs,{answers:apestAnswers()},true));assert.equal(rows.length,0);assert.equal(visits,0);assert.equal(enrollment.status,'enrolled');
});

test('APEST retake can retry enrollment confirmation without duplicating history',async()=>{
 apestReady();const old=await saveApestAssessment(...apestArgs,{answers:apestAnswers()},true);
 const next=Object.fromEntries(APEST_QUESTIONS.map(q=>[q.key,1]));enrollment.status='in_progress';enrollment.completed_at=null;failCompletion=true;
 await assert.rejects(saveApestAssessment(...apestArgs,{answers:next},true,old.completedAt),/completion could not be confirmed/);
 const snapshot=structuredClone(rows[0].response_data.finished);failCompletion=false;
 await saveApestAssessment(...apestArgs,{answers:next},true,old.completedAt);assert.deepEqual(rows[0].response_data.finished,snapshot);assert.equal(rows[0].response_data.history.length,1);assert.equal(enrollment.status,'completed');
});

const {saveFiveVoicesAssessment}=await import('./five-voices-mutations.ts');
const {FIVE_VOICES_QUESTIONS}=await import('./five-voices.ts');
const voicesArgs=['five-voices','module','lesson','section','block',null];
const voicesAnswers=()=>Object.fromEntries(FIVE_VOICES_QUESTIONS.map(q=>[q.key,2.5]));
function voicesReady(){course=ready('five-voices-assessment.v1');course.responses.b.definition.response_key='five_voices_assessment';}
test('Five Voices saves a draft before explicit finish and computes all five voice scores',async()=>{
 voicesReady();await saveFiveVoicesAssessment(...voicesArgs,{answers:voicesAnswers()});assert.equal(rows[0].status,'draft');assert.equal(enrollment.status,'enrolled');
 await saveFiveVoicesAssessment(...voicesArgs,{answers:voicesAnswers()},true);assert.equal(enrollment.status,'completed');assert.deepEqual(rows[0].response_data.finished.scores,{nurturer:12.5,creative:12.5,guardian:12.5,connector:12.5,pioneer:12.5});
});
test('Five Voices rejects incomplete, unauthorized and mismatched definition requests before saving',async()=>{
 voicesReady();await assert.rejects(saveFiveVoicesAssessment(...voicesArgs,{answers:{q1:2.5}},true));assert.equal(writes,0);
 course.responses.b.definition.response_key='apest_assessment';await assert.rejects(saveFiveVoicesAssessment(...voicesArgs,{answers:voicesAnswers()},true));assert.equal(writes,0);
 course.status='signed_out';await assert.rejects(saveFiveVoicesAssessment(...voicesArgs,{answers:voicesAnswers()},true));assert.equal(writes,0);
});
test('Five Voices retakes retain history and can retry completion without duplicating results',async()=>{
 voicesReady();const old=await saveFiveVoicesAssessment(...voicesArgs,{answers:voicesAnswers()},true);
 await saveFiveVoicesAssessment(...voicesArgs,{answers:{q1:1}},false,old.completedAt);assert.equal(rows[0].finalized_at,old.completedAt);
 const next=Object.fromEntries(FIVE_VOICES_QUESTIONS.map(q=>[q.key,1]));enrollment.status='in_progress';enrollment.completed_at=null;failCompletion=true;
 await assert.rejects(saveFiveVoicesAssessment(...voicesArgs,{answers:next},true,old.completedAt),/completion could not be confirmed/);
 const snapshot=structuredClone(rows[0].response_data.finished);failCompletion=false;
 await saveFiveVoicesAssessment(...voicesArgs,{answers:next},true,old.completedAt);assert.deepEqual(rows[0].response_data.finished,snapshot);assert.equal(rows[0].response_data.history.length,1);assert.equal(enrollment.status,'completed');
});
test('Five Voices failed save cannot record completion',async()=>{
 voicesReady();failWrite=true;await assert.rejects(saveFiveVoicesAssessment(...voicesArgs,{answers:voicesAnswers()},true));assert.equal(rows.length,0);assert.equal(visits,0);assert.equal(enrollment.status,'enrolled');
});

const {saveEmotionalHealthAssessment}=await import('./emotional-health-mutations.ts');
const {EMOTIONAL_HEALTH_QUESTIONS}=await import('./emotional-health.ts');
function emotionalHealthReady(){course=ready('emotional-health-assessment.v1');course.responses.b.definition.response_key='emotional_health_assessment';}
const emotionalHealthArgs=['emotional-health','module','lesson','section','block',null];
const emotionalHealthAnswers=()=>Object.fromEntries(EMOTIONAL_HEALTH_QUESTIONS.map(q=>[q.key,3]));
test('Emotional Health full autosave stays draft; explicit finish saves four scores and confirms completion',async()=>{
 emotionalHealthReady();await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()});assert.equal(rows[0].status,'draft');assert.equal(enrollment.status,'enrolled');
 const saved=await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true);assert.ok(saved.completedAt);assert.equal(enrollment.status,'completed');assert.deepEqual(rows[0].response_data.finished.scores,{self_awareness:30,self_management:30,social_awareness:30,relationship_management:30});
});
test('Emotional Health rejects incomplete completion, wrong definition, and unauthorized resolution before any write',async()=>{
 emotionalHealthReady();await assert.rejects(saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:{q1:3}},true));assert.equal(writes,0);
 course.responses.b.definition.response_key='other';await assert.rejects(saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true));assert.equal(writes,0);
 course.status='signed_out';await assert.rejects(saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true));assert.equal(writes,0);
});
test('Emotional Health retries completion failure using the same durable snapshot',async()=>{
 emotionalHealthReady();failCompletion=true;await assert.rejects(saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true),/completion could not be confirmed/);
 const snapshot=structuredClone(rows[0].response_data.finished);failCompletion=false;await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true);assert.deepEqual(rows[0].response_data.finished,snapshot);assert.equal(enrollment.status,'completed');
});
test('Emotional Health retake draft retains old finalized result; explicit retake keeps its history',async()=>{
 emotionalHealthReady();const old=await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true);
 await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:{q1:1}},false,old.completedAt);assert.equal(rows[0].finalized_at,old.completedAt);
 const next=Object.fromEntries(EMOTIONAL_HEALTH_QUESTIONS.map(q=>[q.key,1]));await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:next},true,old.completedAt);
 assert.equal(rows[0].response_data.history.length,1);assert.equal(rows[0].response_data.history[0].scores.self_awareness,30);assert.equal(rows[0].response_data.finished.scores.self_awareness,10);
});
test('Emotional Health failed persistence cannot complete enrollment or expose saved results',async()=>{
 emotionalHealthReady();failWrite=true;await assert.rejects(saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true));assert.equal(rows.length,0);assert.equal(visits,0);assert.equal(enrollment.status,'enrolled');
});

test('Emotional Health retake can retry enrollment confirmation without duplicating history',async()=>{
 emotionalHealthReady();const old=await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:emotionalHealthAnswers()},true);
 const next=Object.fromEntries(EMOTIONAL_HEALTH_QUESTIONS.map(q=>[q.key,1]));enrollment.status='in_progress';enrollment.completed_at=null;failCompletion=true;
 await assert.rejects(saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:next},true,old.completedAt),/completion could not be confirmed/);
 const snapshot=structuredClone(rows[0].response_data.finished);failCompletion=false;
 await saveEmotionalHealthAssessment(...emotionalHealthArgs,{answers:next},true,old.completedAt);assert.deepEqual(rows[0].response_data.finished,snapshot);assert.equal(rows[0].response_data.history.length,1);assert.equal(enrollment.status,'completed');
});
