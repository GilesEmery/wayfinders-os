// Uses a disposable, signed-out Chrome profile against a local demo only.
// No production credentials, services, participant records or write tests.
import {readFileSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://localhost:32020';
 const snapshot=JSON.parse(readFileSync('.local/course-review/hub-leader-published.json','utf8'));const section=snapshot.sections[0];
const initial=base+'/admin/trainings/'+snapshot.experience.id+'/versions/'+snapshot.version.id+'?section='+section.id;

const statePath=process.env.CODEX3_REHEARSAL_STATE_PATH;assert.ok(statePath&&statePath.includes('purposeos-integrated-builder-'),'Explicit isolated rehearsal state path required');
const priorState=existsSync(statePath)?readFileSync(statePath):undefined;const state=priorState?JSON.parse(priorState):{attachments:{},blocks:{},resources:[]};
const resources=JSON.parse(readFileSync('.local/course-review/hub-leader-resources.json','utf8')).resources;const manifest=JSON.parse(readFileSync('.local/course-review/asset-manifest.json','utf8'));const images=resources.filter(r=>r.resource_type==='image'&&r.storage_path&&manifest.assets.some(a=>a.id===r.id));const originalHero=images[0]?.id;assert.ok(originalHero);state.sections??={};state.sections[section.id]={...state.sections[section.id],title:section.title,description:section.description,settings:{...section.settings,hero_resource_id:originalHero,legacySubtitle:'Preserve legacy subtitle',lessonHeading:{futureField:'retain'}}};writeFileSync(statePath,JSON.stringify(state));
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
 ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request?.reject(Error(message.error.message));else request?.resolve(message.result);}if(message.method==='Page.javascriptDialogOpening'&&message.params.type==='beforeunload')void rpc('Page.handleJavaScriptDialog',{accept:true});if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')consoleErrors.push(message.params.args.map(arg=>arg.value??arg.description).join(' '));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==='Network.requestWillBeSent')network.push(message.params.request.url);});
 await rpc('Runtime.enable');await rpc('Page.enable');await rpc('Network.enable');await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});


 await wait(`document.querySelector('button[aria-label="Edit Lesson heading"]')?.closest('.modern-builder-card')?.getAttribute('data-editor-ready')==='true'&&document.querySelector('form[id^="lesson-heading-"]')`,'lesson heading');
 const logPath=statePath.replace('rehearsal-state.json','rehearsal-actions.jsonl'),saves=()=>existsSync(logPath)?readFileSync(logPath,'utf8').split('\n').filter(line=>line.includes('"name":"saveLessonHeadingAction"')).length:0;
 await check('opening and no-op save preserve source metadata and hero',async()=>{
 const before=saves();await run(`document.querySelector('form[id^="lesson-heading-"]').requestSubmit()`);await pause(100);assert.equal(saves(),before);
 await run(`document.querySelector('button[aria-label="Edit Lesson heading"]').click()`);await wait(`document.querySelector('.lesson-heading-advanced [data-universal-text="introduction"] .tiptap')`,'advanced heading');
 assert.equal(await run(`document.querySelector('.lesson-heading-advanced .universal-additional-customization').open`),false);
 assert.equal(await run(`getComputedStyle(document.querySelector('.lesson-heading-advanced [data-universal-text="titleFormatting"] .tiptap p')).fontSize`),'16px');
 assert.equal(await run(`document.querySelector('.lesson-heading-advanced').textContent.includes('Lesson Content')`),false);
 assert.ok(await run(`document.querySelector('.lesson-heading-advanced .participant-lesson-hero img')`));
 });
 await check('editing section-only title and rich introduction preserves chapter, group and hero',async()=>{
 await run(`(()=>{const p=document.querySelector('.lesson-heading-advanced [data-universal-text="titleFormatting"] .tiptap p');p.closest('.tiptap').focus();p.textContent='Local review title';p.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));})()`);await pause(150);
 await selectText('.lesson-heading-advanced [data-universal-text="titleFormatting"] .tiptap p');await run(`document.querySelector('.lesson-heading-advanced button[aria-label="Bold"]').click()`);await pause(80);
 await run(`(()=>{const p=document.querySelector('.lesson-heading-advanced [data-universal-text="introduction"] .tiptap p');p.closest('.tiptap').focus();p.textContent='Introduction for review';p.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));})()`);await pause(150);
 await selectText('.lesson-heading-advanced [data-universal-text="introduction"] .tiptap p');await run(`document.querySelector('.lesson-heading-advanced button[aria-label="Bold"]').click()`);await pause(80);
 const before=saves();await run(`document.querySelector('form[id^="lesson-heading-"]').requestSubmit()`);await wait(`document.querySelector('.lesson-heading-advanced [role=status]')?.textContent==='Changes saved.'`,'save receipt');assert.equal(saves(),before+1);
 const saved=JSON.parse(readFileSync(statePath,'utf8')).sections[section.id];assert.equal(saved.title,'Local review title');assert.ok(saved.settings.lessonHeading.titleFormatting.includes('**'));assert.ok(await run(`document.querySelector('.lesson-heading-advanced .lesson-heading-preview h1 strong')`));assert.ok(saved.description.includes('**'));assert.equal(saved.settings.hero_resource_id,originalHero);assert.equal(saved.settings.legacySubtitle,'Preserve legacy subtitle');assert.equal(saved.settings.lessonHeading.futureField,'retain');assert.equal(saved.settings.lessonHeading.title,undefined);
 await run(`document.querySelector('form[id^="lesson-heading-"]').requestSubmit()`);await pause(100);assert.equal(saves(),before+1);
 });
 await check('display and custom title sizing preview without changing shared titles',async()=>{
 await run(`document.querySelector('.lesson-heading-advanced .universal-additional-customization').open=true`);
 await input('.lesson-heading-advanced input[type=number][max="256"]','14');
 assert.equal(await run(`getComputedStyle(document.querySelector('.lesson-heading-advanced .lesson-heading-preview h1')).fontSize`),'14px');
 await run(`(()=>{const label=[...document.querySelectorAll('.lesson-heading-advanced label')].find(l=>l.textContent==='Show chapter / week label');label.querySelector('input').click();})()`);await pause(50);
 assert.equal(await run(`document.querySelector('.lesson-heading-advanced .lesson-heading-preview').querySelector(':scope > p')`),null);
 await run(`document.querySelector('form[id^="lesson-heading-"]').requestSubmit()`);await wait(`document.querySelector('.lesson-heading-advanced [role=status]')?.textContent==='Changes saved.'`,'display save');
 });
 assert.equal(await run(`getComputedStyle(document.querySelector('.lesson-heading-advanced .lesson-heading-introduction p')).textTransform`),'none');
 assert.ok(await run(`document.querySelector('.lesson-heading-advanced .lesson-heading-introduction strong')`));
 assert.ok(await run(`Number(getComputedStyle(document.querySelector('.lesson-heading-advanced .lesson-heading-introduction strong')).fontWeight)>=600`));
 await shot('lesson-heading-advanced.png');
 if(images.length>1)await check('library hero replace and remove use the existing isolated media path',async()=>{
 await input('.lesson-heading-advanced select[name=resource_id]',images[1].id);await run(`document.querySelector('.lesson-heading-advanced select[name=resource_id]').form.requestSubmit()`);await wait(`document.querySelector('.lesson-heading-advanced .participant-lesson-hero img')?.src.includes('')&&document.querySelector('.lesson-heading-advanced fieldset')`,'hero replacement');await pause(300);
 assert.equal(JSON.parse(readFileSync(statePath,'utf8')).sections[section.id].settings.hero_resource_id,images[1].id);
 await run(`document.querySelector('.lesson-heading-advanced input[name=asset_operation][value=remove]').form.requestSubmit()`);await pause(400);assert.equal(JSON.parse(readFileSync(statePath,'utf8')).sections[section.id].settings.hero_resource_id,null);
 });
 await check('hero upload creates one temporary resource and keeps the lesson metadata',async()=>{
 const path=join(output,'lesson-heading-upload.png');await writeFile(path,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=','base64'));
 const before=JSON.parse(readFileSync(statePath,'utf8')).resources.length;const {root}=await rpc('DOM.getDocument');const {nodeId}=await rpc('DOM.querySelector',{nodeId:root.nodeId,selector:'.lesson-heading-advanced input[type=file]'});await rpc('DOM.setFileInputFiles',{nodeId,files:[path]});
 await input('.lesson-heading-advanced input[name=asset_title]','Temporary hero review');await run(`document.querySelector('.lesson-heading-advanced input[type=file]').form.requestSubmit()`);await pause(500);
 const state=JSON.parse(readFileSync(statePath,'utf8'));assert.equal(state.resources.length,before+1);assert.equal(state.sections[section.id].title,'Local review title');assert.equal(state.sections[section.id].settings.hero_resource_id,state.resources.at(-1).id);
 });
 await check('main text block Save changes sits below its writing area',async()=>{
 const block=snapshot.blocks.find(row=>row.block_type==='rich_text');assert.ok(block);
 await rpc('Page.navigate',{url:base+'/admin/trainings/'+snapshot.experience.id+'/versions/'+snapshot.version.id+'?section='+block.section_id});await wait(`document.querySelector('.inline-text-editor.is-rich_text .tiptap')`,'main text editor');
 await run(`document.querySelector('.inline-text-editor.is-rich_text .tiptap').focus()`);await pause(100);
 assert.ok(await run(`(()=>{const root=document.querySelector('.inline-text-editor.is-rich_text'),save=root.querySelector('.inline-text-save'),text=root.querySelector('.tiptap');return Boolean(save)&&save.getBoundingClientRect().top>=text.getBoundingClientRect().bottom;})()`));
 });
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.ok(await run(`document.documentElement.scrollWidth<=innerWidth`));
 assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);assert.equal(network.filter(url=>/^https?:/.test(url)&&!['localhost','127.0.0.1'].includes(new URL(url).hostname)).length,0);console.log('Lesson heading browser checks passed');
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);console.error('Console errors:',consoleErrors);console.error('External requests:',network.filter(url=>/^https?:/.test(url)&&!['localhost','127.0.0.1'].includes(new URL(url).hostname)));if(ws){console.error('Visible demo text:',await run(`document.body.innerText.slice(0,2600)`));await shot('codex3-browser-failure.png');}process.exitCode=1;}
finally{if(priorState)writeFileSync(statePath,priorState);else if(existsSync(statePath))unlinkSync(statePath);ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
