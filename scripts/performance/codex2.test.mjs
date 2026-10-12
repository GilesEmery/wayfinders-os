import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { load } from './offline-module.mjs';
import { createCardImageCache } from '../../lib/experiences/builder/card-image-cache.ts';
import { createAccountRefresh } from '../../lib/platform/account-refresh.ts';

function database(rows, calls, storage = {}) {
  return { storage, from(table) {
    let single = false, fields = '*', bounds = null; const filters = [], orders = [];
    const chain = new Proxy({}, { get(_, key) {
      if (key === 'then') return done => {
        let data = rows[table] ?? [];
        for (const [kind, field, value] of filters) data = data.filter(row => kind === 'eq' ? row[field] === value : value.includes(row[field]));
        const count = data.length;
        if (bounds) data = data.slice(bounds[0], bounds[1] + 1);
        if (fields !== '*') data = data.map(row => Object.fromEntries(fields.split(',').map(field => [field, row[field]])));
        calls.push({ table, fields, filters, bounds, orders, rows: data.length, bytes: Buffer.byteLength(JSON.stringify(data)) });
        return Promise.resolve({ data: single ? data[0] ?? null : data, count, error: null }).then(done);
      };
      return (...args) => {
        if (['insert','update','delete','upsert'].includes(key)) throw Error('Unexpected write');
        if (key === 'range') bounds = args;
        if (key === 'order') orders.push(args);
        if (key === 'select') fields = args[0];
        if (key === 'eq' || key === 'in') filters.push([key,...args]);
        if (key === 'maybeSingle') single = true;
        return chain;
      };
    } }); return chain;
  } };
}
function curriculum() {
  const rows = { experiences: [{id:'e',delivery_mode:'builder'}], experience_versions:[{id:'v',experience_id:'e',status:'published'}], experience_modules:[], experience_lessons:[], experience_sections:[], section_layouts:[], section_columns:[], content_blocks:[] };
  for(let n=0;n<32;n++) {
    rows.experience_modules.push({id:`m${n}`,module_key:`week-${n}`,requirement_level:'required'});
    rows.experience_lessons.push({id:`l${n}`,module_id:`m${n}`,experience_version_id:'v',lesson_key:'lesson',requirement_level:'required'});
    rows.experience_modules[n].experience_version_id='v';
    rows.experience_sections.push({id:`s${n}`,lesson_id:`l${n}`,module_id:`m${n}`,experience_version_id:'v',section_key:'page',requirement_level:'required',completion_rule:'all_required_blocks',renderer_mode:'builder'});
    rows.section_layouts.push({id:`layout${n}`,section_id:`s${n}`});
    rows.section_columns.push({id:`c${n}`,section_layout_id:`layout${n}`,section_id:`s${n}`});
    rows.content_blocks.push({id:`b${n}`,lesson_id:`l${n}`,section_id:`s${n}`,column_id:`c${n}`,content:{text:'synthetic teaching text '.repeat(1500)},status:'active',visibility:'visible'});
  }
  return rows;
}
function blocks(structure) {return structure.modules.flatMap(m=>m.lessons.flatMap(l=>l.sections.flatMap(s=>s.layout?.columns.flatMap(c=>c.blocks)??[])));}
test('32-week fixture loads one page while preserving every navigation/completion node', async () => {
  const rows=curriculum(), fullCalls=[], narrowCalls=[];
  const source=load('lib/experiences/builder/data.ts', {'@/lib/supabase/admin':{}});
  const full=await source.getExperienceStructure('e','v',database(rows,fullCalls));
  const narrow=await source.getExperienceStructure('e','v',database(rows,narrowCalls),undefined,{moduleKey:'week-9',lessonKey:'lesson',sectionKey:'page'});
  assert.equal(blocks(full).length,32); assert.equal(blocks(narrow).length,1); assert.equal(blocks(narrow)[0].id,'b9');
  const progress=load('lib/experiences/builder/progress.ts',{'@/lib/supabase/admin':{}});
  const states=Object.fromEntries(rows.experience_sections.map(s=>[s.id,'completed']));
  assert.deepEqual(JSON.parse(JSON.stringify(progress.summarizeParticipantProgress(full,states))),JSON.parse(JSON.stringify(progress.summarizeParticipantProgress(narrow,states))));
  assert.equal(full.modules.length,narrow.modules.length);
  const bytes=calls=>calls.reduce((sum,row)=>sum+row.bytes,0);
  assert.ok(bytes(narrowCalls)<bytes(fullCalls)/10);
  console.info('CODEX2 synthetic curriculum',JSON.stringify({fullRequests:fullCalls.length,targetedRequests:narrowCalls.length,fullBytes:bytes(fullCalls),targetedBytes:bytes(narrowCalls)}));
  const missingCalls=[];
  const missing=await source.getExperienceStructure('e','v',database(rows,missingCalls),undefined,{moduleKey:'missing',lessonKey:'lesson',sectionKey:'page'});
  assert.equal(blocks(missing).length,0); assert.ok(!missingCalls.some(c=>['content_blocks','section_layouts','section_columns'].includes(c.table)));
});
test('legacy implicit-page courses retain their original content and outline', async () => {
  const rows=curriculum(); rows.experience_sections=[]; rows.content_blocks.forEach(b=>b.section_id=null);
  const source=load('lib/experiences/builder/data.ts',{'@/lib/supabase/admin':{}});
  const legacy=await source.getExperienceStructure('e','v',database(rows,[]),undefined,{moduleKey:'week-9',lessonKey:'lesson',sectionKey:'legacy-content'});
  assert.equal(blocks(legacy).length,32);assert.equal(legacy.modules[0].lessons[0].sections[0].legacy,true);
});
test('image URL reuse expires lazily, is bounded, and never accepts already-old signatures',()=>{
  let time=0;const cache=createCardImageCache(()=>time,2);
  cache.set('user-a/path/version1','one',0);assert.equal(cache.get('user-a/path/version1'),'one');
  assert.equal(cache.get('user-b/path/version1'),null);assert.equal(cache.get('user-a/path/version2'),null);
  time=600000;assert.equal(cache.get('user-a/path/version1'),null);cache.set('old','old',0);assert.equal(cache.get('old'),null);
  cache.set('a','a',time);cache.set('b','b',time);cache.set('c','c',time);assert.equal(cache.get('a'),null);
});
test('card images recheck metadata, batch signatures, isolate users, invalidate replacement/removal and preserve fallback',async()=>{
  const rows={resources:[{id:'image',resource_type:'image',status:'active',updated_at:'v1',storage_bucket:'private',storage_path:'immutable/path'}]};
  const calls=[];let signed=0;
  const db=database(rows,calls,{from:()=>({createSignedUrls:async paths=>({data:paths.map(path=>({path,signedUrl:`https://fixture.test/${++signed}`})),error:null})})});
  const resolver=load('lib/experiences/builder/card-images.ts',{'./course-configuration':{normalizeCourseConfiguration:v=>v},'./theme-validation':{validateThemeConfiguration:()=>({ok:false})},'./media-source':{safeExternalUrl:v=>v||null},'./card-image-cache':{createCardImageCache}});
  const first=await resolver.resolveCardImages(db,['image','image'],'a');
  const warm=await resolver.resolveCardImages(db,['image'],'a');assert.equal(first.get('image'),warm.get('image'));assert.equal(signed,1);assert.equal(calls.length,2);
  await resolver.resolveCardImages(db,['image'],'b');assert.equal(signed,2);
  rows.resources[0].updated_at='v2';const replaced=await resolver.resolveCardImages(db,['image'],'a');assert.notEqual(replaced.get('image'),first.get('image'));
  rows.resources=[];assert.equal((await resolver.resolveCardImages(db,['image'],'a')).size,0);
  assert.equal(resolver.courseCardImageUrl(new Map([['cover','url']]),['missing-card','cover']),'url');
  assert.ok(calls.every(c=>c.fields!=='*'));
});
test('account refresh deduplicates simultaneous events and discards late sign-out/account-switch completions',async()=>{
  const reads=[],applied=[];
  const refresh=createAccountRefresh(signal=>new Promise(resolve=>reads.push({signal,resolve})),v=>applied.push(v));
  const a=refresh.refresh('a');assert.equal(refresh.refresh('a'),a);await Promise.resolve();assert.equal(reads.length,1);
  const b=refresh.refresh('b');await Promise.resolve();assert.equal(reads[0].signal.aborted,true);
  reads[0].resolve('account-a');await a;assert.deepEqual(applied,[]);
  refresh.clear();reads[1].resolve('account-b');await b;assert.deepEqual(applied,[null]);
  const next=refresh.refresh('a');await Promise.resolve();reads[2].resolve('new-a');await next;assert.deepEqual(applied,[null,'new-a']);
  const failed=createAccountRefresh(async()=>{throw Error('offline')},v=>applied.push(v));await failed.refresh('a');assert.equal(applied.at(-1),null);
});
test('render cache is reached only after fresh authorization and is never used by a mutation',async()=>{
  const calls=[],rows={experiences:[{id:'e',slug:'course',status:'active',delivery_mode:'builder',current_published_version_id:'v',default_theme_id:null}],participants:[{id:'p',auth_user_id:'a'}],experience_versions:[{id:'v',experience_id:'e',status:'published',theme_id:null}],experience_enrollments:[{id:'enrollment',participant_id:'p',experience_id:'e',experience_version_id:'v',status:'in_progress',updated_at:'2026-10-01'}]};
  const db=database(rows,calls);let contentReads=0,mutationReads=0,passwordDenied=false;const targets=[];
  const structure={experience:rows.experiences[0],version:rows.experience_versions[0],modules:[{module_key:'week-9',lessons:[{lesson_key:'lesson',sections:[{id:'s',section_key:'page',layout:null}]}]}]};let assetSections=[];
  const runtime=load('lib/experiences/builder/participant-runtime.ts',{
    './performance-measurement':{measureOperation:(_,work)=>work()},'@/lib/experiences/access/server':{requireExperiencePassword:async()=>{if(passwordDenied)throw Error('Password required');}},
    '@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},'@/lib/platform/auth':{getPlatformUser:async()=>({id:'a'})},
    './data':{getExperienceStructure:async(...args)=>{mutationReads++;targets.push(args[4]);return structure;}},'./published-content':{loadPublishedCourseContent:async(...args)=>{contentReads++;targets.push(args.slice(2));return structure;}},
    './progress':{loadParticipantProgress:async()=>({})},'./runtime':{resolveExperienceRuntime:()=>({kind:'builder'})},'./course-templates':{resolveCourseTemplate:()=>({})},
    './course-cover':{resolveCourseCoverUrl:async()=>null,resolveCourseLogoUrl:async()=>null,resolveCourseHeaderLogoUrl:async()=>null},'./resource-assets':{resolveCourseAssets:async(_db,_blocks,sections)=>{assetSections=sections;return {blocks:{},heroes:{}};}},'./companion-data':{loadCompanionRuntime:async()=>({})},
    '@/lib/platform/authorization':{getAuthorizationContext:async()=>({globalRole:null,assignments:[]}),canAccessCohortContext:()=>false},'./cohort-context':{},'./course-requirement-policy':{canBypassCourseRequirements:()=>false},
  });
  const target={moduleKey:'week-9',lessonKey:'lesson',sectionKey:'page'};
  assert.equal((await runtime.resolveParticipantCourse('course',null,target)).status,'ready');assert.equal(contentReads,1);assert.deepEqual(Array.from(assetSections,s=>s.id),['s'],'current custom page hero remains eligible without a layout');
  assert.deepEqual(Array.from(targets[0]),Object.values(target));
  assert.equal((await runtime.resolveParticipantCourseForMutation('course',null,target)).status,'ready');assert.equal(contentReads,1);assert.equal(mutationReads,1);assert.deepEqual(targets[1],target);
  rows.experience_enrollments=[];assert.equal((await runtime.resolveParticipantCourse('course',null,target)).status,'denied');assert.equal(contentReads,1);
  passwordDenied=true;await assert.rejects(()=>runtime.resolveParticipantCourse('course',null,target),/Password required/);assert.equal(contentReads,1);
});
test('published cache is version/target keyed with a lazy ten-minute policy and rejects draft payloads',async()=>{
  let body,config,key;let status='published';const sources=[];
  const published=load('lib/experiences/builder/published-content.ts',{'next/cache':{unstable_cache:(fn,k,c)=>{body=fn;key=k;config=c;return fn;}},'./data':{getExperienceStructure:async(...args)=>{sources.push(args);return {version:{status}};}},'@/lib/supabase/admin':{createAdminSupabaseClient:()=>({})}});
  assert.equal(config.revalidate,600);assert.ok(key[0].includes('v1'));
  await published.loadPublishedCourseContent('e','v1','m','l','s');await body('e','v2','m','l','other');
  assert.equal(sources[0][1],'v1');assert.equal(sources[1][1],'v2');assert.equal(sources[1][4].sectionKey,'other');
  status='draft';await assert.rejects(()=>body('e','draft','m','l','s'),/unavailable/);
});
test('failed card signing returns an error and cannot poison a later cache hit',async()=>{
  const rows={resources:[{id:'image',resource_type:'image',status:'active',updated_at:'v1',storage_bucket:'private',storage_path:'path'}]};let fail=true,requests=0;
  const db=database(rows,[],{from:()=>({createSignedUrls:async()=>{requests++;return fail?{data:null,error:Error('offline')}:{data:[{path:'path',signedUrl:'https://fixture.test/good'}],error:null};}})});
  const resolver=load('lib/experiences/builder/card-images.ts',{'./course-configuration':{},'./theme-validation':{},'./media-source':{},'./card-image-cache':{createCardImageCache}});
  await assert.rejects(()=>resolver.resolveCardImages(db,['image'],'a'),/could not be prepared/);
  fail=false;assert.equal((await resolver.resolveCardImages(db,['image'],'a')).get('image'),'https://fixture.test/good');assert.equal(requests,2);
});
for (const [file,name] of [['start-something','saveStartSomething'],['personal-impact-statement','savePersonalImpactStatement'],['circle-of-influence','saveCircleOfInfluence'],['ethos-assessment','saveEthosAssessment'],['activate-purpose-assessment','saveActivatePurposeAssessment'],['launching-wayfinders-hub-assessment','saveLaunchingWayfindersHubAssessment']]) {
  test(`${name} uses the targeted delivery path and denies before saving`,async()=>{
    const path=`lib/experiences/builder/${file}-mutations.ts`,source=readFileSync(path,'utf8'),imports={};
    for(const match of source.matchAll(/from ["']([^"']+)["']/g))imports[match[1]]={};
    imports['./performance-measurement']={measureOperation:(_,work)=>work()};
    let received;imports['./participant-runtime']={resolveParticipantCourseForMutation:async(...args)=>{received=args;return {status:'denied'};}};
    const assessment=load(path,imports);
    await assert.rejects(()=>assessment[name]('course','group','lesson','page','block',null,{},false),/unavailable/);
    assert.deepEqual(JSON.parse(JSON.stringify(received)),['course',null,{moduleKey:'group',lessonKey:'lesson',sectionKey:'page'}]);
  });
}
test('six-card fixture compares original CODEX1 signing to cold/warm CODEX2 delivery',async()=>{
  const rows={resources:Array.from({length:6},(_,n)=>({id:`image${n}`,resource_type:'image',status:'active',updated_at:'v1',storage_bucket:'private',storage_path:`immutable/${n}`,original_filename:`image${n}.png`,title:`Image ${n}`}))};
  function storage(counter){return {from:()=>({createSignedUrl:async()=>{counter.count++;return {data:{signedUrl:'https://fixture.test/download'},error:null};},createSignedUrls:async paths=>{counter.count++;return {data:paths.map(path=>({path,signedUrl:`https://fixture.test/${path}`})),error:null};}})};}
  const originalCalls=[],oldSigning={count:0},originalDb=database(rows,originalCalls,storage(oldSigning));
  const oldAssets=load('lib/experiences/builder/resource-assets.ts',{'node:crypto':{}},execFileSync('git',['show','e48acac:lib/experiences/builder/resource-assets.ts'],{encoding:'utf8'}));
  const configuration={normalizeCourseConfiguration:v=>v},theme={validateThemeConfiguration:()=>({ok:false})},media={safeExternalUrl:v=>v||null};
  const oldCovers=load('lib/experiences/builder/course-cover.ts',{'@/lib/supabase/admin':{},'./media-source':media,'./course-configuration':configuration,'./resource-assets':oldAssets,'./theme-validation':theme});
  const ids=rows.resources.map(row=>row.id);
  await oldAssets.resolveResourceIds(originalDb,ids);
  for(const id of ids)await oldCovers.resolveCourseCoverUrl({appearance:{cover_resource_id:id}},null,originalDb);
  const newCalls=[],newSigning={count:0},newDb=database(rows,newCalls,storage(newSigning));
  const improved=load('lib/experiences/builder/card-images.ts',{'./course-configuration':configuration,'./theme-validation':theme,'./media-source':media,'./card-image-cache':{createCardImageCache}});
  await improved.resolveCardImages(newDb,ids,'viewer');const cold={database:newCalls.length,storage:newSigning.count};
  await improved.resolveCardImages(newDb,ids,'viewer');const warm={database:newCalls.length-cold.database,storage:newSigning.count-cold.storage};
  assert.deepEqual({database:originalCalls.length,storage:oldSigning.count},{database:7,storage:13});assert.deepEqual(cold,{database:1,storage:1});assert.deepEqual(warm,{database:1,storage:0});
  console.info('CODEX2 synthetic six-card requests',JSON.stringify({before:{database:originalCalls.length,storage:oldSigning.count},cold,warm}));
});
test('CRM page two retains exact totals, stable ordering and page-scoped relationship reads',async()=>{
  const rows={participants:Array.from({length:70},(_,n)=>({id:`p${n}`,full_name:'Same name',email_normalized:`fixture${n}@example.test`,auth_user_id:null})),hub_memberships:[{participant_id:'p1',hub_id:'private-other-page',status:'active'},{participant_id:'p51',hub_id:'visible-page',status:'active'}]};
  const calls=[],db=database(rows,calls);
  const crm=load('lib/admin/wayfinders/data.ts',{'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db}});
  const result=await crm.loadWayfinderRegistry({q:'',hub:'',role:'',tag:'',account:'',experience:'',cohort:'',sort:'name',page:2});
  assert.equal(result.count,70);assert.equal(result.people.length,20);assert.equal(result.people[0].id,'p50');
  const query=calls.find(row=>row.table==='participants'&&row.bounds);assert.deepEqual(Array.from(query.bounds),[50,99]);assert.equal(query.orders.at(-1)[0],'id');
  assert.equal(result.hubRows.length,1);assert.equal(result.hubRows[0].participant_id,'p51');
});
test('archived card images remain eligible only when explicitly linked as cards, never as cover fallback',async()=>{
  const rows={resources:[{id:'old',resource_type:'image',status:'archived',updated_at:'v1',storage_bucket:'private',storage_path:'old'}]};let requests=0;
  const db=database(rows,[],{from:()=>({createSignedUrls:async()=>{requests++;return {data:[{path:'old',signedUrl:'https://fixture.test/old'}],error:null};}})});
  const resolver=load('lib/experiences/builder/card-images.ts',{'./course-configuration':{},'./theme-validation':{},'./media-source':{},'./card-image-cache':{createCardImageCache}});
  assert.equal((await resolver.resolveCardImages(db,['old'],'a')).size,0);assert.equal(requests,0);
  assert.equal((await resolver.resolveCardImages(db,['old'],'a',['old'])).size,1);assert.equal(requests,1);
  assert.equal((await resolver.resolveCardImages(db,['old'],'a')).size,0,'existing URL never overrides current eligibility');
});
