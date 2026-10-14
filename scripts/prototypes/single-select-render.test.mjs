import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {responseBlock as block} from './choice-render-fixture.mjs';
const configuration={options:[{key:'first',label:'First answer',sortOrder:0},{key:'second',label:'Second answer',description:'Supporting description',sortOrder:1}],questionPurpose:'knowledge',correctAnswerKey:'second',points:3,feedback:'Reflect on your next step.'};
function render(displayStyle='cards',status='draft',required=true){return renderToStaticMarkup(React.createElement(block.ParticipantResponseBlock,{context:{definition:{id:'definition',label:'Choose one answer',is_required:required,configuration},response:{status,response_data:{value:'second'},updated_at:'revision'}},route:{},configuration:{...configuration,displayStyle},responseKind:'single_select'}));}
test('all displays submit the same stable response key and preserve revisions, accessible labels and required behavior',()=>{
 for(const style of ['cards','list','dropdown']){const html=render(style);assert.match(html,/name="response_revision" value="revision"/);assert.match(html,/name="response"/);assert.match(html,/value="second"/);assert.match(html,/Choose one answer/);assert.match(html,/required=""/);assert.doesNotMatch(html,/Reflect on your next step/);}
 assert.doesNotMatch(render('list','draft',false),/required=""/);
});
test('finalized answers are read-only and show self-check feedback only after submission',()=>{const html=render('cards','finalized');assert.match(html,/Second answer/);assert.match(html,/Correct.*3 self-check points/);assert.match(html,/Reflect on your next step/);assert.doesNotMatch(html,/name="response"/);assert.doesNotMatch(html,/Save draft/);});
