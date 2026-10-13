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
 const snapshot=JSON.parse(readFileSync('.local/course-review/hub-leader-published.json','utf8'));const block=snapshot.blocks.find(b=>b.block_type==='document');
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
 await wait(`document.querySelector('.file-canvas-editor')?.closest('.modern-builder-card')?.getAttribute('data-editor-ready')==='true'`,'file card');
 await check('files use resource selection/upload and a folder card with matching actions',async()=>{
  const root='.file-canvas-editor';
  assert.ok(await run(`document.querySelector('${root} select[name=resource_id]')`));
  assert.ok(await run(`document.querySelector('${root} input[type=file]').accept.includes('.png')`));
  assert.ok(await run(`document.querySelector('${root} .file-resource-icon')`));
  assert.ok(await run(`document.querySelector('${root} .is-resource-only strong').textContent.trim()`));
  assert.equal(await run(`getComputedStyle(document.querySelector('${root} .is-resource-only')).backgroundColor`),'rgb(0, 84, 161)');
  assert.equal(await run(`getComputedStyle(document.querySelector('${root} .is-resource-only strong')).color`),'rgb(255, 255, 255)');
  assert.equal(await run(`document.querySelectorAll('${root} .participant-pdf-actions a').length`),2);
  assert.equal(await run(`document.querySelectorAll('${root} .participant-pdf-actions a svg').length`),2);
  assert.equal(await run(`document.querySelector('${root} .participant-pdf-actions a').target`),'_blank');
 });
 await check('selected attachment remains visible after saving and reloading',async()=>{
  const root='.file-canvas-editor';
  const previousHref=await run(`document.querySelector('${root} .participant-pdf-actions a').getAttribute('href')`);
  const id=await run(`(()=>{const s=document.querySelector('${root} select[name=resource_id]');return [...s.options].find(o=>o.value&&o.value!==s.value).value})()`);
  await input(`${root} select[name=resource_id]`,id);
  await run(`document.querySelector('${root} select[name=resource_id]').form.requestSubmit()`);
  await wait(`document.querySelector('.file-canvas-editor select[name=resource_id]')?.value==='${id}'`,'selected resource retained');
  await wait(`document.querySelector('.file-canvas-editor .participant-pdf-actions a')?.getAttribute('href')!==${JSON.stringify(previousHref)}`,'selected file preview');
  const href=await run(`document.querySelector('${root} .participant-pdf-actions a').getAttribute('href')`);
  await input(`${root}>form input[name=title]`,'Saved resource title');
  await run(`document.querySelector('${root}>form').requestSubmit()`);await pause(1000);
  assert.equal(await run(`document.querySelector('${root} .participant-pdf-actions a').getAttribute('href')`),href);
  assert.equal(await run(`document.querySelector('${root} select[name=resource_id]').value`),id);
  await rpc('Page.reload');await wait(`document.querySelector('.file-canvas-editor>form input[name=title]')?.value==='Saved resource title'`,'saved metadata reload');
  assert.equal(await run(`document.querySelector('${root} select[name=resource_id]').value`),id);
  assert.equal(await run(`document.querySelector('${root} .participant-pdf-actions a').getAttribute('href')`),href);
 });
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.ok(await run(`document.documentElement.scrollWidth<=innerWidth`));
 assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);console.log('File resource card checks passed');
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);if(ws){console.error('Visible demo text:',await run(`document.body.innerText.slice(0,2600)`));await shot('codex3-browser-failure.png');}process.exitCode=1;}
finally{if(statePath){if(previousState)writeFileSync(statePath,previousState);else if(existsSync(statePath))unlinkSync(statePath);}ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
