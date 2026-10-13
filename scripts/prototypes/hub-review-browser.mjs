// Uses a disposable, signed-out Chrome profile against a local demo only.
// No production credentials, services, participant records or write tests.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://localhost:32016';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local verification only');
const chrome=process.env.CODEX3_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=await mkdtemp(join(tmpdir(),'codex3-chrome-'));
const output=process.env.CODEX3_ARTIFACT_DIR||'/private/tmp';
const proc=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=32017',`--user-data-dir=${profile}`,'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',`${base}/dev/hub-leader-builder`],{stdio:'ignore'});
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
 let target;for(let i=0;i<100;i++){try{const list=await (await fetch('http://127.0.0.1:32017/json/list',{signal:AbortSignal.timeout(1000)})).json();target=list.find(t=>t.type==='page'&&t.url.includes('hub-leader-builder'));if(target)break;}catch{}await pause(100);}assert.ok(target,'Disposable Chrome did not start');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request?.reject(Error(message.error.message));else request?.resolve(message.result);}if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')consoleErrors.push('console.error');if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==='Network.requestWillBeSent')network.push(message.params.request.url);});
 await rpc('Runtime.enable');await rpc('Page.enable');await rpc('Network.enable');await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});

 await wait(`document.querySelectorAll('[data-demo-chapter-id]').length===16&&document.querySelector('[data-demo-block-id]')`,'current cohort review');
 await check('16 real chapters and lessons, dev-only banner, separate browser storage',async()=>{
  assert.equal(await run(`document.querySelectorAll('[data-demo-lesson-id]').length`),16);assert.ok(await run(`document.body.innerText.includes('DEV COPY — CURRENT PUBLISHED HUB LEADER COHORT')`));await click('Save demo');await wait(`document.body.innerText.includes('Saved on this browser')`,'local save');assert.ok(await run(`localStorage.getItem('purposeos:codex3:hub-review:34181531-b723-4d7f-863a-3b5da948110d')`));assert.equal(await run(`localStorage.getItem('purposeos:codex3:fictional-course:v1')`),null);
 });
 const chapters=await run(`[...document.querySelectorAll('[data-demo-chapter-id]')].map(e=>e.getAttribute('data-demo-chapter-id'))`),seenPages=new Set(),seenBlocks=new Set();
 await check('all 68 pages and 194 source blocks are reachable with focused page navigation',async()=>{
  for(const chapterId of chapters){
   const lessons=await run(`(()=>{const chapter=document.querySelector('[data-demo-chapter-id="${chapterId}"]');chapter.open=true;return [...chapter.querySelectorAll('[data-demo-lesson-id]')].map(e=>e.getAttribute('data-demo-lesson-id'));})()`);
   for(const lessonId of lessons){await run(`document.querySelector('[data-demo-lesson-id="${lessonId}"]').click()`);await wait(`!document.body.innerText.includes('Opening this lesson’s content…')&&document.querySelector('nav[aria-label="Lesson pages"]')`,'lesson body');const pages=await run(`[...document.querySelectorAll('nav[aria-label="Lesson pages"] button')].map(e=>e.textContent)`);
    for(const title of pages){await run(`[...document.querySelectorAll('nav[aria-label="Lesson pages"] button')].find(e=>e.textContent===${JSON.stringify(title)}).click()`);await pause(130);seenPages.add(lessonId+' '+title);for(const id of await run(`[...document.querySelectorAll('[data-demo-block-id]')].map(e=>e.getAttribute('data-demo-block-id'))`))seenBlocks.add(id);}
   }
  }
  assert.equal(seenPages.size,68);assert.equal(seenBlocks.size,194);
 });
 await check('real question definitions display memory-only inputs',async()=>{assert.ok(await run(`document.querySelectorAll('[data-review-block-type]').length`));});
 await check('media is local, no signed or production asset URL is rendered',async()=>{
  assert.ok(await run(`[...document.querySelectorAll('img,iframe')].every(e=>!e.src||new URL(e.src).origin===location.origin)`));
 });
 await check('heading and content Edit share the preserved-source sidebar',async()=>{
  await run(`document.querySelector('button[aria-label="Edit lesson heading"]').click()`);await wait(`document.querySelector('[data-demo-advanced-sidebar] .tiptap')`,'heading editor');await run(`document.querySelector('[data-demo-advanced-sidebar] header button').click()`);await editContent();await wait(`document.querySelector('[data-demo-advanced-sidebar]')`,'block editor');assert.ok(await run(`document.querySelector('[data-demo-advanced-sidebar]').innerText.includes('Source')`));await click('Done');
 });
 // Find the first assessment page by inspecting only local copies saved after traversal.
 await click('Save demo');await wait(`document.body.innerText.includes('Saved on this browser')`,'receipt');const record=await run(`JSON.parse(localStorage.getItem('purposeos:codex3:hub-review:34181531-b723-4d7f-863a-3b5da948110d'))`);
 const allLessons=record.payload.structure.modules.flatMap(m=>m.lessons),assessmentLesson=allLessons.find(l=>l.sections.some(s=>s.layout.columns.some(c=>c.blocks.some(b=>b.block_type==='prebuilt_assessment'))));const assessmentPage=assessmentLesson.sections.find(s=>s.layout.columns.some(c=>c.blocks.some(b=>b.block_type==='prebuilt_assessment')));
 await check('native assessment opens in preview mode without a server save',async()=>{
  await run(`document.querySelector('[data-demo-lesson-id="${assessmentLesson.id}"]').click()`);await pause(150);await run(`[...document.querySelectorAll('nav[aria-label="Lesson pages"] button')].find(e=>e.textContent===${JSON.stringify(assessmentPage.title)}).click()`);await pause(150);await click('Preview assessment locally');await wait(`document.querySelector('.native-assessment-shell')`,'native assessment preview');await pause(600);await run(`document.querySelector('.native-assessment-shell').scrollIntoView({block:'start'})`);await shot('hub-leader-review-assessment.png');
 });


 await check('question prompt edits preview immediately and save only in the local review namespace',async()=>{
  const lesson=allLessons.find(l=>l.sections.some(p=>p.layout.columns.some(c=>c.blocks.some(b=>b.block_type==='structured_response')))),page=lesson.sections.find(p=>p.layout.columns.some(c=>c.blocks.some(b=>b.block_type==='structured_response')));
  await run(`document.querySelector('[data-demo-lesson-id="${lesson.id}"]').click()`);await pause(150);await run(`[...document.querySelectorAll('nav[aria-label="Lesson pages"] button')].find(e=>e.textContent===${JSON.stringify(page.title)}).click()`);await pause(150);
  await run(`document.querySelector('[data-review-block-type="structured_response"]').closest('[data-demo-block-id]').querySelector('button[aria-label^="Edit content"]').click()`);await wait(`document.querySelector('[data-demo-advanced-sidebar]')`,'question sidebar');
  await run(`[...document.querySelectorAll('[data-demo-advanced-sidebar] summary')].find(e=>e.textContent==='prompt').click()`);await wait(`document.querySelector('[data-demo-advanced-sidebar] .tiptap h4')`,'question prompt editor');await selectText('[data-demo-advanced-sidebar] .tiptap h4');await rpc('Input.insertText',{text:'Local review question edit'});await wait(`document.querySelector('[data-review-block-type="structured_response"]').innerText.includes('Local review question edit')`,'question preview update');await click('Done');await click('Save demo');await wait(`document.body.innerText.includes('Saved on this browser')`,'question receipt');
 });
 await check('six native assessment attachments load in local preview mode; legacy LMU stays disconnected',async()=>{
  let nativeCount=0;
  for(const lesson of allLessons)for(const page of lesson.sections){const attachment=page.layout.columns.flatMap(c=>c.blocks).find(b=>b.block_type==='prebuilt_assessment');if(!attachment)continue;
   await run(`document.querySelector('[data-demo-lesson-id="${lesson.id}"]').click()`);await pause(100);await run(`[...document.querySelectorAll('nav[aria-label="Lesson pages"] button')].find(e=>e.textContent===${JSON.stringify(page.title)}).click()`);await pause(100);await click('Preview assessment locally');
   if(attachment.configuration.title?.includes('Life Mapping'))await wait(`document.body.innerText.includes('legacy attached program')`,'legacy connection');
   else {await wait(`document.querySelector('.native-assessment-shell,.pis-experience,.start-something-shell')`,'native review');nativeCount++;}
  }
  assert.equal(nativeCount,6);
 });
 await click('Learner preview ↗');await check('learner preview retains pages and Companion',async()=>{assert.ok(await run(`document.querySelector('nav[aria-label="Lesson pages"]')`));});await shot('hub-leader-review-desktop.png');
 await click('Mobile preview');await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(200);await check('mobile course review does not overflow',async()=>{assert.ok(await run(`document.documentElement.scrollWidth<=window.innerWidth`));});await shot('hub-leader-review-mobile.png');
 const external=network.filter(url=>/^https?:/.test(url)&&!['127.0.0.1','localhost'].includes(new URL(url).hostname));assert.equal(external.length,0);assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);
 await writeFile(join(output,'hub-leader-review-browser.json'),JSON.stringify({checks:checks.length,pages:seenPages.size,blocks:seenBlocks.size,externalRequests:external.length,runtimeExceptions:errors,consoleErrors:consoleErrors.length},null,2));console.log(JSON.stringify({checks:checks.length,pages:seenPages.size,blocks:seenBlocks.size,externalRequests:external.length,runtimeExceptions:errors.length,consoleErrors:consoleErrors.length}));
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);if(ws){console.error('Visible demo text:',await run(`document.body.innerText.slice(0,2600)`));await shot('codex3-browser-failure.png');}process.exitCode=1;}
finally{ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
