import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import * as jsx from 'react/jsx-runtime';
import * as apest from '../../lib/experiences/builder/apest.ts';
import * as voices from '../../lib/experiences/builder/five-voices.ts';
import {load} from './offline-module.mjs';
const {AssessmentAnswerChoices}=load('components/experiences/builder/AssessmentAnswerChoices.tsx',{'react/jsx-runtime':jsx});
const pass=({children})=>children;
for(const [name,model,modelPath,prefix] of [['Apest',apest,'apest','APEST'],['FiveVoices',voices,'five-voices','FIVE_VOICES']]){
 const results=load(`components/experiences/builder/${name}Results.tsx`,{'react/jsx-runtime':jsx,[`@/lib/experiences/builder/${modelPath}`]:model});
 function render(answers,page=0,finished=false,inspect=false){
  const updates=[],focus=[];
  let index=0;
  const react={useState:value=>{const i=index++;return [i===7?page:i===8?true:typeof value==='function'?value():value,next=>updates.push({index:i,value:next})]},useRef:value=>({current:value})};
  const assessment=load(`components/experiences/builder/${name}Assessment.tsx`,{
   fixture:{document:{getElementById:id=>({focus:()=>focus.push(id)})}},react,'react/jsx-runtime':jsx,'next/link':{default:pass},'./AssessmentAnswerChoices':{AssessmentAnswerChoices},
   './NativeAssessmentShell':{NativeAssessmentShell:pass},'./AssessmentFocusFrame':{AssessmentFocusFrame:pass},'./AssessmentLaunchCard':{AssessmentLaunchCard:pass},
   [`./${name}Results`]:results,[`./${name}Introduction`]:{[`${name}Introduction`]:pass},
   [`@/lib/experiences/builder/${modelPath}`]:model,[`@/lib/experiences/builder/${modelPath}-actions`]:{},
  },'const {document}=require("fixture");\n'+readFileSync(`components/experiences/builder/${name}Assessment.tsx`,'utf8'));
  const props={initialData:{answers,...(finished?{finished:{answers,completedAt:'2026-11-09T12:00:00Z'}}:{})},autoStart:true,preview:true,route:{blockKey:'fixture'}};
  if(inspect)return {tree:assessment[`${name}Assessment`](props),updates,focus};
  return renderToStaticMarkup(createElement(assessment[`${name}Assessment`],{initialData:{answers,...(finished?{finished:{answers,completedAt:'2026-11-09T12:00:00Z'}}:{})},autoStart:true,preview:true,route:{blockKey:'fixture'}}));
 }
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
 const questions=model[`${prefix}_QUESTIONS`];
 const answers=n=>Object.fromEntries(questions.slice(0,n).map(q=>[q.key,2]));
 test(`${name}: section jumps, Next and Back cannot leave an incomplete page`,()=>{
  for(const label of ['Section 2','Next →']){
   const h=render(answers(4),0,false,true);
   const button=find(h.tree,node=>node.type==='button'&&(String(node.props['aria-label']??'').startsWith(label)||node.props.children===label));
   assert.ok(button);button.props.onClick();
   assert.ok(!h.updates.some(u=>u.index===7));
   assert.ok(h.updates.some(u=>String(u.value).includes('still missing')));
   assert.equal(h.focus.length,1);
  }
  const back=render(answers(5),1,false,true);
  find(back.tree,node=>node.type==='button'&&node.props.children==='← Back').props.onClick();
  assert.ok(!back.updates.some(u=>u.index===7));
  const ready=render(answers(5),0,false,true);
  find(ready.tree,node=>node.type==='button'&&node.props.children==='Next →').props.onClick();
  assert.ok(ready.updates.some(u=>u.index===7&&u.value===1));
 });
 test(`${name}: all choices start blank; selecting the middle option is explicit`,()=>{
  const blank=render({});assert.equal((blank.match(/type="radio"/g)||[]).length,25);assert.equal((blank.match(/checked=""/g)||[]).length,0);assert.doesNotMatch(blank,/type="range"/);
  assert.equal((render(answers(1)).match(/checked=""/g)||[]).length,1);
 });
 test(`${name}: nineteen responses show six missing and no results`,()=>{
  const html=render(answers(19),4);assert.match(html,/6 questions still need/);assert.match(html,/Your assessment is not complete yet/);assert.match(html,/Section 4: 1 unanswered/);assert.match(html,/Section 5: 5 unanswered/);assert.match(html,/<button[^>]*disabled=""[^>]*>Complete assessment &amp; see results<\/button>/);assert.doesNotMatch(html,/Assessment complete ·/);
 });
 test(`${name}: all answers still require explicit completion; saved results confirm completion`,()=>{
  assert.match(render(answers(25)),/All 25 questions answered — ready to complete/);
  assert.doesNotMatch(render(answers(25)),/Assessment complete ·/);
  const complete=render(answers(25),0,true);assert.match(complete,/Assessment complete · 25 of 25 answered/);assert.match(complete,/apest-profile-results/);
 });
}
