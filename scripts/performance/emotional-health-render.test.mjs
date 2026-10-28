import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';
import {createElement} from 'react';
import * as model from '../../lib/experiences/builder/emotional-health.ts';
import {load} from './offline-module.mjs';
const results=load('components/experiences/builder/EmotionalHealthResults.tsx',{'react/jsx-runtime':jsx,'@/lib/experiences/builder/emotional-health':model});
const introduction=load('components/experiences/builder/EmotionalHealthIntroduction.tsx',{'react/jsx-runtime':jsx});
function renderPage(page,initialData={answers:{q1:3}}){
 let stateIndex=0;
 const react={useState:initial=>{const index=stateIndex++;return [index===7?page:typeof initial==='function'?initial():initial,()=>{}]},useRef:value=>({current:value})};
 const pass=({children})=>children;
 const assessment=load('components/experiences/builder/EmotionalHealthAssessment.tsx',{
  react,'react/jsx-runtime':jsx,'next/link':{default:({children,href})=>createElement('a',{href},children)},
  './NativeAssessmentShell':{NativeAssessmentShell:pass},'./AssessmentFocusFrame':{AssessmentFocusFrame:pass},
  './AssessmentLaunchCard':{AssessmentLaunchCard:()=>null,assessmentLaunchLabel:()=>''},
  './EmotionalHealthResults':results,'./EmotionalHealthIntroduction':introduction,
  '@/lib/experiences/builder/emotional-health-actions':{},'@/lib/experiences/builder/emotional-health':model,
 });
 return renderToStaticMarkup(createElement(assessment.EmotionalHealthAssessment,{initialData,autoStart:true,preview:true,route:{slug:'fixture',moduleKey:'fixture',lessonKey:'fixture',sectionKey:'fixture',blockKey:'fixture'}}));
}
test('eight pages render all forty exact statements with five stops and no implicit center answers',()=>{
 const html=Array.from({length:8},(_,page)=>renderPage(page)).join('');
 assert.equal((html.match(/type="range"/g)||[]).length,40);
 assert.equal((html.match(/aria-pressed=/g)||[]).length,200);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
 assert.equal((html.match(/max="5" step="1"/g)||[]).length,40);
 assert.match(html,/Not answered; choose a response/);
 assert.match(renderPage(7),/disabled=""[^>]*>See my results/);
 for(const question of model.EMOTIONAL_HEALTH_QUESTIONS) assert.ok(html.includes(`id="emotional-health-${question.key}"`));
});
test('introduction and four independent results preserve the supplied formative message',()=>{
 assert.match(renderPage(0,{}),/not meant to grade you or label you/);
 const answers=Object.fromEntries(model.EMOTIONAL_HEALTH_QUESTIONS.map(q=>[q.key,({self_awareness:5,self_management:3,social_awareness:2,relationship_management:4})[q.domain]]));
 const finished=model.projectEmotionalHealthSave({}, {answers},true,'2026-10-28T12:00:00Z');
 const html=renderPage(0,finished);
 for(const title of ['Self-Awareness','Self-Management','Social Awareness','Relationship Management','Enhanced skills area','Effective functioning','Area for enrichment'])assert.ok(html.includes(title));
 assert.match(html,/As you review your results, we encourage you to reflect prayerfully and honestly/);
 assert.match(html,/The Wayfinders Team/);
 assert.match(html,/Review all 40 responses/);
 assert.match(html,/Retake assessment/);
 assert.match(html,/Print results/);
 assert.ok(!html.includes('Primary'));
 assert.ok(!html.includes('Jotform'));
});

test('participant and administrator result routes admit Emotional Health saved results', () => {
  for (const file of ['app/account/results/[kind]/[resultId]/page.tsx', 'app/admin/users/[userId]/results/[kind]/[resultId]/page.tsx']) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /const KINDS = new Set<AssessmentResultKind>\(\["emotional-health"/);
  }
});
