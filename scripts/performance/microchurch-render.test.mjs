import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';
import {createElement} from 'react';
import * as model from '../../lib/experiences/builder/microchurch.ts';
import {load} from './offline-module.mjs';
const results=load('components/experiences/builder/MicrochurchResults.tsx',{'react/jsx-runtime':jsx,'@/lib/experiences/builder/microchurch':model});
function renderStage(stage,initialData={}){
 let stateIndex=0;
 const react={useState:initial=>[stateIndex++===4?stage:initial,()=>{}],useEffect:()=>{},useRef:value=>({current:value})};
 const pass=({children})=>children;
 const assessment=load('components/experiences/builder/MicrochurchAssessment.tsx',{
  react,'react/jsx-runtime':jsx,'lucide-react':{Printer:()=>null},'./NativeAssessmentShell':{NativeAssessmentShell:pass},'./AssessmentFocusFrame':{AssessmentFocusFrame:pass},
  './AssessmentLaunchCard':{AssessmentLaunchCard:()=>null,assessmentLaunchLabel:()=>''},'./MicrochurchResults':results,
  '@/lib/experiences/builder/microchurch-actions':{},'@/lib/experiences/builder/assessment-return':{},'@/lib/experiences/builder/microchurch':model,
 });
 return renderToStaticMarkup(createElement(assessment.MicrochurchAssessment,{initialData,autoStart:true,preview:true,route:{slug:'microchurch',moduleKey:'microchurch',lessonKey:'worship-community-mission',sectionKey:'assessment',blockKey:'microchurch'}}));
}
test('all 21 statements have five labeled radio choices across three stages',()=>{
 const html=[1,2,3].map(stage=>renderStage(stage)).join('');
 assert.equal((html.match(/type="radio"/g)||[]).length,105);
 assert.equal((html.match(/Most accurate/g)||[]).length,21);
 for(let n=1;n<=21;n++)assert.match(html,new RegExp(`id="bridges-${Math.ceil(n/7)}-q${n}"`));
});
test('review, completed results and printable source material render without runtime errors',()=>{
 assert.match(renderStage(4),/Complete assessment/);
 const finished=model.projectMicrochurchSave({}, {ratings:Array(21).fill(4)},'2026-10-26T12:00:00Z',true);
 const html=renderStage(0,finished);
 assert.match(html,/Category Score/);assert.match(html,/Only Worship: Hypocrisy/);assert.match(html,/Only Community: Idolatry/);assert.match(html,/Only Mission: Pride/);
 assert.equal((html.match(/class="microchurch-score">28/g)||[]).length,3);
 assert.match(html,/Print \/ Save as PDF/);
 assert.match(renderStage(0),/ecclesial minimum/);
});
