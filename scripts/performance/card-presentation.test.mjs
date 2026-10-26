import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './offline-module.mjs';
const normalize=x=>({card:{image_resource_id:null,...x?.card},appearance:{cover_resource_id:null,...x?.appearance}});
const {cardPresentationConfiguration:resolve}=load('lib/experiences/builder/card-presentation.ts',{'./course-configuration':{normalizeCourseConfiguration:normalize}});
test('live artwork overrides earlier curriculum artwork for started and completed participants',()=>{
 const version={card:{image_resource_id:'old',headline:'Published title'},appearance:{cover_resource_id:'old-cover',reading_width:'wide'}};
 const live={card:{image_resource_id:'new'}};
 for(const _status of ['enrolled','in_progress','completed']){
  const result=resolve(version,live);
  assert.equal(result.card.image_resource_id,'new');assert.equal(result.card.headline,'Published title');assert.equal(result.appearance.reading_width,'wide');
 }
 assert.equal(version.card.image_resource_id,'old');
});
test('explicit removals clear artwork while absent overrides preserve published settings',()=>{
 const version={card:{image_resource_id:'old'},appearance:{cover_resource_id:'old-cover'}};
 assert.equal(resolve(version,{}).card.image_resource_id,'old');
 const removed=resolve(version,{card:{image_resource_id:null},appearance:{cover_resource_id:null}});
 assert.equal(removed.card.image_resource_id,null);assert.equal(removed.appearance.cover_resource_id,null);
 assert.equal(resolve(version,{appearance:{cover_resource_id:'new-cover'}}).appearance.cover_resource_id,'new-cover');
});
