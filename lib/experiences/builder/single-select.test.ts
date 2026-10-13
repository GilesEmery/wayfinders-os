import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseBlockConfiguration,retainSingleSelectSettings} from './block-registry.ts';
import {validateResponseData} from './response-registry.ts';
const options=[{key:'keep-one',label:'First',sortOrder:0},{key:'keep-two',label:'Second',description:'Description',sortOrder:1}];
test('all single-select displays use the same option keys and optional knowledge fields',()=>{
 for(const displayStyle of ['cards','list','dropdown']){const parsed=parseBlockConfiguration('card_selection',{options,displayStyle,cardColumns:2,questionPurpose:'knowledge',correctAnswerKey:'keep-two',points:4,feedback:'Well done'});assert.equal(parsed.ok,true);if(parsed.ok){const data=validateResponseData('single_select',{value:'keep-two'},true,parsed.value,true);assert.equal(data.ok,true);if(data.ok)assert.deepEqual(data.value,{value:'keep-two'});}}
});
test('legacy single-select keeps its configuration and renamed/reordered option identities',()=>{
 const legacy=parseBlockConfiguration('card_selection',{options});assert.equal(legacy.ok,true);if(legacy.ok)assert.equal(legacy.value.displayStyle,undefined);
 const reordered=[{...options[1],sortOrder:0,label:'Renamed'},{...options[0],sortOrder:1}];const parsed=parseBlockConfiguration('card_selection',{options:reordered});assert.equal(parsed.ok,true);if(parsed.ok)assert.equal(validateResponseData('single_select',{value:'keep-two'},true,parsed.value).ok,true);
});
test('single-select has no arbitrary fifty-option limit; multi-select retains its existing contract',()=>{
 const many=Array.from({length:60},(_,sortOrder)=>({key:`option-${sortOrder}`,label:`Option ${sortOrder}`,sortOrder}));const single=parseBlockConfiguration('card_selection',{options:many});assert.equal(single.ok,true);if(single.ok)assert.equal(validateResponseData('single_select',{value:'option-59'},true,single.value).ok,true);assert.equal(parseBlockConfiguration('checklist',{options:many,minSelections:0,maxSelections:60}).ok,false);
});
test('invalid display, missing correct keys, duplicate IDs, unauthorized choices and extra response fields are rejected',()=>{
 for(const fields of [{displayStyle:'script'},{correctAnswerKey:'unknown'},{cardColumns:3},{points:-1},{questionPurpose:'exam'}])assert.equal(parseBlockConfiguration('card_selection',{options,...fields}).ok,false);
 assert.equal(parseBlockConfiguration('card_selection',{options:[options[0],{...options[0],sortOrder:1}]}).ok,false);
 assert.equal(validateResponseData('single_select',{value:'unknown'},true,{options}).ok,false);
 assert.equal(validateResponseData('single_select',{value:'keep-one',score:99},true,{options}).ok,false);
 assert.equal(validateResponseData('single_select',{value:''},true,{options},true).ok,false);
 assert.equal(validateResponseData('single_select',{value:''},false,{options},true).ok,true);
});

test('older interfaces preserve newer display/self-check settings when editing option labels',()=>{const result=parseBlockConfiguration('card_selection',retainSingleSelectSettings({options,displayStyle:'dropdown',questionPurpose:'knowledge',correctAnswerKey:'keep-two',points:2,feedback:'Saved feedback'},{options:[{...options[0],label:'Edited'},options[1]]}));assert.equal(result.ok,true);if(result.ok){assert.equal(result.value.displayStyle,'dropdown');assert.equal(result.value.correctAnswerKey,'keep-two');assert.equal(result.value.feedback,'Saved feedback');}});
