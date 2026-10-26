import test from 'node:test';
import assert from 'node:assert/strict';
import {MICROCHURCH_QUESTIONS,MICROCHURCH_CATEGORIES,emptyMicrochurchData,normalizeMicrochurchData,microchurchScores,microchurchIssues,projectMicrochurchSave,normalizeMicrochurchEnvelope} from './microchurch.ts';
const complete = (rating=3) => ({ratings:Array.from({length:21},()=>rating)});
test('source has 21 statements and exactly seven per category, covering each once',()=>{
 assert.equal(MICROCHURCH_QUESTIONS.length,21);
 assert.deepEqual(MICROCHURCH_CATEGORIES.map(c=>[...c.statements]),[[1,3,5,6,10,13,20],[4,8,11,12,15,17,19],[2,7,9,14,16,18,21]]);
 assert.deepEqual(MICROCHURCH_CATEGORIES.flatMap(c=>[...c.statements]).sort((a,b)=>a-b),Array.from({length:21},(_,i)=>i+1));
});
test('sums the original categories with no reversal, averages, or fabricated thresholds',()=>{
 assert.deepEqual(microchurchScores(complete(1)).map(c=>c.total),[7,7,7]);
 assert.deepEqual(microchurchScores(complete(5)).map(c=>c.total),[35,35,35]);
 const d=complete(1);for(const n of [1,3,5,6,10,13,20])d.ratings[n-1]=5;
 assert.deepEqual(microchurchScores(d).map(c=>c.total),[35,7,7]);
 const mixed={ratings:Array.from({length:21},(_,i)=>(i%5)+1)};
 assert.deepEqual(microchurchScores(mixed).map(c=>c.total),[23,21,17]);
});
test('partial and invalid ratings remain unanswered and cannot complete',()=>{
 assert.equal(microchurchIssues(emptyMicrochurchData()).length,21);
 for(const invalid of [0,6,1.5,'5',null,NaN]){const d=complete();d.ratings[3]=invalid as number;const n=normalizeMicrochurchData(d);assert.equal(n.ratings[3],null);assert.throws(()=>projectMicrochurchSave({},d,'2026-10-26T12:00:00Z',true));}
 assert.deepEqual(microchurchScores(emptyMicrochurchData()).map(c=>c.total),[null,null,null]);
 assert.equal(projectMicrochurchSave({},complete(),'2026-10-26T12:00:00Z').finished,null);
});
test('server computes immutable completed material and preserves explicit retakes',()=>{
 const first=projectMicrochurchSave({},complete(2),'2026-10-26T12:00:00Z',true);
 const late=projectMicrochurchSave(first,complete(5),'2026-10-26T13:00:00Z',true);
 assert.deepEqual(late.finished,first.finished);
 const retake=projectMicrochurchSave(first,complete(4),'2026-10-26T14:00:00Z',true,first.finished!.completedAt);
 assert.deepEqual(retake.previousResults,[first.finished]);
 assert.deepEqual(microchurchScores(retake.finished!.participantMaterial).map(c=>c.total),[28,28,28]);
 assert.deepEqual(normalizeMicrochurchEnvelope(retake),retake);
});
