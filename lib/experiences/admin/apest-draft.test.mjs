import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
let authorized, signedIn, rows, writes, audits;
const db={from(table){let filters=[],operation='read',payload;
 const query={select(){return query},eq(k,v){filters.push(r=>r[k]===v);return query},is(k,v){filters.push(r=>r[k]===v);return query},order(){return query},limit(){return query},insert(v){operation='insert';payload=v;return query},upsert(v){operation='upsert';payload=v;return query},update(v){operation='update';payload=v;return query},single(){return run(true)},maybeSingle(){return run(true)},then(yes,no){return run(false).then(yes,no)}};
 async function run(single){const data=rows[table]??=[],matching=data.filter(r=>filters.every(fn=>fn(r)));
 if(operation!=='read'){writes++;if(operation==='update')matching.forEach(r=>Object.assign(r,payload));else if(operation==='upsert'){const current=data.find(r=>r.experience_id===payload.experience_id);if(current)Object.assign(current,payload);else data.push({...payload})}else data.push({...payload,id:payload.id??'new-response'});rows[table]=data;}
 return {data:single?(matching[0]??null):matching,error:null};}return query;
}};
globalThis.__apestSetup={db,admin:()=>{if(!signedIn)throw Error('signed out');return {id:'admin',email:'admin@example.invalid'}},authorized:()=>authorized,audit:()=>{audits++}};
const mocks={
 'server-only':'export {};',
 '@/lib/admin/auth':'export const requireAdmin=async()=>globalThis.__apestSetup.admin();export const audit=async()=>globalThis.__apestSetup.audit();',
 '@/lib/platform/authorization':'export const getAuthorizationContext=async()=>({});export const canBuildExperienceById=async()=>globalThis.__apestSetup.authorized();',
 '@/lib/supabase/admin':'export const createAdminSupabaseClient=()=>globalThis.__apestSetup.db;',
};
registerHooks({resolve(specifier,context,next){if(mocks[specifier])return {url:`mock:${specifier}`,shortCircuit:true};let path;if(specifier.startsWith('@/'))path=resolve(root,specifier.slice(2));else if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))path=resolve(dirname(fileURLToPath(context.parentURL)),specifier);if(path&&!existsSync(path)&&existsSync(path+'.ts'))path+='.ts';if(path&&existsSync(path))return {url:pathToFileURL(path).href,shortCircuit:true};return next(specifier,context)},load(url,context,next){if(url.startsWith('mock:'))return {format:'module',source:mocks[url.slice(5)],shortCircuit:true};if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context)}});
const {APEST_DRAFT:ids,prepareApestDraft}=await import('./apest-draft.ts');
beforeEach(()=>{authorized=true;signedIn=true;writes=0;audits=0;rows={experiences:[{id:ids.experience,slug:'apest',experience_type:'assessment',status:'draft',current_published_version_id:null}],experience_versions:[{id:ids.version,experience_id:ids.experience,status:'draft',course_configuration:{card:{image_resource_id:'owner-image'}}}],experience_sections:[{id:ids.section,experience_version_id:ids.version,lesson_id:'lesson',module_id:'module'}],section_columns:[{id:'column',section_id:ids.section}],content_blocks:[{id:ids.introduction,lesson_id:'lesson',sort_order:0,section_id:ids.section,status:'active',visibility:'visible'}],response_definitions:[],prebuilt_assessments:[]}});
test('signed-out and unauthorized viewers cannot provision a draft',async()=>{signedIn=false;await assert.rejects(prepareApestDraft());signedIn=true;authorized=false;await assert.rejects(prepareApestDraft());assert.equal(writes,0)});
test('published experiences or versions cannot be modified',async()=>{rows.experiences[0].current_published_version_id='published';await assert.rejects(prepareApestDraft());assert.equal(writes,0);rows.experiences[0].current_published_version_id=null;rows.experience_versions[0].status='published';await assert.rejects(prepareApestDraft());assert.equal(writes,0)});
test('native setup is repeatable, preserves the owner image, and never publishes',async()=>{await prepareApestDraft();await prepareApestDraft();assert.equal(rows.content_blocks.filter(r=>r.id===ids.block).length,1);assert.equal(rows.content_blocks.find(r=>r.id===ids.block).sort_order,1);assert.equal(rows.response_definitions.length,1);assert.equal(rows.prebuilt_assessments.length,1);assert.equal(rows.prebuilt_assessments[0].launch_path,'/experiences/apest');assert.equal(rows.content_blocks.find(r=>r.id===ids.introduction).status,'archived');assert.equal(rows.experiences[0].status,'draft');assert.equal(rows.experiences[0].current_published_version_id,null);assert.equal(rows.experience_versions[0].course_configuration.card.image_resource_id,'owner-image');assert.equal(audits,2)});
