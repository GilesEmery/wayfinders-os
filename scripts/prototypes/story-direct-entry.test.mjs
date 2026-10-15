import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';import * as React from 'react';import * as jsx from 'react/jsx-runtime';import {renderToStaticMarkup} from 'react-dom/server';import {load} from '../performance/offline-module.mjs';
function render(response,startInEditor){
 const file='components/experiences/lmu/SuccessStoriesModule.tsx';const source=readFileSync(file,'utf8').replaceAll('crypto.randomUUID()',"'synthetic-draft'");
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const imports=Object.fromEntries([...compiled.matchAll(/require\("([^"]+)"\)/g)].map(m=>[m[1],new Proxy({},{get:()=>()=>null})]));
 imports.react=React;imports['react/jsx-runtime']=jsx;imports['next/navigation']={useRouter:()=>({push(){}})};
 imports['./useOriginalProgress']={useOriginalProgress:()=>[{moduleId:'success-stories',responses:response}]};
 imports['./LMUShell']={LMUShell:({children})=>React.createElement('main',null,children)};
 imports['@/modules/lmu/success-stories/config']={SUCCESS_STORIES_MINIMUM:5,SUCCESS_STORIES_MAXIMUM:15,successStoryAgeRanges:['5–10','10–15']};
 imports['@/lib/experiences/lmu/ranking/pairwise']={getAdaptiveTopKStep:()=>({complete:false})};
 const {SuccessStoriesModule}=load(file,imports,source);return renderToStaticMarkup(React.createElement(SuccessStoriesModule,{startInEditor}));
}
test('direct entry opens the Title and story fields without the introduction',()=>{const html=render({stories:[]},true);assert.match(html,/Save Story/);assert.match(html,/story-editor-shell/);assert.match(html,/What happened\?/);assert.ok(!html.includes('Start My Success Stories'));});
test('existing unfinished draft is preserved when direct entry opens',()=>{const html=render({stories:[],draft:{id:'unfinished',title:'My existing draft',story:'Keep everything I already wrote.',reflection:'Existing reflection'}},true);assert.match(html,/My existing draft/);assert.match(html,/Keep everything I already wrote/);assert.match(html,/Existing reflection/);});
test('normal module link retains its introduction',()=>{assert.match(render({stories:[]},false),/Start My Success Stories/);});
test('direct link respects the 15-story maximum and shows existing stories',()=>{const stories=Array.from({length:15},(_,i)=>({id:'s'+i,title:'Story '+i,story:'Saved story text',reflection:''}));const html=render({stories},true);assert.match(html,/You have captured 15 Success Stories/);assert.ok(!html.includes('Add Your Story'));});
