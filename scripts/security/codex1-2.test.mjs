import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from '../performance/offline-module.mjs';
import { csvCell } from '../../lib/admin/wayfinders/export-csv.ts';

// No real clients, route/page execution, process/env, timers or network.
const policy = load('lib/platform/effective-access-policy.ts', {});
const directory = load('lib/platform/hub-directory.ts', { './effective-access-policy': policy });
const ok = data => ({ data, error: null });
function fakeDb(handler) {
  const queries=[];
  return { queries, from(table) {
    const q={table,calls:[]};queries.push(q);const b={};
    for(const m of ['select','eq','in','order','limit','not','neq','is','single','maybeSingle','insert','update','delete']) b[m]=(...args)=>{q.calls.push([m,...args]);return b;};
    b.then=(resolve,reject)=>Promise.resolve().then(()=>handler(q)).then(result=>q.calls.some(([method,,options])=>method==="select"&&options?.count==="exact")&&result.count===undefined?{...result,count:Array.isArray(result.data)?result.data.length:null}:result).then(resolve,reject);
    return b;
  }};
}
const has=(q,m,k,v)=>q.calls.some(([method,key,value])=>method===m&&(k===undefined||key===k)&&(v===undefined||value===v));
const snapshot = (patch={}) => ({ authUserId:'auth',isActiveMember:true,isSuperAdmin:false,roles:[{ key:'hub_leader',scope:{type:'hub',id:'hub'} }],rolePermissions:new Map([['hub_leader',new Set(['hub.view','wayfinder.view'])]]),roleEntitlements:new Map(),permissionOverrides:[],entitlementOverrides:new Map(),...patch });
function directoryFixture({ status='active', leader=false, otherHub=false, error=null, rejected=false, incomplete=false, globalRole=null }={}) {
  const db=fakeDb(q=>{
    if(rejected) throw Error('transport detail');
    const data=q.table==='participants' ? has(q,'eq','auth_user_id') ? {id:'person'} : incomplete ? [] : [{id:'person',full_name:'Minimal Name',first_name:'Minimal'}] : has(q,'eq','participant_id') ? status===null ? null : { participant_id:'person',hub_id:otherHub?'other':'hub',status } : [{participant_id:'person'}];
    return {data,error:q.table===error?{message:'sensitive'}:null};
  });
  const context={authUserId:'auth',globalRole,assignments:leader?[{role:'hub_leader',scope_type:'hub',scope_id:otherHub?'other':'hub'}]:[]};
  return {db,run:()=>directory.loadHubDirectory(db,'hub','auth',context,snapshot())};
}
for(const status of [null,'pending','invited','withdrawn','suspended']) test(`directory denies ${status??'nonmember'} before roster/name query`,async()=>{
  const f=directoryFixture({status});assert.equal(await f.run(),null);assert.equal(f.db.queries.length,2);
});
test('cross-Hub membership and cross-Hub leader deny',async()=>{
  for(const leader of [false,true]){const f=directoryFixture({otherHub:true,leader});assert.equal(await f.run(),null);assert.equal(f.db.queries.length,2);}
});
for(const globalRole of ['admin','super_admin']) test(`directory ${globalRole} label alone gives no grant`,async()=>{
  const f=directoryFixture({status:null,globalRole});assert.equal(await f.run(),null);
});
test('anonymous directory reads no database',async()=>{
  const db=fakeDb(()=>{throw Error('unexpected read');});assert.equal(await directory.loadHubDirectory(db,'hub',null,null,null),null);assert.equal(db.queries.length,0);
});
test('active exact member receives minimal names only',async()=>{
  const f=directoryFixture();assert.equal((await f.run())[0].full_name,'Minimal Name');
  assert.equal(f.db.queries.at(-1).calls[0][1],'id,full_name,first_name');
});
test('explicit exact leader without membership receives names; withdrawn leader does not',async()=>{
  assert.equal((await directoryFixture({status:null,leader:true}).run()).length,1);
  assert.equal(await directoryFixture({status:'withdrawn',leader:true}).run(),null);
});
for(const error of ['participants','hub_memberships']) test(`directory partial ${error} error rejects`,async()=>{
  const f=directoryFixture({error});await assert.rejects(f.run());
});
test('directory rejected lookup and incomplete names fail closed',async()=>{
  await assert.rejects(directoryFixture({rejected:true}).run());await assert.rejects(directoryFixture({incomplete:true}).run(),/incomplete/);
});
test('revoked leader and mismatched identity cannot reuse scope',async()=>{
  const db=fakeDb(q=>ok(q.table==='participants'?{id:'person'}:null));
  assert.equal(await directory.loadHubDirectory(db,'hub','auth',{authUserId:'auth',assignments:[],globalRole:null},snapshot()),null);
  assert.equal(await directory.loadHubDirectory(db,'hub','other',{authUserId:'auth',assignments:[],globalRole:null},snapshot()),null);
});
test('ordinary explicit Hub deny defeats leader directory permission',async()=>{
  const db=fakeDb(q=>ok(q.table==='participants'?{id:'person'}:null));
  assert.equal(await directory.loadHubDirectory(db,'hub','auth',{authUserId:'auth',assignments:[{role:'hub_leader',scope_type:'hub',scope_id:'hub'}],globalRole:null},snapshot({permissionOverrides:[{key:'hub.view',effect:'deny',scope:{type:'hub',id:'hub'}}]})),null);
});
for(const superAdmin of [false,true]) test(`contact authority is independent of inherited roles / Super Admin=${superAdmin}`,()=>{
  assert.equal(directory.canReadHubContacts(snapshot({isSuperAdmin:superAdmin}),'hub'),false);
  const allow={key:'wayfinder.view',effect:'allow',scope:{type:'hub',id:'hub'}};
  assert.equal(directory.canReadHubContacts(snapshot({isSuperAdmin:superAdmin,permissionOverrides:[allow]}),'hub'),true);
  assert.equal(directory.canReadHubContacts(snapshot({isSuperAdmin:superAdmin,permissionOverrides:[allow]}),'other'),false);
  assert.equal(directory.canReadHubContacts(snapshot({isSuperAdmin:superAdmin,permissionOverrides:[allow,{...allow,effect:'deny'}]}),'hub'),false);
});
for(const assignment of [{role:'course_creator',scope_type:'experience',scope_id:null},{role:'hub_leader',scope_type:'global',scope_id:'hub'},{role:'made-up',scope_type:'hub',scope_id:'hub'}]) test(`direct authorization rejects malformed ${assignment.role}/${assignment.scope_type}`,async()=>{
  const db=fakeDb(q=>ok(q.table==='admin_members'?{role:'super_admin'}:[assignment]));
  const mod=load('lib/platform/authorization.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},'@/lib/platform/auth':{}});
  await assert.rejects(mod.getAuthorizationContext('auth'),/Access could not be verified/);
});
function exportFixture({admin=true,auditFail=false,unexpected=false}={}) {
  let loads=0,audits=0;
  const row={id:'record',kind:'course',title:'Course',status:'completed',enrolledAt:'start',completedAt:'finish',versionId:'version',historical:false,response_data:'PRIVATE ANSWER',result_data:'PRIVATE RESULT',email:'PRIVATE CONTACT',artifact_snapshot:'PRIVATE SNAPSHOT'};
  const mod=load('lib/admin/wayfinders/operational-export.ts',{'@/lib/admin/auth':{getAdmin:async()=>admin?{id:'admin'}:null,auditSecurityEvent:async()=>{audits++;if(auditFail)throw Error('audit unavailable');}},'./journey':{loadWayfinderJourney:async()=>{loads++;return unexpected?{courses:[]}:{records:[row]};}},'./export-csv':{csvCell}});
  return {run:()=>mod.exportOperationalWayfinder('person'),loads:()=>loads,audits:()=>audits};
}
test('operational export positively allowlists status/dates and excludes all private extra fields',async()=>{
  const f=exportFixture();const out=await f.run();assert.ok(out.csv.includes('completed'));assert.ok(out.csv.includes('finish'));
  for(const secret of ['PRIVATE ANSWER','PRIVATE RESULT','PRIVATE CONTACT','PRIVATE SNAPSHOT'])assert.ok(!out.csv.includes(secret));
  assert.match(out.filename,/^wayfinder-operational-/);assert.equal(f.audits(),1);
});
test('operational export denies unauthenticated before loader',async()=>{
  const f=exportFixture({admin:false});await assert.rejects(f.run(),e=>e.status===403);assert.equal(f.loads(),0);
});
test('operational export audit and unexpected private loader shape reject',async()=>{
  await assert.rejects(exportFixture({auditFail:true}).run());await assert.rejects(exportFixture({unexpected:true}).run());
});
test('operational pages and dispatch statically retain contact/private separation',()=>{
  for(const file of ['app/admin/life-mapping-u/page.tsx','app/admin/life-mapping-u/[assessmentId]/page.tsx']){
    const s=readFileSync(file,'utf8');assert.ok(!s.includes('first_name,email'));assert.ok(!s.includes('person?.email'));assert.ok(!s.includes('completionRate'));
  }
  const route=readFileSync('app/api/admin/wayfinders/[participantId]/export/route.ts','utf8');
  assert.match(route,/view === "operational" \? await exportOperationalWayfinder/);assert.match(route,/private, no-store/);
  const hub=readFileSync('app/hubs/[hubSlug]/page.tsx','utf8');assert.match(hub,/await loadHubDirectory/);assert.match(hub,/people !== null && <HubMemberDirectory/);
});
function copyFixture({failure='read',cleanupError=false}={}) {
  const db=fakeDb(q=>{
    if(q.table==='content_blocks'){
      if(has(q,'insert'))return ok({id:'copy'});
      if(has(q,'delete'))return cleanupError?{data:null,error:{}}:ok(null);
      if(has(q,'eq','block_key'))return ok(null);
      if(has(q,'eq','id','source'))return ok({id:'source',section_id:'section',column_id:'column',lesson_id:'lesson',block_type:'reflection',content:{},settings:{},metadata:{}});
      return ok([{id:'source',lesson_id:'lesson',sort_order:0}]);
    }
    if(q.table==='response_definitions')return failure==='read'?{data:null,error:{}}:has(q,'insert')?{data:null,error:{message:'copy failed'}}:ok({configuration:{},label:'Reflection'});
    if(q.table==='content_block_resources')return ok([]);
    if(q.table==='experience_versions')return ok({id:'version',experience_id:'course',status:'draft'});
    if(q.table==='experience_sections')return ok({id:'section',lesson_id:'lesson',module_id:'module',experience_version_id:'version'});
    if(q.table==='experience_lessons')return ok({id:'lesson',module_id:'module',experience_version_id:'version'});
    if(q.table==='section_columns')return ok([{id:'column',section_id:'section'}]);
    if(q.table==='section_layouts')return ok({id:'layout',section_id:'section'});
    throw Error(`Unexpected ${q.table}`);
  });
  const mod=load('lib/experiences/admin/block-mutations.ts',{
    '@/lib/admin/auth':{requireAdmin:async()=>({id:'admin'}),audit:async()=>{throw Error('Must not audit success');}},'@/lib/platform/authorization':{getAuthorizationContext:async()=>({}),canBuildExperienceById:async()=>true},'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},
    '../builder/block-presentation':{},'./inline-draft':{},'../builder/block-registry':{getBlockDefinition:()=>({duplicable:true,response:{responseType:'text'},validateConfiguration:()=>({ok:true,value:{}})})},'../builder/validation':{assertVersionEditable:()=>{}},'../builder/resource-assets':{},'./resource-copy':{inspectBlockResourceLinks:async()=>[]},
  });return ()=>mod.duplicateBlock('course','version','section','source');
}
for(const failure of ['read','insert']) for(const cleanupError of [false,true]) test(`definition ${failure} failure, cleanup error=${cleanupError}, never acknowledges copy`,async()=>{
  await assert.rejects(copyFixture({failure,cleanupError})(),cleanupError?/cleanup could not be confirmed/:/linked response definition/);
});
for(const count of [null,2]) test(`incomplete/unknown assignment count ${count} denies even Super Admin`,async()=>{
  const db=fakeDb(q=>q.table==='admin_members'?ok({role:'super_admin'}):{data:[],error:null,count});
  const mod=load('lib/platform/authorization.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},'@/lib/platform/auth':{}});
  await assert.rejects(mod.getAuthorizationContext('auth'),/Access could not be verified/);
});
test('truncated roster count denies before querying member names',async()=>{
  const db=fakeDb(q=>q.table==='participants'?ok({id:'person'}):has(q,'eq','participant_id')?ok({participant_id:'person',hub_id:'hub',status:'active'}):{data:[{participant_id:'person'}],count:2,error:null});
  await assert.rejects(directory.loadHubDirectory(db,'hub','auth',{authUserId:'auth',globalRole:null,assignments:[]},snapshot()),/incomplete/);
  assert.equal(db.queries.length,3);
});
for(const table of ['authorization_role_entitlements','authorization_role_permissions','authorization_entitlement_overrides','authorization_permission_overrides']) test(`truncated ${table} cannot lose a deny or yield Super Admin snapshot`,async()=>{
  const db=fakeDb(q=>q.table==='participants'?ok({id:'person'}):{data:[],count:q.table===table?1:0,error:null});
  const mod=load('lib/platform/effective-access.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},'@/lib/platform/authorization':{getAuthorizationContext:async()=>({authUserId:'auth',globalRole:'super_admin',assignments:[]}),AuthorizationUnavailableError:class extends Error{}},'@/lib/platform/effective-access-policy':policy});
  await assert.rejects(mod.resolveEffectiveAccess('auth'));
});
