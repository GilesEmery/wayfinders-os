// Uses a disposable, signed-out Chrome profile against a local demo only.
// No production credentials, services, participant records or write tests.
import {readFileSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://localhost:32020';
 const snapshot=JSON.parse(readFileSync('.local/course-review/hub-leader-published.json','utf8'));const block=snapshot.blocks.find(b=>b.block_type==='video');
const initial=base+'/admin/trainings/'+snapshot.experience.id+'/versions/'+snapshot.version.id+'?section='+block.section_id;

const statePath=process.env.CODEX3_REHEARSAL_STATE_PATH;assert.ok(statePath&&statePath.includes('purposeos-integrated-builder-'),'Explicit isolated rehearsal state path required');
const priorState=existsSync(statePath)?readFileSync(statePath):undefined;const state=priorState?JSON.parse(priorState):{attachments:{},blocks:{},resources:[]};state.blocks[block.id]={...state.blocks[block.id],content:{...block.content,caption:'Original media caption',customVideoField:{preserve:true}},settings:{...block.settings,unrecognizedSetting:{keep:true},textPresentation:{header:'Legacy Header',body:'Legacy **body**',subtitle:'Legacy subtitle',caption:'Keep this independent caption',headerSize:'h3',bodySize:'h4',placement:'below',mediaSide:'stacked',futurePresentation:'preserve',appearance:{fontSize:27,color:'#123456',futureStyle:'retain'}}}};writeFileSync(statePath,JSON.stringify(state));
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

 await wait(`document.querySelector('.modern-course-builder')&&document.querySelector('.modern-builder-card')`,'integrated builder');
 await wait(`document.querySelectorAll('.modern-outline-type-icon').length===0&&document.querySelector('.companion-editor-trigger')`,'updated outline and Companion');
 await wait(`document.querySelector('.universal-video-canvas')?.closest('.modern-builder-card')?.getAttribute('data-editor-ready')==='true'`,'video canvas');
 const root='.universal-video-canvas';
 const logPath=statePath.replace('rehearsal-state.json','rehearsal-actions.jsonl');
 const saves=()=>existsSync(logPath)?readFileSync(logPath,'utf8').split('\n').filter(line=>line.includes('"name":"saveVideoBlockAction"')).length:0;
 await check('opening and no-change saves retain all legacy fields and show only three primary sections',async()=>{
  await run(`document.querySelector('${root} [data-universal-text="header"] .tiptap').focus()`);await pause(80);assert.equal(await run(`document.querySelectorAll('${root} [role=toolbar]').length`),0);
  const before=saves();await run(`document.querySelector('${root}>form').requestSubmit()`);await pause(120);assert.equal(saves(),before);
  await run(`document.querySelector('${root}').closest('.modern-builder-card').querySelector('button[aria-label="Edit Video"]').click()`);
  await wait(`document.querySelector('.universal-video-advanced-form [data-universal-text="header"] .tiptap')`,'advanced video fields');
  assert.equal(await run(`document.querySelectorAll('.universal-video-advanced-form .universal-advanced-edit>section').length`),2);
  assert.equal(await run(`document.querySelector('.universal-video-advanced-form .universal-additional-customization').open`),false);
  assert.equal(await run(`document.querySelectorAll('.universal-video-advanced-form .universal-text-field').length`),4);
  assert.equal(await run(`document.querySelectorAll('.universal-video-advanced-form .universal-text-field input[type=number]').length`),0);
  assert.equal(await run(`document.querySelectorAll('.universal-video-advanced-form [role=toolbar]').length`),0);
  assert.equal(await run(`document.querySelectorAll('.universal-video-advanced-form .builder-block-delete').length`),0);
 });
 await check('one contextual toolbar formats Header, Text and Subtext while retaining the selected range',async()=>{
  await selectText('.universal-video-advanced-form [data-universal-text="header"] .tiptap p');
  await input('.universal-formatting-toolbar select[aria-label="Text style"]','h6');
  assert.equal(await run(`document.querySelector('.universal-formatting-toolbar select[aria-label="Text style"]').value`),'h6');
  for(const label of ['Bold','Italic','Underline']){await run(`document.querySelector('.universal-formatting-toolbar button[aria-label="${label}"]').click()`);await pause(80);assert.ok(await run(`window.getSelection().toString().length>0`));}
  await input('.universal-formatting-toolbar select[aria-label="Font size"]','h2');
  assert.equal(await run(`document.querySelector('.universal-formatting-toolbar select[aria-label="Text style"]').value`),'h2');
  assert.equal(await run(`document.querySelector('.universal-formatting-toolbar select[aria-label="Font size"]').selectedOptions[0].textContent`),'28 px');
  assert.ok(await run(`window.getSelection().toString().length>0`));
  await input('.universal-formatting-toolbar select[aria-label="Font size"]','h3');
  assert.equal(await run(`document.querySelector('.universal-formatting-toolbar select[aria-label="Text style"]').value`),'h3');
  await input('.universal-formatting-toolbar select[aria-label="Font size"]','custom:14');
  assert.equal(await run(`document.querySelector('.universal-formatting-toolbar select[aria-label="Text style"]').value`),'custom');
  assert.equal(await run(`getComputedStyle(document.querySelector('.universal-video-advanced-form [data-universal-text="header"] [data-course-font]')).fontSize`),'16px');
  for(const alignment of ['center','right','left']){await run(`document.querySelector('.universal-formatting-toolbar button[aria-label="Align ${alignment}"]').click()`);await pause(60);assert.equal(await run(`document.querySelector('.universal-video-advanced-form [data-universal-text="header"] [data-course-alignment]').dataset.courseAlignment`),alignment);}
  await input('.universal-formatting-toolbar select[aria-label="Font size"]','h3');
  assert.equal(await run(`getComputedStyle(document.querySelector('.universal-video-advanced-form [data-universal-text="header"] .tiptap')).borderTopStyle`),'solid');
  await selectText('.universal-video-advanced-form [data-universal-text="text"] .tiptap p');assert.equal(await run(`document.querySelectorAll('.universal-formatting-toolbar').length`),1);
  await input('.universal-formatting-toolbar select[aria-label="Text style"]','body');
  await selectText('.universal-video-advanced-form [data-universal-text="subtext"] .tiptap p');await input('.universal-formatting-toolbar select[aria-label="Text style"]','small');
  assert.equal(await run(`document.querySelector('.universal-formatting-toolbar select[aria-label="Text style"]').value`),'small');
 });
 await check('video layouts, explicit resets and acknowledged changed-only saves preserve independent captions',async()=>{
  for(const layout of ['left','right','stacked']){await run(`document.querySelector('input[name=video_text_layout][value="${layout}"]').click()`);await pause(100);assert.equal(await run(`document.querySelector('${root} .course-item-presentation').dataset.mediaSide`),layout);}
  await run(`document.querySelector('.universal-additional-customization').open=true`);
  await run(`(()=>{const label=[...document.querySelectorAll('.universal-additional-controls>label')].find(l=>l.textContent.startsWith('Custom font size'));label.querySelector('button').click();})()`);await pause(80);
  assert.equal(await run(`document.querySelector('${root} .course-item-presentation').getAttribute('data-box-font-size')`),null);
  const before=saves();await run(`document.querySelector('.universal-video-advanced-form').requestSubmit()`);
  await wait(`document.querySelector('.video-save-feedback[role=status]')?.textContent==='Changes saved.'`,'acknowledged video save');
  assert.equal(saves(),before+1);
  const saved=JSON.parse(readFileSync(statePath,'utf8')).blocks[block.id];assert.equal(saved.settings.textPresentation.caption,'Keep this independent caption');assert.equal(saved.content.caption,'Original media caption');assert.equal(saved.content.customVideoField.preserve,true);assert.equal(saved.settings.textPresentation.futurePresentation,'preserve');assert.equal(saved.settings.textPresentation.appearance.futureStyle,'retain');
  await run(`document.querySelector('.universal-video-advanced-form').requestSubmit()`);await pause(150);assert.equal(saves(),before+1);
 });
 await shot('video-universal-advanced-edit.png');
 await run(`(()=>{document.querySelector('.modern-builder-controls button[aria-label="Close editor"]')?.click();[...document.querySelectorAll('.modern-builder-tabs button')].find(b=>b.textContent==='Course Customization').click();})()`);
 await input('select[aria-label="Course font package"]','balanced');
 assert.equal(await run(`document.querySelector('select[aria-label="h4 font family"]').value`),'editorial');
 assert.equal(await run(`document.querySelector('select[aria-label="body font family"]').value`),'sans');
 await input('select[aria-label="headings font"]','mono');assert.equal(await run(`document.querySelector('select[aria-label="h3 font family"]').value`),'mono');
 assert.equal(await run(`document.querySelector('select[aria-label="body font family"]').value`),'sans');
 console.log('PASS custom 14px, all alignments, and separate course heading/body packages');
 await run(`document.querySelector('[data-font-choice="lato"]').click()`);await pause(100);await run(`document.fonts.ready`);
 assert.equal(await run(`document.querySelector('select[aria-label="body font"]').value`),'lato');
 assert.equal(await run(`getComputedStyle(document.querySelector('[data-font-choice="lato"] strong')).fontFamily`),'Lato, sans-serif');
 assert.equal(await run(`document.fonts.check('700 24px Lato')`),true);
 assert.equal(await run(`document.querySelector('.course-typography-card').textContent.includes('Existing course font')`),false);
 assert.equal(await run(`document.querySelector('.course-font-library>summary').textContent`),'Font library');assert.equal(await run(`document.querySelectorAll('[data-font-choice]').length`),16);await run(`document.fonts.ready`);assert.equal(await run(`document.fonts.check('700 24px "Roboto Mono"')`),true);
 await shot('course-typography-font-library.png');console.log('PASS Lato renders in its locally hosted font and updates the course package');

 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.ok(await run(`document.documentElement.scrollWidth<=innerWidth`));
 assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);assert.equal(network.filter(url=>/^https?:/.test(url)&&!['localhost','127.0.0.1'].includes(new URL(url).hostname)).length,0);console.log('Video Universal Advanced Edit checks passed');
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);console.error('Console errors:',consoleErrors);console.error('External requests:',network.filter(url=>/^https?:/.test(url)&&!['localhost','127.0.0.1'].includes(new URL(url).hostname)));if(ws){console.error('Visible demo text:',await run(`document.body.innerText.slice(0,2600)`));await shot('codex3-browser-failure.png');}process.exitCode=1;}
finally{if(priorState)writeFileSync(statePath,priorState);else if(existsSync(statePath))unlinkSync(statePath);ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
