import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from '../performance/offline-module.mjs';

function fixture(fail) {
 const writes=[];
 const db={from(table){let mutation=false;const q={};for(const m of ['select','eq','maybeSingle','update','insert','upsert'])q[m]=(...args)=>{if(['update','insert','upsert'].includes(m)){mutation=true;writes.push([table,m,args]);}return q;};q.then=(yes,no)=>Promise.resolve().then(()=>{if(fail===table&&!mutation)throw Error('transport');return {data:table==='hubs'?{id:'hub'}:table==='hub_memberships'?{id:'membership'}:{default_hub_id:'other'},error:fail===table+'-error'&&!mutation?{message:'private'}:null};}).then(yes,no);return q;}};
 const mod=load('lib/platform/hub-membership.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db}});
 return {writes,run:()=>mod.connectParticipantToOpenHub('person')};
}
for(const kind of ['hub_memberships','hub_memberships-error'])test(`failed membership ${kind} cannot create/reactivate`,async()=>{const f=fixture(kind);await assert.rejects(f.run());assert.equal(f.writes.length,0);});
for(const kind of ['participant_preferences','participant_preferences-error'])test(`failed preference ${kind} cannot overwrite preference`,async()=>{const f=fixture(kind);await assert.rejects(f.run());assert.equal(f.writes.length,1);assert.equal(f.writes[0][0],'hub_memberships');});
test('existing preferred Hub is preserved',async()=>{const f=fixture();await f.run();assert.equal(f.writes.length,1);});
test('LMU captures assessment ID for draft/final/reset and refuses unbound drafts',async()=>{
 const queue=load('lib/experiences/lmu/acknowledged-save-queue.ts',{});const requests=[];const timers=[];
 const source=readFileSync('lib/experiences/lmu/persistence.ts','utf8');
 const mod=load('lib/experiences/lmu/persistence.ts',{'./acknowledged-save-queue':queue,fixture:{setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},AbortSignal:{timeout:()=>null},fetch:async(path,init)=>{requests.push([path,init]);return {ok:true,json:async()=>({ok:true})};}}},'const {setTimeout,clearTimeout,AbortSignal,fetch}=require("fixture");\n'+source);
 assert.equal(await mod.scheduleSectionSave({moduleId:'values',responses:{}}),false);
 const pending=mod.scheduleSectionSave({moduleId:'values',responses:{}},'captured');timers.shift()();assert.equal(await pending,true);
 assert.equal(await mod.scheduleSectionSave({moduleId:'values',status:'completed',responses:{},result:{}},'captured'),true);
 assert.equal(await mod.deleteServerSection('values','captured'),true);
 assert.equal(requests.length,3);for(const [,init] of requests)assert.equal(init.headers['x-lmu-assessment-id'],'captured');
});
test('operational page/loader receipts require checked audit before rendering',()=>{
 for(const file of ['app/admin/life-mapping-u/page.tsx','app/admin/life-mapping-u/[assessmentId]/page.tsx','lib/admin/wayfinders/journey.ts']){
  const source=readFileSync(file,'utf8');assert.match(source,/await auditSecurityEvent\(/);assert.doesNotMatch(source,/await audit\(/);
 }
});

test('explicit directory deny blocks active member and Super Admin before names',async()=>{
 const policy=load('lib/platform/effective-access-policy.ts',{});const mod=load('lib/platform/hub-directory.ts',{'./effective-access-policy':policy});
 for(const isSuperAdmin of [false,true]) {
  const access={authUserId:'auth',isActiveMember:true,isSuperAdmin,permissionOverrides:[{key:'hub.view',effect:'deny',scope:{type:'hub',id:'hub'}}]};
  assert.equal(await mod.loadHubDirectory({from(){throw Error('unexpected query');}},'hub','auth',{authUserId:'auth'},access),null);
 }
});

function adminIdentityFixture(getUser) {
 let privilegedReads=0;
 const mod=load('lib/admin/auth.ts',{
  'next/navigation':{redirect:destination=>{throw Error(destination);}},
  '@/lib/supabase/server':{createServerSupabaseClient:async()=>({auth:{getUser}})},
  '@/lib/supabase/admin':{createAdminSupabaseClient:()=>{privilegedReads++;throw Error('Unexpected privileged lookup');}},
 });
 return {mod,reads:()=>privilegedReads};
}
test('admin signed-out SDK session state opens login without privileged reads',async()=>{
 const {createClient}=await import('@supabase/supabase-js');
 const sdk=createClient('https://fixture.invalid','fixture-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:()=>{throw Error('No network allowed');}}});
 const receipt=await sdk.auth.getUser();assert.equal(receipt.error.name,'AuthSessionMissingError');
 const f=adminIdentityFixture(async()=>receipt);assert.equal(await f.mod.getAdmin(),null);assert.equal(f.reads(),0);
 await assert.rejects(f.mod.requireAdmin(),/\/admin\/login/);assert.equal(f.reads(),0);
});
test('admin missing session cannot trust contradictory partial identity data',async()=>{
 const f=adminIdentityFixture(async()=>({data:{user:{id:'untrusted',email:'fixture@example.invalid'}},error:{name:'AuthSessionMissingError'}}));
 assert.equal(await f.mod.getAdmin(),null);assert.equal(f.reads(),0);
});
test('admin other identity failures remain unavailable even with partial user',async()=>{
 const f=adminIdentityFixture(async()=>({data:{user:{id:'untrusted',email:'fixture@example.invalid'}},error:{name:'AuthApiError'}}));
 await assert.rejects(f.mod.getAdmin(),/could not be verified/);assert.equal(f.reads(),0);
});
test('admin rejected identity lookup cannot grant or read privileged data',async()=>{
 const f=adminIdentityFixture(async()=>{throw Error('transport unavailable');});
 await assert.rejects(f.mod.getAdmin());assert.equal(f.reads(),0);
});
