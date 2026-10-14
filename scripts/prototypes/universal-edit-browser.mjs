// Uses a disposable, signed-out Chrome profile against a local demo only.
// No production credentials, services, participant records or write tests.
import {readFileSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://127.0.0.1:32020';
 const snapshot=JSON.parse(readFileSync('.local/course-review/hub-leader-published.json','utf8'));const section=snapshot.sections[0];
const initial=base+'/admin/trainings/'+snapshot.experience.id+'/versions/'+snapshot.version.id+'?section='+section.id;

const statePath=process.env.CODEX3_REHEARSAL_STATE_PATH;assert.ok(statePath&&statePath.includes('purposeos-integrated-builder-'),'Explicit isolated rehearsal state path required');
const priorState=existsSync(statePath)?readFileSync(statePath):undefined;const state=priorState?JSON.parse(priorState):{attachments:{},blocks:{},resources:[]};
const types=['heading','rich_text','callout','video','image','pdf_reader','document','download','external_link','structured_response','reflection','card_selection','checklist','check_in','prebuilt_assessment'];
const {getBlockDefinition}=await import('../../lib/experiences/builder/block-registry.ts');
const column=snapshot.columns.find(c=>c.section_id===section.id);assert.ok(column);const blockIds={};state.definitions??={};
for(const [index,type] of types.entries()){
 const id='bbbbbbbb-bbbb-4bbb-8bbb-'+String(index+1).padStart(12,'0');blockIds[type]=id;const d=getBlockDefinition(type),content={...d.defaultConfiguration(),future:'retain'};
 if(type==='heading'){content.text='Header original';content.body='Body original';}else if(type==='rich_text'){content.title='Header original';content.text='Body original';}else if(type==='callout'){content.title='Header original';content.body='Body original';content.calloutStyle='insight';}else if(!d.supportsResponse){content.title='Header original';content.description='Body original';}
 if(type==='image')content.alt='Original alternative text';if(type==='external_link')content.url='https://example.com/resource';if(type==='prebuilt_assessment')content.assessmentExperienceId=JSON.parse(readFileSync('.local/course-review/hub-leader-assessments.json','utf8'))[0].id;
 state.blocks[id]={...snapshot.blocks[0],id,block_type:type,block_key:'universal-'+type,section_id:section.id,column_id:column.id,lesson_id:section.lesson_id,content,settings:{future:'retain'},updated_at:'r1',status:'active',visibility:'visible',requirement_level:'optional',completion_rule:d.defaultCompletionRule,sort_order:100+index,custom_renderer_key:null};
 if(d.supportsResponse){const did='cccccccc-cccc-4ccc-8ccc-'+String(index+1).padStart(12,'0');state.definitions[did]={...snapshot.definitions[0],id:did,block_id:id,lesson_id:section.lesson_id,experience_version_id:snapshot.version.id,label:'Header original',instructions:'Body original',configuration:content,is_required:false,response_type:d.response.responseType,updated_at:'d1'};}
}
writeFileSync(statePath,JSON.stringify(state));
assert.ok(['127.0.0.1' ,'localhost'].includes(new URL(base).hostname),'Local verification only');
const cdpPort=process.env.CODEX3_CDP_PORT||'32021';
const chrome=process.env.CODEX3_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=await mkdtemp(join(tmpdir(),'codex3-chrome-'));
const output=process.env.CODEX3_ARTIFACT_DIR||'/private/tmp';
const proc=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',`--remote-debugging-port=${cdpPort}`,`--user-data-dir=${profile}`,'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',initial],{stdio:'ignore'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const pending=new Map(),errors=[],consoleErrors=[],network=[],checks=[];let serial=0;
async function rpc(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function run(expression,sessionId){const {result,exceptionDetails}=await rpc('Runtime.evaluate',{expression:`(async()=>{const value=await (${expression});return value instanceof Node?true:value;})()`,returnByValue:true,awaitPromise:true},sessionId);if(exceptionDetails)throw Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;}
async function wait(expression,label,timeout=45000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await run(expression))return;await pause(150);}throw Error('Timed out: '+label);}
async function input(selector,value){await run(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing input');const proto=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event(element instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`);await pause(160);}
async function selectText(selector){await run(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing text');element.closest('.tiptap').focus();const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));})()`);await pause(100);}
async function shot(name){const {data}=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,name),Buffer.from(data,'base64'));}
async function check(name,work){await work();checks.push(name);console.log('PASS '+name);}
try {
 let target;for(let i=0;i<100;i++){try{const list=await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`,{signal:AbortSignal.timeout(1000)})).json();target=list.find(t=>t.type==='page'&&['localhost','127.0.0.1'].includes(new URL(t.url).hostname));if(target)break;}catch{}await pause(100);}assert.ok(target,'Disposable Chrome did not start');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request?.reject(Error(message.error.message));else request?.resolve(message.result);}if(message.method==='Page.javascriptDialogOpening'&&message.params.type==='beforeunload')void rpc('Page.handleJavaScriptDialog',{accept:true});if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')consoleErrors.push(message.params.args.map(arg=>arg.value??arg.description).join(' '));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==='Network.requestWillBeSent')network.push(message.params.request.url);});
 await rpc('Runtime.enable');await rpc('Page.enable');await rpc('Network.enable');await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});



 await wait(`document.querySelector('.universal-content-main')`,'shared editor');
 for(const type of types){await check(type+': edit, preview, selected-range formatting, save/reload, cancel and reset',async()=>{
  const id=blockIds[type],root=`.modern-builder-card[data-block-id="${id}"]`;
  await wait(`document.querySelector('${root}')?.getAttribute('data-editor-ready')==='true'`,'hydrated '+type);
  await run(`document.querySelector('${root} button[aria-label^="Edit "]').click()`);
  const form=`.modern-builder-controls[data-presentation-block-id="${id}"] form[data-managed-save]`;await wait(`document.querySelector('${form} [data-universal-text="header"] .tiptap')`,'advanced '+type);
  assert.equal(await run(`document.querySelector('${form} .universal-additional-customization').open`),false);
  for(const [field,value] of [['header','Header '+type],['body','Body '+type]]){
   const selector=`${form} [data-universal-text="${field}"] .tiptap`;
   await run(`document.querySelector('${selector}').focus()`);await rpc('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:4});await rpc('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:4});await rpc('Input.insertText',{text:value});await pause(100);
   await selectText(selector+' p');await input(`${form} select[aria-label="Text style"]`,field==='header'?'h2':'h4');await run(`document.querySelector('${form} button[aria-label="Bold"]').click()`);await pause(90);
   assert.ok(await run(`window.getSelection().toString().length>0`),'highlight retained');
   assert.ok(await run(`document.querySelector('${form} [data-universal-text="${field}"] .tiptap strong')`),'correct field bold');
  }
  if(['video','image','pdf_reader'].includes(type)){for(const position of ['above','between','below']){await run(`(()=>{const select=[...document.querySelectorAll('${form} select')].find(e=>e.querySelector('option[value=above]'));Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'${position}');select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(100);const order=await run(`(()=>{const container=document.querySelector('${form}').closest('[data-demo-advanced-sidebar]').querySelector('.universal-participant-preview .course-item-presentation');return [...container.children].map(e=>e.classList.contains('course-item-content')?'media':'text');})()`);assert.equal(order.indexOf('media'),position==='above'?0:position==='between'?1:2);}}
  if(type==='checklist'){const keySelector=`${form} input[type="number"][min="0"]`;await input(keySelector,'999');await run(`document.querySelector('${form}').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);await wait(`document.querySelector('${form} [role=alert]')`,'server validation error feedback');await run(`(()=>{[...document.querySelectorAll('${form} button')].find(e=>e.textContent==='Cancel').click();})()`);await pause(120);for(const [field,value] of [['header','Header '+type],['body','Body '+type]]){await run(`document.querySelector('${form} [data-universal-text="${field}"] .tiptap').focus()`);await rpc('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:4});await rpc('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:4});await rpc('Input.insertText',{text:value});await selectText(`${form} [data-universal-text="${field}"] .tiptap p`);await input(`${form} select[aria-label="Text style"]`,field==='header'?'h2':'h4');await run(`document.querySelector('${form} button[aria-label="Bold"]').click()`);}}
  const headerBefore=await run(`document.querySelector('${form} [data-universal-text="header"] .tiptap').innerHTML`);assert.ok(headerBefore.includes('h2'));
  await run(`document.querySelector('${form}').requestSubmit()`);await wait(`document.querySelector('${form} [role=status]')?.textContent.includes('Changes saved')`,'save '+type);
  let stored=JSON.parse(readFileSync(statePath,'utf8'));assert.equal(stored.blocks[id].content.future,'retain');assert.equal(stored.blocks[id].settings.future,'retain');assert.ok(stored.blocks[id].settings.universalEdit.headerFormatting.includes('**'));assert.equal(stored.blocks[id].settings.textPresentation.header,undefined);
  await run(`window.__testReloadMarker=1`);await rpc('Page.reload');await wait(`window.__testReloadMarker===undefined`,'new reload document');await wait(`document.querySelector('${root}')?.getAttribute('data-editor-ready')==='true'`,'reload '+type);await run(`document.querySelector('${root} button[aria-label^="Edit "]').click()`);await wait(`document.querySelector('${form} [data-universal-text="body"] .tiptap')`,'reopened '+type);
  assert.equal(await run(`document.querySelector('${form} [data-universal-text="header"] .tiptap').textContent`),'Header '+type);
  assert.equal(await run(`document.querySelector('${form} [data-universal-text="body"] .tiptap').textContent`),'Body '+type);
  await run(`document.querySelector('${form} [data-universal-text="header"] .tiptap').focus()`);await rpc('Input.insertText',{text:'Unsaved'});await pause(100);await run(`(()=>{[...document.querySelectorAll('${form} button')].find(e=>e.textContent==='Cancel').click();})()`);await pause(200);assert.equal(await run(`document.querySelector('${form} [data-universal-text="header"] .tiptap').textContent`),'Header '+type);
  await run(`document.querySelector('${form} .universal-additional-customization').open=true`);await input(`${form} input[placeholder="Course default"][min="0"][max="120"]`,'20');
  await run(`(()=>{[...document.querySelectorAll('${form} button')].find(e=>e.textContent==='Reset customization to course defaults').click();})()`);await pause(100);
  assert.ok(await run(`document.querySelector('${form} [data-universal-text="header"] .tiptap strong [data-course-text-size="h2"]')`));assert.equal(await run(`document.querySelector('${form} input[placeholder="Course default"][min="0"][max="120"]').value`),'');
  await run(`document.querySelector('${form}').requestSubmit()`);await wait(`document.querySelector('${form} [role=status]')?.textContent.match(/saved|No changes/)`,'reset save');
  await run(`document.querySelector('.builder-side-panel button[aria-label="Close advanced editor"]')?.click()`);
  // Close via actual shared side panel button if its label differs.
  await run(`(()=>{const panel=document.querySelector('${form}')?.closest('[data-demo-advanced-sidebar]');panel?.querySelector('button[aria-label^="Close"]')?.click();})()`);
 });}
 await rpc('Page.navigate',{url:base+'/dev/universal'});await wait(`document.querySelector('[data-learner-block-id]')`,'native learner renderer');
 await check('desktop, tablet and mobile native learner rendering remains readable',async()=>{for(const [width,height] of [[1440,1000],[820,1180],[390,844]]){await rpc('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await pause(150);assert.ok(await run(`document.documentElement.scrollWidth<=innerWidth`),'horizontal overflow at '+width);for(const id of Object.values(blockIds))assert.ok(await run(`document.querySelector('[data-learner-block-id="${id}"] .universal-content-view')`));}for(const type of ['check_in','checklist']){const selector=`[data-learner-block-id="${blockIds[type]}"] input[type=checkbox]`;assert.equal(await run(`document.querySelector('${selector}').disabled`),false);await run(`document.querySelector('${selector}').click()`);assert.equal(await run(`document.querySelector('${selector}').checked`),true);}assert.equal(await run(`document.querySelectorAll('[data-learner-block-id="${blockIds.check_in}"] input[type=checkbox]').length`),1);assert.equal(await run(`getComputedStyle(document.querySelector('[data-learner-block-id="${blockIds.heading}"] .universal-content-heading .course-text-size.is-h2')).fontSize`),await run(`getComputedStyle(document.querySelector('.participant-course')).getPropertyValue('--course-h2-size').trim()||'28px'`));await shot('codex3-universal-mobile.png');});
 assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);assert.equal(network.filter(url=>/^https?:/.test(url)&&!['localhost','127.0.0.1'].includes(new URL(url).hostname)).length,0);console.log('Universal browser checks passed: '+checks.length);
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);console.error('Console errors:',consoleErrors);if(ws){console.error('Visible text:',await run(`document.body.innerText.slice(-3500)`));await shot('codex3-universal-failure.png');}process.exitCode=1;}
finally{if(priorState)writeFileSync(statePath,priorState);else if(existsSync(statePath))unlinkSync(statePath);ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
