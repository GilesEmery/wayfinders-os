import assert from "node:assert/strict";
import test from "node:test";
import { FIVE_VOICES_DOMAINS, FIVE_VOICES_QUESTIONS, FIVE_VOICES_SCALE, fiveVoicesComplete, fiveVoicesResults, normalizeFiveVoicesAnswers, normalizeFiveVoicesOrder, projectFiveVoicesSave, shuffleFiveVoicesQuestions } from "./five-voices.ts";
import { completedGenericResult } from "../../assessment-results-policy.ts";
import { activityResponseItems, activityResultItems } from "../../platform/response-library-policy.ts";
const answers = (value = 2) => Object.fromEntries(FIVE_VOICES_QUESTIONS.map(q => [q.key, value]));
const first = "2026-10-27T16:00:00.000Z", second = "2026-10-27T17:00:00.000Z";

test("25 original statements have five fixed questions for each voice", () => {
  assert.equal(FIVE_VOICES_QUESTIONS.length,25);
  assert.equal(new Set(FIVE_VOICES_QUESTIONS.map(q=>q.key)).size,25);
  assert.equal(new Set(FIVE_VOICES_QUESTIONS.map(q=>q.text)).size,25);
  assert.deepEqual(FIVE_VOICES_DOMAINS.map(v=>v.title),["Nurturer","Creative","Guardian","Connector","Pioneer"]);
  for(const domain of FIVE_VOICES_DOMAINS) assert.equal(FIVE_VOICES_QUESTIONS.filter(q=>q.domain===domain.key).length,5);
});
test("every slider stop and invalid or missing answers are handled precisely", () => {
  assert.deepEqual(FIVE_VOICES_SCALE.map(s=>s.value),[1,1.5,2,2.5,3]);
  for(const {value} of FIVE_VOICES_SCALE) assert.deepEqual(fiveVoicesResults(answers(value))?.scores.map(s=>s.score),Array(5).fill(value*5));
  assert.equal(fiveVoicesComplete(normalizeFiveVoicesAnswers({...answers(),q5:'2'})),false);
  assert.equal(fiveVoicesResults(normalizeFiveVoicesAnswers({...answers(),q5:1.25})),null);
  const partial=answers();delete partial.q25;assert.equal(fiveVoicesResults(partial),null);
  assert.throws(()=>projectFiveVoicesSave({}, {answers:partial},true,first),/all 25/);
});
test("shuffling cannot change scoring and saved order survives resuming", () => {
  const input=Object.fromEntries(FIVE_VOICES_QUESTIONS.map(q=>[q.key,q.domain==='connector'?3:1]));
  for(let attempt=0;attempt<20;attempt++){
    const order=shuffleFiveVoicesQuestions();assert.equal(new Set(order).size,25);
    assert.equal(fiveVoicesResults(Object.fromEntries(order.map(k=>[k,input[k]])))?.strongest[0].domain.key,'connector');
    const saved=projectFiveVoicesSave({}, {answers:input,order},false,first);assert.deepEqual(saved.order,order);
  }
  assert.deepEqual(normalizeFiveVoicesOrder(['q1','q1']),FIVE_VOICES_QUESTIONS.map(q=>q.key));
});
test("ranking is descending, preserves ties, and retains all five computed totals", () => {
  const values={nurturer:1,creative:2.5,guardian:2,connector:3,pioneer:1.5};
  const input=Object.fromEntries(FIVE_VOICES_QUESTIONS.map(q=>[q.key,values[q.domain]]));
  const result=fiveVoicesResults(input)!;
  assert.deepEqual(result.ranked.map(r=>r.domain.key),['connector','creative','guardian','pioneer','nurturer']);
  assert.deepEqual(result.ranked.map(r=>r.label),['Primary','Secondary','Rank 3','Rank 4','Rank 5']);
  assert.ok(fiveVoicesResults(answers())?.ranked.every(r=>r.label==='Primary · tied'));
  const saved=projectFiveVoicesSave({}, {answers:input,scores:{nurturer:999}},true,first);
  assert.deepEqual(saved.finished?.scores,{nurturer:5,creative:12.5,guardian:10,connector:15,pioneer:7.5});
});
test("retakes preserve completed results until explicit finish and retain history", () => {
  const saved=projectFiveVoicesSave({}, {answers:answers(3)},true,first);
  assert.deepEqual(projectFiveVoicesSave(saved,{answers:answers(1)},false,second),saved);
  const draft=projectFiveVoicesSave(saved,{answers:{q1:1}},false,second,first);
  assert.equal(draft.finished?.completedAt,first);
  const retaken=projectFiveVoicesSave(draft,{answers:answers(1.5)},true,second,first);
  assert.equal(retaken.history.length,1);assert.equal(retaken.history[0].scores.nurturer,15);
  assert.equal(retaken.finished?.scores.nurturer,7.5);
  assert.throws(()=>projectFiveVoicesSave(retaken,{answers:answers(3)},true,second,first),/newer result/);
  assert.deepEqual(projectFiveVoicesSave(retaken,{answers:answers(1.5)},true,second,first),retaken);
});
test("My Journey and exports require a completed result and show words and rankings", () => {
  const saved=projectFiveVoicesSave({}, {answers:answers(2.5)},true,first);
  assert.equal(completedGenericResult('five_voices_assessment',saved,first)?.kind,'five-voices');
  assert.equal(completedGenericResult('five_voices_assessment',saved,second),null);
  assert.equal(completedGenericResult('five_voices_assessment',{answers:answers()},first),null);
  const items=activityResponseItems('five_voices_assessment',saved,{},true);
  assert.equal(items.length,25);assert.ok(items.every(item=>item.response==='Often'));
  const results=activityResultItems('five_voices_assessment',saved,'submitted',first);
  assert.equal(results.length,5);assert.ok(results.every(item=>item.question.startsWith('Primary · tied')));
  assert.ok(results.every(item=>!item.response.includes('/ 15')&&item.response.includes('Working with others:')));
});
