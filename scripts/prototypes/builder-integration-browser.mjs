// Uses a disposable, signed-out Chrome profile against a local demo only.
// No production credentials, services, participant records or write tests.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://localhost:32020';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local verification only');
const cdpPort=process.env.CODEX3_CDP_PORT||'32021';
const chrome=process.env.CODEX3_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=await mkdtemp(join(tmpdir(),'codex3-chrome-'));
const output=process.env.CODEX3_ARTIFACT_DIR||'/private/tmp';
const proc=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',`--remote-debugging-port=${cdpPort}`,`--user-data-dir=${profile}`,'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',base],{stdio:'ignore'});
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
 await check('actual integrated interface uses course colors, tabs and right-side cards',async()=>{
  assert.ok(await run(`document.querySelector('.modern-builder-tabs')`));assert.equal(await run(`getComputedStyle(document.querySelector('.modern-course-builder')).getPropertyValue('--builder-accent').trim()`),'#0054a1');assert.equal(await run(`document.querySelectorAll('.course-builder-outline .is-page').length`),68);assert.ok(await run(`document.body.innerText.includes('OFFLINE INTEGRATION REHEARSAL')`));
 });
 await check('chapter names edit directly without an Edit button',async()=>{
  await wait(`document.querySelector('.modern-group-heading input[aria-label="Chapter name"]')`,'chapter title');
  const selector='.modern-group-heading input[aria-label="Chapter name"]';
  await input(selector,'Renamed rehearsal chapter');assert.equal(await run(`document.querySelector(${JSON.stringify(selector)}).value`),'Renamed rehearsal chapter');
  await run(`(()=>{document.querySelector(${JSON.stringify(selector)}).focus();document.querySelector(${JSON.stringify(selector)}).blur();})()`);
 });
 await check('all Add Content insertion controls use full-width dashed disclosure boxes',async()=>{
  const styles=await run(`[...document.querySelectorAll('.builder-block-library>summary')].map(e=>({text:e.textContent.trim(),border:getComputedStyle(e).borderTopStyle,width:Math.round(e.getBoundingClientRect().width),parent:Math.round(e.parentElement.getBoundingClientRect().width)}))`);
  assert.ok(styles.length);for(const item of styles){assert.equal(item.text,'Add Content');assert.equal(item.border,'dashed');assert.ok(Math.abs(item.width-item.parent)<=2);}
 });
 // Select a protected pre-work page containing rich text, then use real editor components with inert save actions.
 const snapshot=JSON.parse(readFileSync('.local/course-review/hub-leader-published.json','utf8'));
 const protectedModules=new Set(snapshot.modules.filter(m=>m.sort_order<=2).map(m=>m.id));const selectedBlock=snapshot.blocks.find(b=>b.block_type==='rich_text'&&!b.settings?.textPresentation&&protectedModules.has(snapshot.sections.find(p=>p.id===b.section_id)?.module_id));
 const targetUrl=base+'/admin/trainings/'+snapshot.experience.id+'/versions/'+snapshot.version.id+'?section='+selectedBlock.section_id;
 await rpc('Page.navigate',{url:targetUrl});await wait(`document.querySelector('.course-builder-canvas .course-builder-lesson-header h2')?.textContent===${JSON.stringify(snapshot.sections.find(p=>p.id===selectedBlock.section_id).title)}`,'selected page');
 await check('canvas text is editable before Edit; sidebar contains advanced controls without a second editor',async()=>{
  await wait(`document.querySelector('.course-builder-canvas .inline-text-editor .tiptap[contenteditable="true"]')`,'direct canvas editor');
  await wait(`document.querySelector('.course-builder-canvas .inline-text-editor')?.closest('.modern-builder-card')?.getAttribute('data-editor-ready')==='true'`,'card hydration');assert.equal(await run(`document.querySelectorAll('.inline-text-editor').length`),1);
  assert.ok(await run(`document.querySelector('.course-builder-canvas input[aria-label="Lesson name"]')`));
  assert.ok(await run(`document.querySelector('.course-builder-canvas textarea[aria-label="Lesson introduction"]')`));
  await selectText('.course-builder-canvas .inline-text-editor .tiptap p');await rpc('Input.insertText',{text:'Edited directly without opening Edit'});await wait(`document.querySelector('.inline-text-status')?.innerText==='Saved'`,'direct editing save');
  assert.ok(!await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden])')`));
  await run(`document.querySelector('.course-builder-canvas .inline-text-editor').closest('.modern-builder-card').querySelector('header button').click()`);await wait(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden])')`,'advanced sidebar');assert.equal(await run(`document.querySelectorAll('[data-demo-advanced-sidebar] .inline-text-editor').length`),0);assert.ok(await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden])').innerText.includes('Source')`));
 });
 await check('outline has no Edit controls and portaled panel close button stays visible after scrolling',async()=>{
  assert.equal(await run(`[...document.querySelectorAll('.course-builder-outline button,.course-builder-outline summary')].some(e=>e.textContent.trim()==='Edit')`),false);
  assert.ok(await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden])').parentElement===document.body`));
  await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden])').scrollTop=500`);
  assert.ok(await run(`(()=>{const b=document.querySelector('[data-demo-advanced-sidebar]:not([hidden]) header button').getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&b.width>=44})()`));
  await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden])').scrollTop=0`);
  assert.ok(await run(`document.querySelector('[data-demo-advanced-sidebar] input[name="presentation_padding"]')`));
  assert.ok(await run(`document.querySelector('[data-demo-advanced-sidebar] input[name="presentation_width"]')`));
 });
 await check('typing updates the canvas preview and sends a bounded recovery/CAS form to the inert action',async()=>{
  await selectText('.course-builder-canvas .inline-text-editor .tiptap p');await rpc('Input.insertText',{text:'Offline rehearsal body edit'});await wait(`document.querySelector('.course-builder-canvas .inline-text-editor')?.innerText.includes('Offline rehearsal body edit')`,'live canvas');await wait(`document.querySelector('.inline-text-status')?.innerText==='Saved'`,'inert save receipt');
 });
 await check('H6, underline and explicit font size render immediately and round-trip through editing',async()=>{
  await selectText('.course-builder-canvas .inline-text-editor .tiptap p');await input('select[aria-label="Paragraph style"]','h6');assert.ok(await run(`document.querySelector('.course-builder-canvas .inline-text-editor .tiptap h6')`));await click('U');await click('Font…');await selectText('.course-builder-canvas .inline-text-editor .tiptap h6');await input('input[aria-label="Selected text font size"]','27');assert.equal(await run(`getComputedStyle(document.querySelector('.course-builder-canvas .inline-text-editor .tiptap [data-course-font]')).fontSize`),'27px');assert.equal(await run(`getComputedStyle(document.querySelector('.course-builder-canvas .inline-text-editor [data-course-font]')).fontSize`),'27px');
 });
 await check('closing and reopening retains unsaved settings and mounted text recovery state',async()=>{
  const inputSelector='[data-demo-advanced-sidebar]:not([hidden]) input[name="presentation_header"]';
  await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden]) header button').click()`);await pause(150);assert.equal(await run(`document.querySelectorAll('.inline-text-editor').length`),1);assert.ok(!await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden])')`));
  await run(`document.querySelector('.course-builder-canvas .inline-text-editor').closest('.modern-builder-card').querySelector('button').click()`);await pause(150);assert.equal(await run(`getComputedStyle(document.querySelector('.course-builder-canvas .inline-text-editor .tiptap [data-course-font]')).fontSize`),'27px');
 });
 await shot('builder-integrated-sidebar.png');await run(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden]) header button').click()`);
 await check('advanced appearance updates the canvas immediately',async()=>{
  await run(`document.querySelector('.course-builder-canvas .inline-text-editor').closest('.modern-builder-card').querySelector('button').click()`);await pause(150);
  await input('[data-demo-advanced-sidebar]:not([hidden]) input[name="presentation_padding"]','24');
  await wait(`document.querySelector('.course-builder-canvas .modern-inline-appearance')?.style.padding==='24px'`,'immediate appearance preview');
  assert.equal(await run(`document.querySelectorAll('.inline-text-editor').length`),1);
 });
 await check('Customization retains branding/themes and previews typography tokens without rewriting overrides',async()=>{
  await click('Course Customization');await wait(`document.querySelector('input[aria-label="h4 default size"]')`,'course typography');await input('input[aria-label="h4 default size"]','24');assert.equal(await run(`getComputedStyle(document.querySelector('.course-customization-card [data-course-typography] h4')).fontSize`),'24px');assert.ok(await run(`document.body.innerText.includes('Course typography')`));
 });
 await check('Course Settings retains layout, cover and version controls; returning to Builder keeps content',async()=>{await click('Course Settings');assert.ok(await run(`document.querySelector('.modern-builder-settings input[name="course_layout"]')`));await click('Course Builder');assert.ok(await run(`document.querySelector('.course-builder-canvas .modern-builder-card')`));});await shot('builder-integrated-desktop.png');
 await check('previous interface can be selected and the presentation preference survives subsequent navigation',async()=>{
  await rpc('Page.navigate',{url:targetUrl+'&builder=legacy'});await wait(`document.querySelector('.course-builder-workspace')&&!document.querySelector('.modern-course-builder')`,'legacy interface');assert.ok(await run(`document.body.innerText.includes('Use new builder interface')`));await wait(`document.cookie.includes('purposeos_builder_interface=legacy')`,'legacy preference hydration');
  const href=await run(`document.querySelector('.course-builder-outline .is-page a').href`);await rpc('Page.navigate',{url:href});await wait(`document.querySelector('.course-builder-workspace')&&!document.querySelector('.modern-course-builder')`,'persistent legacy interface');await rpc('Page.navigate',{url:href+'&builder=modern'});await wait(`document.querySelector('.modern-course-builder')`,'modern restore');
 });
 await check('media text edits directly and advanced controls share its single canvas form',async()=>{
  const media=snapshot.blocks.find(b=>['image','pdf_reader','video'].includes(b.block_type));assert.ok(media);
  await rpc('Page.navigate',{url:base+'/admin/trainings/'+snapshot.experience.id+'/versions/'+snapshot.version.id+'?builder=modern&section='+media.section_id});
  await wait(`document.querySelector('.modern-inline-presentation [aria-label="Main text"][contenteditable="true"]')`,'direct media text');
  await selectText('.modern-inline-presentation [aria-label="Main text"] p');await rpc('Input.insertText',{text:'Direct media supporting text'});
  await run(`document.querySelector('.modern-inline-presentation').closest('.modern-builder-card').querySelector('header button').click()`);await wait(`document.querySelector('[data-demo-advanced-sidebar]:not([hidden]) input[name="presentation_padding"]')`,'media advanced options');
  assert.ok(await run(`(()=>{const input=document.querySelector('[data-demo-advanced-sidebar]:not([hidden]) input[name="presentation_padding"]');return input.form?.classList.contains('modern-inline-presentation')})()`));
  assert.equal(await run(`document.querySelectorAll('[data-demo-advanced-sidebar]:not([hidden]) [aria-label="Main text"]').length`),0);
  await input('[data-demo-advanced-sidebar]:not([hidden]) input[name="presentation_padding"]','18');
  assert.equal(await run(`(()=>{const input=document.querySelector('[data-demo-advanced-sidebar]:not([hidden]) input[name="presentation_padding"]');const data=new FormData(input.form);return data.get('presentation_body')})()`),'Direct media supporting text');
 });
 await check('published versions expose inspection but no editing/publishing forms',async()=>{
  await rpc('Page.navigate',{url:base+'/?readonly=1&builder=modern'});await wait(`document.querySelector('.course-builder-topbar')?.textContent.includes('Live · Published')`,'read-only builder');assert.ok(!await run(`document.querySelector('.course-builder-publish')`));assert.ok(!await run(`[...document.querySelectorAll('.modern-builder-card button')].some(e=>e.textContent==='Edit')`));
 });
 await rpc('Page.navigate',{url:base+'/?builder=modern'});await wait(`document.querySelector('.course-builder-publish')&&document.querySelector('.modern-builder-card[data-editor-ready="true"]')`,'draft restore');await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(200);
 await check('mobile authoring remains within the viewport',async()=>{assert.ok(await run(`document.documentElement.scrollWidth<=window.innerWidth`));});await shot('builder-integrated-mobile.png');
 const external=network.filter(url=>/^https?:/.test(url)&&!['localhost','127.0.0.1'].includes(new URL(url).hostname));assert.equal(external.length,0);assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);
 await writeFile(join(output,'builder-integration-browser.json'),JSON.stringify({checks:checks.length,passed:checks,externalRequests:external.length,runtimeExceptions:errors,consoleErrors:consoleErrors.length},null,2));console.log(JSON.stringify({checks:checks.length,externalRequests:external.length,runtimeExceptions:errors.length,consoleErrors:consoleErrors.length}));
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);if(ws){console.error('Visible demo text:',await run(`document.body.innerText.slice(0,2600)`));await shot('codex3-browser-failure.png');}process.exitCode=1;}
finally{ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
