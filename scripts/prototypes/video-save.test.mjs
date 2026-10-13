import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {load} from '../performance/offline-module.mjs';
import {applyVideoEditorPatch} from '../../lib/experiences/builder/video-editor.ts';
function fixture({revision='r1',result={data:{updated_at:'r2'},error:null},editable=true,sourceFailure=false}={}){
 const writes=[],filters=[];let audited=0;
 const block={block_type:'video',column_id:'col',updated_at:'r1',content:{url:'https://example.com/video',unknown:'keep'},settings:{unknown:true},requirement_level:'optional',visibility:'visible'};
 const query={update(value){writes.push(value);return this;},eq(key,value){filters.push([key,value]);return this;},select(){return this;},maybeSingle:async()=>result};
 const body=readFileSync('lib/experiences/admin/block-mutations.ts','utf8').split('// Video uses the same hierarchy/author checks and block table, with a changed-only CAS save.')[1].replace("await import('../builder/video-editor')","require('helper')");
 const source="const {context,blockInContext,audit,linkExternalResource}=require('fixture');\n"+body;
 const mod=load('video-save.ts',{'helper':{applyVideoEditorPatch},'fixture':{context:async()=>{if(!editable)throw Error('Published version is immutable');return {admin:{id:'admin'},db:{from:()=>query},columns:[{id:'col'}]};},blockInContext:async()=>block,audit:async()=>{audited++;},linkExternalResource:async()=>{if(sourceFailure)throw Error("source failure");}}},source);
 const save=patch=>mod.saveVideoBlockDraft('course','version','section','block',{get:key=>key==='expected_revision'?revision:JSON.stringify(patch)});
 return {save,writes,filters,audited:()=>audited};
}
test('video no-op preserves legacy fields and performs no writes or audit',async()=>{const f=fixture();const result=await f.save({});assert.equal(result.unchanged,true);assert.equal(f.writes.length,0);assert.equal(f.audited(),0);});
test('video saves changed metadata with scoped compare-and-swap and acknowledgement',async()=>{const f=fixture();assert.equal((await f.save({presentation:{header:'New'}})).ok,true);assert.equal(f.writes.length,1);assert.equal(f.writes[0].content.unknown,'keep');assert.equal(f.writes[0].settings.unknown,true);assert.deepEqual(f.filters,[['id','block'],['section_id','section'],['column_id','col'],['updated_at','r1']]);assert.equal(f.audited(),1);});
test('video rejects stale revisions and published versions before writes',async()=>{const stale=fixture({revision:'old'});assert.equal((await stale.save({presentation:{header:'New'}})).conflict,true);assert.equal(stale.writes.length,0);const published=fixture({editable:false});await assert.rejects(published.save({}),/immutable/);assert.equal(published.writes.length,0);});
test('video failed or concurrently superseded saves never return success',async()=>{const failed=fixture({result:{data:null,error:{message:'fail'}}});await assert.rejects(failed.save({presentation:{header:'New'}}),/could not be confirmed/);assert.equal(failed.audited(),0);const race=fixture({result:{data:null,error:null}});assert.equal((await race.save({presentation:{header:'New'}})).conflict,true);assert.equal(race.audited(),0);});

test("video source-link failure returns failure and rollback respects the committed revision",async()=>{const f=fixture({sourceFailure:true});assert.equal((await f.save({content:{url:"https://example.com/new"}})).ok,false);assert.equal(f.writes.length,2);assert.ok(f.filters.some(([key,value])=>key==="updated_at"&&value==="r2"));assert.equal(f.audited(),0);});
