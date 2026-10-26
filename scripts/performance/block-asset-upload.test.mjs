import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { load } from './offline-module.mjs';

function fixture(){
  let allowed=true,draft=true,body=new Blob(['%PDF-1.7\n',new Uint8Array(6.1*1024*1024)],{type:'application/pdf'});
  const calls=[],rows={experience_versions:{id:'v',status:'draft'},experience_sections:{id:'s',lesson_id:'l',module_id:'m'},section_layouts:{id:'layout'},experience_lessons:{id:'l',module_id:'m'},section_columns:[],content_blocks:{id:'b',column_id:'col',block_type:'pdf_reader'},resources:{id:'asset',resource_type:'pdf',mime_type:'application/pdf',storage_path:'courses/e/asset.pdf'},content_block_resources:[]};
  const db={from(table){let mutation=false;const q=new Proxy({}, {get(_,key){if(key==='then')return done=>Promise.resolve({data:mutation?null:rows[table],error:null}).then(done);return (...args)=>{if(['insert','delete','update'].includes(key)){mutation=true;calls.push([key,table,...args]);}return q;};}});return q;},storage:{from:()=>({createSignedUploadUrl:async path=>{calls.push(['sign',path]);return {data:{token:'token'},error:null};},download:async path=>{calls.push(['download',path]);return {data:body,error:null};},upload:async(path,file)=>{calls.push(['upload',path,file.size]);return {error:null};},remove:async paths=>{calls.push(['remove',paths]);return {error:null};}})}};
  // Supply Web API globals to the isolated module without changing production code.
  const assetImports={'node:crypto':{randomUUID},globals:{TextDecoder,Uint8Array}};
  const native=load('lib/experiences/builder/resource-assets.ts',assetImports,'const {TextDecoder,Uint8Array}=require("globals");\n'+readFileSync('lib/experiences/builder/resource-assets.ts','utf8'));
  // Native resource creation returns the inserted asset, while link writes return null.
  const originalFrom=db.from;
  db.from=table=>{if(table!=='resources')return originalFrom(table);const q=new Proxy({}, {get(_,key){if(key==='then')return done=>Promise.resolve({data:rows.resources,error:null}).then(done);return (...args)=>{if(key==='insert'){calls.push(['insert','resources',...args]);}return q;};}});return q;};
  const mod=load('lib/experiences/admin/block-mutations.ts',{
    'node:crypto':{randomUUID},globals:{File,FormData},'../builder/media-source':{},'../builder/block-presentation':{},
    '@/lib/admin/auth':{requireAdmin:async()=>({id:'author'}),audit:async()=>{}},
    '@/lib/platform/authorization':{getAuthorizationContext:async()=>({}),canBuildExperienceById:async()=>allowed},
    '@/lib/supabase/admin':{createAdminSupabaseClient:()=>db},'./inline-draft':{},'../builder/block-registry':{},
    '../builder/validation':{assertVersionEditable:()=>{if(!draft)throw Error('Only draft');}},
    './resource-copy':{resourceBelongsToCourse:()=>true},'../builder/resource-assets':native,
  },'const {File,FormData}=require("globals");\n'+readFileSync('lib/experiences/admin/block-mutations.ts','utf8'));
  return {mod,calls,metadata:()=>({name:'guide.pdf',type:'application/pdf',size:body.size,title:'Guide'}),deny:()=>{allowed=false;},publish:()=>{draft=false;},corrupt:()=>{body=new Blob([new Uint8Array(body.size)]);}};
}
test('6.1 MB PDF uploads through signed storage, validates bytes, attaches and removes pending object',async()=>{
  const f=fixture(),metadata=f.metadata();
  const prepared=await f.mod.prepareBlockAssetUpload('e','v','s','b',metadata);
  assert.equal(prepared.token,'token');
  await f.mod.completeBlockAssetUpload('e','v','s','b',prepared.path,metadata);
  assert.ok(f.calls.some(c=>c[0]==='upload'&&c[2]>6*1024*1024));
  assert.ok(f.calls.some(c=>c[0]==='insert'&&c[1]==='content_block_resources'));
  assert.ok(f.calls.some(c=>c[0]==='remove'&&c[1][0]===prepared.path));
});
test('rejects oversized, wrong-type and unauthorized uploads before signing',async()=>{
  const f=fixture(),meta=f.metadata();
  await assert.rejects(()=>f.mod.prepareBlockAssetUpload('e','v','s','b',{...meta,size:26*1024*1024}),/25 MB/);
  await assert.rejects(()=>f.mod.prepareBlockAssetUpload('e','v','s','b',{...meta,type:'image/png'}),/PDF/);
  f.deny();await assert.rejects(()=>f.mod.prepareBlockAssetUpload('e','v','s','b',meta),/authorized/);
  assert.equal(f.calls.length,0);
});
test('finalization rechecks draft state, author path and PDF signature',async()=>{
  const f=fixture(),meta=f.metadata(),prepared=await f.mod.prepareBlockAssetUpload('e','v','s','b',meta);
  await assert.rejects(()=>f.mod.completeBlockAssetUpload('e','v','s','b',prepared.path.replace('/author/','/other/'),meta),/belong/);
  f.corrupt();await assert.rejects(()=>f.mod.completeBlockAssetUpload('e','v','s','b',prepared.path,meta),/contents/);
  assert.ok(!f.calls.some(c=>c[0]==='insert'));
  f.publish();await assert.rejects(()=>f.mod.completeBlockAssetUpload('e','v','s','b',prepared.path,meta),/draft/);
});
