import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { load } from './offline-module.mjs';
import * as sharing from '../../lib/platform/response-sharing-policy.ts';
import * as responsePolicy from '../../lib/platform/response-library-policy.ts';
import { emptyPersonalImpactData, PERSONAL_IMPACT_RENDERER_KEY } from '../../lib/experiences/builder/personal-impact-statement.ts';

function database(rows,calls,failTable){
  return {from(table){let fields='*',single=false,limit=null;const filters=[];
    const query=new Proxy({}, {get(_,key){
      if(key==='then')return done=>{
        let data=rows[table]??[];
        for(const [kind,column,value] of filters)data=data.filter(row=>kind==='eq'?row[column]===value:kind==='in'?value.includes(row[column]):kind==='not'?row[column]!==value:true);
        if(limit!==null)data=data.slice(0,limit);
        if(fields!=='*')data=data.map(row=>Object.fromEntries(fields.split(',').map(field=>[field,row[field]])));
        calls.push({table,fields,filters});
        return Promise.resolve({data:single?data[0]??null:data,error:table===failTable?{message:'fixture failure'}:null}).then(done);
      };
      return(...args)=>{if(['insert','update','delete','upsert'].includes(key) && !(table==='admin_audit_log' && key==='insert'))throw Error('Unexpected write');if(key==='select')fields=args[0];if(key==='eq'||key==='in')filters.push([key,...args]);if(key==='not')filters.push([key,args[0],args[2]]);if(key==='limit')limit=args[0];if(key==='maybeSingle')single=true;return query;};
    }});return query;
  }};
}
function libraryFixture(){
  const calls=[],rows={participants:[{id:'a',auth_user_id:'auth-a',full_name:'Fixture A'},{id:'b',auth_user_id:'auth-b',full_name:'Fixture B'}],experience_enrollments:[{id:'enrollment-a',participant_id:'a',experience_id:'course-a',experience_version_id:'version-a'},{id:'enrollment-b',participant_id:'b',experience_id:'course-b',experience_version_id:'version-b'}],experiences:[{id:'course-a',name:'Owned A',slug:'course-a'},{id:'course-b',name:'Owned B',slug:'course-b'},{id:'lmu',name:'Life Mapping U',slug:'life-mapping-u'}],experience_versions:[{id:'version-a',version_label:'Version A'},{id:'version-b',version_label:'Version B'}],lmu_assessments:[]};
  let user={id:'auth-a',email:'a@example.test'},structures=0,locked=false;
  const db=database(rows,calls);
  const library=load('lib/platform/response-library.ts',{
    '@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},'./auth':{getPlatformUser:async()=>user},'./authorization':{},
    '@/lib/experiences/access/server':{needsExperiencePassword:async()=>locked},'@/lib/experiences/builder/data':{getExperienceStructure:async(id,version)=>{structures++;return {experience:{id,name:'Owned',slug:id},version:{version_label:version},modules:[]};}},
    '@/lib/experiences/builder/participant-runtime':{effectiveDeliveryStructure:async x=>x},'@/lib/experiences/builder/prebuilt-assessment':{},'./response-library-policy':{},'./response-sharing-policy':{},
  });return {library,calls,rows,structures:()=>structures,setUser:x=>user=x,setLocked:x=>locked=x};
}
test('Purpose Profile index is owner scoped and performs five metadata reads, without curriculum or answer bodies',async()=>{
  const f=libraryFixture();const index=await f.library.loadOwnResponseLibraryIndex();
  assert.equal(index.courses.length,1);assert.equal(index.courses[0].title,'Owned A');assert.equal(index.viewerAuthUserId,'auth-a');assert.equal(f.structures(),0);
  assert.equal(f.calls.length,5);assert.ok(f.calls.every(c=>c.fields!=='*'));
  assert.ok(!f.calls.some(c=>['participant_responses','lmu_responses','lmu_results','content_blocks','experience_enrollment_version_history'].includes(c.table)));
  f.setUser({id:'auth-b',email:'b@example.test'});const other=await f.library.loadOwnResponseLibraryIndex();assert.equal(other.courses[0].title,'Owned B');
  f.setUser(null);const before=f.calls.length;assert.equal(await f.library.loadOwnResponseLibraryIndex(),null);assert.equal(f.calls.length,before);
});
test('lazy own library cannot select another participant enrollment and rechecks password before answer reads',async()=>{
  const f=libraryFixture();const denied=await f.library.loadOwnResponseLibrary('enrollment-b');assert.equal(denied.courses.length,0);assert.equal(f.structures(),0);
  f.setLocked(true);const own=await f.library.loadOwnResponseLibrary('enrollment-a');assert.equal(own.courses.length,1);assert.equal(own.courses[0].locked,true);
  assert.ok(!f.calls.some(c=>['lmu_responses','lmu_results'].includes(c.table)));
  assert.ok(!f.calls.some(c=>c.table==='participant_responses'&&c.fields.includes('response_data')));
  f.setUser(null);assert.equal(await f.library.loadOwnResponseLibrary('enrollment-a'),null);
});
test('own response endpoint rejects invalid selection, signed-out access and failures with private no-store',async()=>{
  let result=null,fail=false,calls=0;
  const api=load('app/api/account/responses/route.ts',{'fixture':{URL},'next/server':{NextResponse:{json:(data,options)=>({data,...options})}},'@/lib/platform/response-library':{loadOwnResponseLibrary:async()=>{calls++;if(fail)throw Error('offline');return result;}}}, 'const {URL}=require("fixture");\n'+readFileSync('app/api/account/responses/route.ts','utf8'));
  assert.equal((await api.GET({url:'https://fixture.test/api?enrollment=bad'})).status,400);assert.equal(calls,0);
  const path={url:'https://fixture.test/api?enrollment=00000000-0000-0000-0000-000000000000'};
  const denied=await api.GET(path);assert.equal(denied.status,401);assert.equal(denied.headers['Cache-Control'],'private, no-store');
  fail=true;assert.equal((await api.GET(path)).status,503);fail=false;result={name:'Owner',courses:[]};const ready=await api.GET(path);assert.deepEqual(ready.data,result);assert.equal(ready.headers['Cache-Control'],'private, no-store');
});
test('My Journey skips unused network totals and Hub roster reads while retaining owner summaries',async()=>{
  const calls=[],db=database({},calls);
  const dashboard=load('lib/platform/dashboard.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},'@/lib/platform/auth':{getPlatformUser:async()=>({id:'auth',email:'fixture@example.test'}),ensurePlatformProfile:async()=>({participant:{id:'p'}})},'@/lib/platform/authorization':{resolveDashboardCapabilities:async()=>({isAdmin:true})},'@/lib/experiences/builder/course-configuration':{normalizeCourseConfiguration:()=>({card:{}})},'@/lib/experiences/builder/card-images':{courseCardImageIds:()=>[],courseCardImageUrl:()=>null,resolveCardImages:async()=>new Map()},'@/lib/platform/course-card':{},'./journey-policy':{completedJourneyRecords:()=>[]}});
  const result=await dashboard.getWayfinderDashboard({includeNetworkOverview:false});assert.equal(result.networkOverview,null);
  assert.ok(!calls.some(c=>c.table==='participants'||c.table==='admin_audit_log'));
  assert.ok(calls.some(c=>c.table==='experience_enrollments'&&c.filters.some(filter=>filter[1]==='participant_id'&&filter[2]==='p')));
});
test('lazy experience discards a closed request, retries with fresh data and aborts on unmount',async()=>{
  const slots=[],cleanups=[],reads=[];let cursor=0;
  const react={useState(initial){const n=cursor++;if(!(n in slots))slots[n]=initial;return [slots[n],value=>{slots[n]=value;}];},useRef(initial){const n=cursor++;if(!(n in slots))slots[n]={current:initial};return slots[n];},useEffect(setup){const n=cursor++;if(!(n in slots)){slots[n]=true;cleanups.push(setup());}}};
  const jsx=(type,props)=>({type,props});const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];
  let account={email:'a@example.test'},authUserId='auth-a';
  const source=readFileSync('components/platform/OwnSavedResponseLibrary.tsx','utf8').replace('function Experience(', 'export function Experience(');
  const component=load('components/platform/OwnSavedResponseLibrary.tsx',{react,'react/jsx-runtime':{jsx,jsxs:jsx},'./SavedResponseLibrary':{SavedResponseLibrary:'library'},'./WayfindersAuthProvider':{useWayfindersAuth:()=>({account,authUserId,ready:true})},fixture:{AbortController,window:{setTimeout:()=>1,clearTimeout(){}},fetch:(url,init)=>new Promise(resolve=>reads.push({url,signal:init.signal,resolve}))}},'const {AbortController,window,fetch}=require("fixture");\n'+source);
  const render=()=>{cursor=0;return component.Experience({course:{id:'owned',title:'Course',weeks:[]}});};
  const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  const toggle=(tree,open)=>{const target={open};tree.props.onToggle({target,currentTarget:target});};
  let tree=render();toggle(tree,true);assert.equal(reads.length,1);
  tree.props.onToggle({target:{open:true},currentTarget:{open:true}});assert.equal(reads.length,1,'nested toggles cannot reload the Experience');
  const visible=component.OwnSavedResponseLibrary({data:{courses:[]},viewerAuthUserId:'auth-a'});assert.equal(visible.type,'div');
  toggle(tree,false);assert.equal(reads[0].signal.aborted,true);
  toggle(tree,true);assert.equal(reads.length,2);
  reads[0].resolve({ok:true,json:async()=>({name:'STALE',courses:[]})});await settle();assert.ok(!nodes(render()).some(n=>n.type==='library'));
  reads[1].resolve({ok:true,json:async()=>({name:'CURRENT',courses:[]})});await settle();assert.equal(nodes(render()).find(n=>n.type==='library').props.data.name,'CURRENT');
  tree=render();toggle(tree,false);toggle(tree,true);assert.equal(reads.length,3,'reopening revalidates; no stale permission/data lease');
  cleanups.forEach(fn=>fn());assert.equal(reads[2].signal.aborted,true);reads[2].resolve({ok:true,json:async()=>({name:'LATE',courses:[]})});await settle();assert.ok(!nodes(render()).some(n=>n.type==='library'));
  account={email:'a@example.test'};authUserId='auth-b';const hidden=component.OwnSavedResponseLibrary({data:{name:'A',courses:[{id:'owned',title:'Course',weeks:[]}]},viewerAuthUserId:'auth-a'});assert.equal(hidden.type,'p');
});
test('large owned index batches label lookups at fifty IDs without reading answer bodies',async()=>{
  const f=libraryFixture();
  for(let n=0;n<60;n++){
    f.rows.experience_enrollments.push({id:`enrollment-${n}`,participant_id:'a',experience_id:`course-${n}`,experience_version_id:`version-${n}`});
    f.rows.experiences.push({id:`course-${n}`,name:`Course ${n}`,slug:`course-${n}`});f.rows.experience_versions.push({id:`version-${n}`,version_label:`Version ${n}`});
  }
  const result=await f.library.loadOwnResponseLibraryIndex();assert.equal(result.courses.length,61);assert.equal(f.structures(),0);
  const labels=f.calls.filter(c=>c.table==='experiences'||c.table==='experience_versions');assert.equal(labels.length,4);
  assert.ok(labels.every(c=>c.filters.find(filter=>filter[0]==='in')[2].length<=50));
});

function cohortFixture() {
 let authUserId='auth-viewer';const structureCalls=[];
 const calls=[],rows={participants:[{id:'viewer',auth_user_id:'auth-viewer'},{id:'member',auth_user_id:'auth-member',full_name:'Synthetic member'}],cohorts:[{id:'cohort',experience_id:'course',status:'active'}],cohort_memberships:[{cohort_id:'cohort',participant_id:'viewer',membership_role:'facilitator',status:'active'},{cohort_id:'cohort',participant_id:'member',status:'active'}],experience_enrollments:[{id:'enrollment',participant_id:'member',experience_id:'course',experience_version_id:'version',status:'in_progress'}],experience_offerings:[{id:'offering',cohort_id:'cohort',experience_id:'course',experience_version_id:'version',status:'active'}],response_definitions:[{id:'d1',experience_version_id:'version',block_id:'b1',response_key:'reflection',label:'Question one',configuration:{},raw_visibility:'participant_only',result_visibility:'participant_only',share_mode:'disabled'},{id:'d2',experience_version_id:'version',block_id:'b2',response_key:'reflection',label:'Question two',configuration:{},raw_visibility:'participant_only',result_visibility:'participant_only',share_mode:'disabled'}],participant_responses:[{id:'r1',participant_id:'member',enrollment_id:'enrollment',experience_version_id:'version',response_definition_id:'d1',response_data:{value:'Week one fixture'},status:'submitted'},{id:'r2',participant_id:'member',enrollment_id:'enrollment',experience_version_id:'version',response_definition_id:'d2',response_data:{value:'Week two fixture'},status:'submitted'}]};
 const structure={experience:{id:'course',name:'Synthetic course',slug:'fixture',experience_type:'course'},version:{version_label:'v1'},modules:['1','2'].map(n=>({id:`m${n}`,title:`Week ${n}`,lessons:[{title:'Lesson',sections:[{title:'Section',layout:{columns:[{blocks:[{id:`b${n}`,block_type:'reflection',custom_renderer_key:null}]}]}}]}]}))};
 const library=load('lib/platform/response-library.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>database(rows,calls)},'./auth':{getPlatformUser:async()=>({id:authUserId})},'./authorization':{getAuthorizationContext:async()=>({assignments:[],globalRole:'super_admin'})},'@/lib/experiences/access/server':{needsExperiencePassword:async()=>false},'@/lib/experiences/builder/data':{getExperienceStructure:async(id,version,db,blocks,target,moduleId)=>{structureCalls.push({id,moduleId});return id==='child'?{...structure,experience:{...structure.experience,id:'child',name:'Attached assessment',experience_type:'assessment'},modules:[{...structure.modules[0],id:'child-module',lessons:[{title:'Assessment',sections:[{title:'Answers',layout:{columns:[{blocks:moduleId&&moduleId!=='child-module'?[]:[{id:'child-block',block_type:'reflection',custom_renderer_key:null}]}]}}]}]}]}:structure;}},'@/lib/experiences/builder/participant-runtime':{effectiveDeliveryStructure:async x=>x},'@/lib/experiences/builder/prebuilt-assessment':{parsePrebuiltAssessmentConfiguration:c=>({ok:true,value:c})},'./response-library-policy':responsePolicy,'./response-sharing-policy':sharing});
 return {library,rows,calls,structure,structureCalls,setUser:id=>authUserId=id};
}
test('own-cohort facilitator sees all native response types, outline reads no bodies, expansion reads only selected week',async()=>{
 const f=cohortFixture();const outline=await f.library.loadCohortMemberResponses('cohort','member',{outline:true});
 assert.equal(outline.courses[0].weeks.length,2);assert.equal(outline.courses[0].weeks[0].activities.length,1);assert.ok(!f.calls.some(c=>c.table==='participant_responses'));
 const result=await f.library.loadCohortMemberResponses('cohort','member',{week:'version:m2'});
 assert.equal(result.courses[0].weeks.length,1);assert.equal(result.courses[0].weeks[0].activities[0].items[0].response,'Week two fixture');
 const read=f.calls.find(c=>c.table==='participant_responses');assert.deepEqual(read.filters.find(x=>x[1]==='response_definition_id')[2],['d2']);
});
test('revoked facilitator, unrelated cohort and global admin deny before body reads',async()=>{
 for(const change of [f=>{f.rows.cohort_memberships[0].membership_role='member';},f=>{f.rows.cohort_memberships[0].cohort_id='other';},f=>{f.rows.cohort_memberships[1].status='inactive';},f=>{f.rows.experience_offerings[0].experience_version_id='other';}]){
  const f=cohortFixture();change(f);await assert.rejects(f.library.loadCohortMemberResponses('cohort','member',{week:'version:m1'}));assert.ok(!f.calls.some(c=>c.table==='participant_responses'));
 }
});
test('cohort policy does not grant generic group sharing or incomplete cohort review',()=>{
 const a={viewerParticipantId:'viewer',respondentParticipantId:'member',cohortId:'cohort',experienceId:'course',enrollmentExperienceId:'course',activeEnrollment:true,activeRespondentMembership:true,assignedFacilitator:true,currentVersion:true};
 const d={raw_visibility:'participant_only',result_visibility:'participant_only',share_mode:'disabled'};
 assert.equal(sharing.canReadResponseContent(a,d,'raw'),false);
 assert.equal(sharing.canReadResponseContent({...a,cohortReviewAuthorized:true},d,'raw'),true);
 for(const flag of ['activeEnrollment','activeRespondentMembership','assignedFacilitator','currentVersion'])assert.equal(sharing.canReadResponseContent({...a,cohortReviewAuthorized:true,[flag]:false},d,'raw'),false);
});

test('weeks start closed; nested toggles never reload; reopening fetches fresh scoped responses',async()=>{
 const slots=[],cleanups=[],reads=[];let cursor=0;
 const react={useState(initial){const n=cursor++;if(!(n in slots))slots[n]=initial;return [slots[n],v=>slots[n]=v];},useRef(initial){const n=cursor++;if(!(n in slots))slots[n]={current:initial};return slots[n];},useEffect(setup){const n=cursor++;if(!(n in slots)){slots[n]=true;cleanups.push(setup());}}};
 const jsx=(type,props)=>({type,props});const source=readFileSync('components/platform/SavedResponseLibrary.tsx','utf8').replace('function SavedWeek(', 'export function SavedWeek(');
 const component=load('components/platform/SavedResponseLibrary.tsx',{react,'react/jsx-runtime':{jsx,jsxs:jsx},fixture:{AbortController,window:{setTimeout:()=>1,clearTimeout(){}},fetch:(url,init)=>new Promise(resolve=>reads.push({url,signal:init.signal,resolve}))}},'const {AbortController,window,fetch}=require("fixture");\n'+source);
 const render=()=>{cursor=0;return component.SavedWeek({week:{id:'module',title:'Week',activities:[]},versionId:'version',endpoint:'/api/account/responses?enrollment=owned'});};
 const toggle=(tree,open)=>{const target={open};tree.props.onToggle({target,currentTarget:target});};
 const tree=render();assert.equal(tree.props.open,undefined);assert.equal(reads.length,0);
 toggle(tree,true);assert.equal(reads[0].url,'/api/account/responses?enrollment=owned&week=version%3Amodule');
 tree.props.onToggle({target:{open:true},currentTarget:{open:true}});assert.equal(reads.length,1);
 toggle(tree,false);assert.equal(reads[0].signal.aborted,true);toggle(tree,true);assert.equal(reads.length,2);
 cleanups.forEach(fn=>fn());assert.equal(reads[1].signal.aborted,true);
});

test('facilitator attached assessments require exact parent/block/owner binding; standalone enrollment cannot substitute',async()=>{
 for(const attached of [false,true]){
 const f=cohortFixture();f.structure.modules[1].lessons[0].sections[0].layout.columns[0].blocks.push({id:'attachment-block',block_type:'prebuilt_assessment',configuration:{assessmentExperienceId:'child',title:'Attached assessment'}});
 f.rows.experiences=[{id:'child',experience_type:'assessment',name:'Child',slug:'child',current_published_version_id:'child-version'}];
 f.rows.experience_enrollments.push({id:'child-enrollment',participant_id:'member',experience_id:'child',experience_version_id:'child-version',status:'completed'});
 f.rows.response_definitions.push({id:'child-definition',experience_version_id:'child-version',block_id:'child-block',response_key:'reflection',label:'Assessment response'});
 f.rows.participant_responses.push({id:'child-response',participant_id:'member',enrollment_id:'child-enrollment',experience_version_id:'child-version',response_definition_id:'child-definition',response_data:{value:'Bound assessment fixture'},status:'submitted'});
 f.rows.response_definitions.push({id:'legacy-definition',experience_version_id:'version',block_id:'attachment-block',response_key:'reflection',label:'Attached Assessment',raw_visibility:'participant_only',result_visibility:'participant_only',share_mode:'disabled'});
 f.rows.participant_responses.push({id:'legacy-response',participant_id:'member',enrollment_id:'enrollment',experience_version_id:'version',response_definition_id:'legacy-definition',response_data:{value:'Legacy saved fixture'},status:'submitted'});
 const outline=await f.library.loadCohortMemberResponses('cohort','member',{outline:true});assert.equal(outline.courses[0].weeks[1].activities.length,2,'one native question and one assessment; retained definition and attachment cannot duplicate the outline');
 f.rows.embedded_assessment_attempts=attached?[{participant_id:'member',parent_enrollment_id:'enrollment',parent_content_block_id:'attachment-block',assessment_experience_id:'child',assessment_enrollment_id:'child-enrollment'}]:[];
 const result=await f.library.loadCohortMemberResponses('cohort','member',{week:'version:m2'});
 const activities=result.courses[0].weeks[0].activities;assert.equal(activities.length,2);
 assert.equal(activities[1].items.length,attached?2:1);
 assert.equal(activities[1].title,"Attached Assessment");assert.equal(activities[1].status,"submitted");assert.ok(activities[1].items.some(row=>row.response==="Legacy saved fixture"));
 const childReads=f.calls.filter(c=>c.table==='participant_responses'&&c.filters.some(x=>x[1]==='enrollment_id'&&x[2]==='child-enrollment'));assert.equal(childReads.length,attached?1:0);
 const binding=f.calls.find(c=>c.table==='embedded_assessment_attempts');assert.deepEqual(binding.filters.map(x=>x[1]),['participant_id','parent_enrollment_id','parent_content_block_id','assessment_experience_id']);
 }
});

test('one completed Personal Impact Statement appears in its course, separate profile entry and facilitator review despite different module IDs',async()=>{
 const f=cohortFixture();
 f.structure.modules[1].lessons[0].sections[0].layout.columns[0].blocks.push({id:'attachment-block',block_type:'prebuilt_assessment',configuration:{assessmentExperienceId:'child',title:'Attached assessment'}});
 f.rows.experiences=[{id:'course',experience_type:'course',name:'Synthetic course',slug:'course'},{id:'child',experience_type:'assessment',name:'Attached assessment',slug:'child',current_published_version_id:'child-version'}];
 f.rows.experience_versions=[{id:'version',version_label:'Course'},{id:'child-version',version_label:'Assessment'}];
 f.rows.experience_enrollments.push({id:'child-enrollment',participant_id:'member',experience_id:'child',experience_version_id:'child-version',status:'completed'});
 f.rows.response_definitions.push({id:'child-definition',experience_version_id:'child-version',block_id:'child-block',response_key:'personal_impact_statement',label:'Personal Impact Statement'});
 f.rows.participant_responses.push({id:'child-response',participant_id:'member',enrollment_id:'child-enrollment',experience_version_id:'child-version',response_definition_id:'child-definition',response_data:{finished:{schemaVersion:1,sourceVersion:PERSONAL_IMPACT_RENDERER_KEY,completedAt:'2026-10-12T12:00:00Z',participantMaterial:{...Object.fromEntries(Object.keys(emptyPersonalImpactData()).map(key=>[key,'Synthetic reflection'])),causes:['Education'],causes_other:'',final_impact_statement:'Same saved assessment'}}},status:'submitted',finalized_at:'2026-10-12T12:00:00Z'});
 f.rows.embedded_assessment_attempts=[{participant_id:'member',parent_enrollment_id:'enrollment',parent_content_block_id:'attachment-block',assessment_experience_id:'child',assessment_enrollment_id:'child-enrollment'}];
 f.setUser('auth-member');
 const index=await f.library.loadOwnResponseLibraryIndex();assert.deepEqual(index.courses.map(c=>c.title),['Synthetic course','Attached assessment']);
 const ownCourse=await f.library.loadOwnResponseLibrary('enrollment',{week:'version:m2'});
 const ownCohort=await f.library.loadCohortMemberResponses('cohort','member',{week:'version:m2'});
 const standalone=await f.library.loadOwnResponseLibrary('child-enrollment',{week:'child-version:child-module'});
 f.setUser('auth-viewer');const facilitator=await f.library.loadCohortMemberResponses('cohort','member',{week:'version:m2'});
 const texts=data=>data.courses.flatMap(c=>c.weeks.flatMap(w=>w.activities.flatMap(a=>a.items.map(i=>i.response))));
 for(const result of [ownCourse,ownCohort,standalone,facilitator]) {
 assert.ok(texts(result).includes('Same saved assessment'));
 assert.ok(result.courses.flatMap(c=>c.weeks.flatMap(w=>w.activities)).some(a=>a.status==='submitted'&&a.items.some(r=>r.response==='Same saved assessment'&&/Personal Impact Statement/.test(r.question))),'the completed PIS statement and submitted status are retained');
 }
 assert.ok(texts(ownCourse).includes('Week two fixture'),'native cohort responses also remain in the profile course');
 assert.ok(f.structureCalls.filter(c=>c.id==='child').every(c=>!c.moduleId||c.moduleId==='child-module'),'parent module filters must never reach child assessment hydration');
});

test('Journey cards use current custom-code artwork even when a completed enrollment has older version settings', async()=>{
  const calls=[];
  const current={card:{image_resource_id:'uploaded-jpeg'}};
  const previous={card:{image_resource_id:'old-image'}};
  const rows={
    experience_enrollments:[{id:'completed',participant_id:'p',experience_id:'bridges',experience_version_id:'old-version',status:'completed'}],
    experiences:[{id:'bridges',name:'Bridges vs. Barriers',delivery_mode:'custom_code',card_configuration:current}],
    experience_versions:[{id:'old-version',experience_id:'bridges',course_configuration:previous}],
  };
  const db=database(rows,calls);
  const configurations=[];
  const dashboard=load('lib/platform/dashboard.ts',{
    '@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},
    '@/lib/platform/auth':{getPlatformUser:async()=>({id:'auth'}),ensurePlatformProfile:async()=>({participant:{id:'p'}})},
    '@/lib/platform/authorization':{resolveDashboardCapabilities:async()=>({isAdmin:false})},
    '@/lib/experiences/builder/course-configuration':{normalizeCourseConfiguration:x=>x??{card:{}}},
    '@/lib/experiences/builder/card-images':{
      courseCardImageIds:configuration=>{configurations.push(configuration);return [configuration.card.image_resource_id];},
      courseCardImageUrl:(images,ids)=>images.get(ids[0]),
      resolveCardImages:async(_db,ids)=>new Map(ids.map(id=>[id,`https://fixture.test/${id}.jpg`])),
    },
    '@/lib/platform/course-card':{resolveCourseCard:input=>({imageUrl:input.cardImageUrl,configuration:input.configuration})},
    './journey-policy':{completedJourneyRecords:()=>[]},
  });
  const result=await dashboard.getWayfinderDashboard({includeNetworkOverview:false});
  assert.equal(result.trainingCards.completed.imageUrl,'https://fixture.test/uploaded-jpeg.jpg');
  assert.deepEqual(result.trainingCards.completed.configuration,current);
  assert.deepEqual(configurations,[current]);
  rows.experiences[0].delivery_mode='builder';
  const builder=await dashboard.getWayfinderDashboard({includeNetworkOverview:false});
  assert.equal(builder.trainingCards.completed.imageUrl,'https://fixture.test/old-image.jpg');
});

test('completed builder cards use current published artwork while retaining enrollment version',async()=>{
  const dbRows={experience_enrollments:[{id:'completed',participant_id:'p',experience_id:'bridges',experience_version_id:'old',status:'completed'}],experiences:[{id:'bridges',delivery_mode:'builder',current_published_version_id:'current'}],experience_versions:[{id:'old',experience_id:'bridges',course_configuration:{card:{}}},{id:'current',experience_id:'bridges',status:'published',course_configuration:{card:{image_resource_id:'jpeg'}}}]};
  const db=database(dbRows,[]);
  const dashboard=load('lib/platform/dashboard.ts',{
    '@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},
    '@/lib/platform/auth':{getPlatformUser:async()=>({id:'auth'}),ensurePlatformProfile:async()=>({participant:{id:'p'}})},
    '@/lib/platform/authorization':{resolveDashboardCapabilities:async()=>({isAdmin:false})},
    '@/lib/experiences/builder/course-configuration':{normalizeCourseConfiguration:x=>x??{card:{}}},
    '@/lib/experiences/builder/card-images':{courseCardImageIds:x=>x?.card.image_resource_id?[x.card.image_resource_id]:[],courseCardImageUrl:(images,ids)=>images.get(ids[0]),resolveCardImages:async(_db,ids)=>new Map(ids.map(id=>[id,`https://fixture.test/${id}.jpg`]))},
    '@/lib/platform/course-card':{resolveCourseCard:x=>({imageUrl:x.cardImageUrl})},
    './journey-policy':{completedJourneyRecords:()=>[]},
  });
  const result=await dashboard.getWayfinderDashboard({includeNetworkOverview:false});
  assert.equal(result.trainingCards.completed.imageUrl,'https://fixture.test/jpeg.jpg');
  assert.equal(result.enrollments[0].experience_version_id,'old');
});
