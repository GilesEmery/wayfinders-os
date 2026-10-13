// Uses a disposable, signed-out Chrome profile against a local demo only.
// No production credentials, services, participant records or write tests.
import {readFileSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://localhost:32020';
const statePath=process.env.CODEX3_REHEARSAL_STATE_PATH;
const previousState=statePath&&existsSync(statePath)?readFileSync(statePath):undefined;
 const snapshot=JSON.parse(readFileSync('.local/course-review/hub-leader-published.json','utf8'));const block=snapshot.blocks.find(b=>b.block_type==='structured_response');
const initial=base+'/admin/trainings/'+snapshot.experience.id+'/versions/'+snapshot.version.id+'?section='+block.section_id;

assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local verification only');
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
async function click(text){await run(`(()=>{const element=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!element)throw Error('Missing button '+${JSON.stringify(text)});element.click();})()`);await pause(120);}
async function editContent(){await run(`document.querySelector('[data-demo-block-id] button[aria-label^="Edit content"]').click()`);await pause(120);}
async function input(selector,value){await run(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing input');const proto=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event(element instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`);await pause(160);}
async function selectText(selector){await run(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing text');element.closest('.tiptap').focus();const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));})()`);await pause(100);}
async function shot(name){const {data}=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,name),Buffer.from(data,'base64'));}
const saved=()=>run(`JSON.parse(localStorage.getItem('purposeos:codex3:fictional-course:v1'))`);
async function check(name,work){await work();checks.push(name);console.log('PASS '+name);}
try {
 let target;for(let i=0;i<100;i++){try{const list=await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`,{signal:AbortSignal.timeout(1000)})).json();target=list.find(t=>t.type==='page'&&new URL(t.url).hostname==='localhost');if(target)break;}catch{}await pause(100);}assert.ok(target,'Disposable Chrome did not start');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request?.reject(Error(message.error.message));else request?.resolve(message.result);}if(message.method==='Page.javascriptDialogOpening'&&message.params.type==='beforeunload')void rpc('Page.handleJavaScriptDialog',{accept:true});if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')consoleErrors.push('console.error');if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==='Network.requestWillBeSent')network.push(message.params.request.url);});
 await rpc('Runtime.enable');await rpc('Page.enable');await rpc('Network.enable');await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});

 await wait(`document.querySelector('.modern-course-builder')&&document.querySelector('.modern-builder-card')`,'integrated builder');
 await wait(`document.querySelectorAll('.modern-outline-type-icon').length===0&&document.querySelector('.companion-editor-trigger')`,'updated outline and Companion');
 await run(`(()=>{const menu=document.querySelector('.course-builder-canvas .builder-block-library');menu.open=true;[...menu.querySelectorAll('button')].find(button=>button.querySelector('strong')?.textContent==='Single Select').click();})()`);
 await wait(`document.querySelector('.single-select-canvas-editor')?.closest('.modern-builder-card')?.getAttribute('data-editor-ready')==='true'`,'created single select');
 const root='.single-select-canvas-editor';
 await check('creating, editing, duplicating, deleting and reordering options retain stable identifiers',async()=>{
  const original=await run(`[...document.querySelectorAll('${root} input[name^=option_key_]')].map(e=>e.value)`);
  await input(`${root} input[name=prompt]`,'Which area would you like to grow in?');await input(`${root} textarea[name=instructions]`,'Select one answer.');await input(`${root} input[name=option_label_0]`,'Intentional relationships');
  await run(`document.querySelector('${root} button[aria-label="Move option 1 down"]').click()`);await pause(100);
  assert.deepEqual(await run(`[...document.querySelectorAll('${root} input[name^=option_key_]')].map(e=>e.value)`),[original[1],original[0]]);
  await run(`document.querySelector('${root} button[aria-label="Duplicate option 1"]').click()`);await pause(100);
  assert.equal(await run(`new Set([...document.querySelectorAll('${root} input[name^=option_key_]')].map(e=>e.value)).size`),3);
  await run(`document.querySelector('${root} button[aria-label="Delete option 2"]').click()`);await pause(100);
  await run(`document.querySelector('${root} input[name=option_label_1]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);await pause(100);
  assert.equal(await run(`document.querySelectorAll('${root} [data-option-key]').length`),3);
  await input(`${root} input[name=option_label_2]`,'Everyday mission');
  await run(`(()=>{const rows=document.querySelectorAll('${root} [data-option-key]');const transfer=new DataTransfer();rows[0].querySelector('[draggable]').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));rows[2].dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));})()`);await pause(100);
  assert.equal(await run(`document.querySelector('${root} input[name=option_key_2]').value`),original[1]);
 });
 await check('Cards, List and Dropdown preserve the selected answer without participant saves',async()=>{
  await run(`document.querySelector('${root} .single-select-live-preview input[name=response]').click()`);const selected=await run(`document.querySelector('${root} .single-select-live-preview input[name=response]:checked').value`);
  for(const style of ['list','dropdown','cards']){await run(`document.querySelector('${root} input[name=display_style][value="${style}"]').click()`);await pause(100);assert.equal(await run(`document.querySelector('${root} .single-select-live-preview select[name=response]')?.value??document.querySelector('${root} .single-select-live-preview input[name=response]:checked')?.value`),selected);}
  await run(`document.querySelector('${root} input[name=requirement_level][value=required]').click()`);await pause(100);
  assert.equal(await run(`document.querySelector('${root} .single-select-live-preview input[name=response]').required`),true);
  await run(`document.querySelector('${root} .single-select-response-settings').open=true`);await input(`${root} select[name=question_purpose]`,'knowledge');await input(`${root} select[name=correct_answer_key]`,selected);await input(`${root} input[name=points]`,'3');await input(`${root} textarea[name=feedback]`,'Consider your next step.');
  await run(`document.querySelector('${root}>form').requestSubmit()`);await pause(800);await rpc('Page.reload');
  await wait(`document.querySelector('.single-select-canvas-editor input[name=prompt]')?.value==='Which area would you like to grow in?'`,'saved question reload');
  assert.equal(await run(`document.querySelector('${root} select[name=question_purpose]').value`),'knowledge');
  assert.equal(await run(`document.querySelector('${root} select[name=correct_answer_key]').value`),selected);
  assert.equal(await run(`document.querySelector('${root} input[name=points]').value`),'3');
 });
 await run(`document.querySelector('.single-select-canvas-editor .single-select-response-settings').open=false`);
 // The editor is in its own scroll lane; capture the visible preview rather than the entire page.
 await run(`document.querySelector('.single-select-live-preview').scrollIntoView({block:'center'})`);await pause(120);await shot('single-select-cards-preview.png');
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.ok(await run(`document.documentElement.scrollWidth<=innerWidth`));
 assert.ok(await run(`getComputedStyle(document.querySelector('.single-select-choices.is-cards .single-select-option-grid')).gridTemplateColumns.split(' ').length===1`));
 assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);console.log('Single Select editor checks passed');
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);if(ws){console.error('Visible demo text:',await run(`document.body.innerText.slice(0,2600)`));await shot('codex3-browser-failure.png');}process.exitCode=1;}
finally{if(statePath){if(previousState)writeFileSync(statePath,previousState);else if(existsSync(statePath))unlinkSync(statePath);}ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
