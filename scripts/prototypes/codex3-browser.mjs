// Uses a disposable, signed-out Chrome profile against a local demo only.
// No production credentials, services, participant records or write tests.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base=process.env.CODEX3_LOCAL_URL||'http://localhost:32013';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local verification only');
const cdpPort=process.env.CODEX3_CDP_PORT||'32014';
const chrome=process.env.CODEX3_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=await mkdtemp(join(tmpdir(),'codex3-chrome-'));
const output=process.env.CODEX3_ARTIFACT_DIR||'/private/tmp';
const proc=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',`--remote-debugging-port=${cdpPort}`,`--user-data-dir=${profile}`,'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',`${base}/dev/course-builder-prototype`],{stdio:'ignore'});
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
 let target;for(let i=0;i<100;i++){try{const list=await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`,{signal:AbortSignal.timeout(1000)})).json();target=list.find(t=>t.type==='page'&&t.url.includes('course-builder-prototype'));if(target)break;}catch{}await pause(100);}assert.ok(target,'Disposable Chrome did not start');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request?.reject(Error(message.error.message));else request?.resolve(message.result);}if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')consoleErrors.push('console.error');if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==='Network.requestWillBeSent')network.push(message.params.request.url);});
 await rpc('Runtime.enable');await rpc('Page.enable');await rpc('Network.enable');await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await wait(`document.querySelector('select[aria-label="Text style"]')&&document.querySelector('.tiptap h4')`,'working text editor');
 await check('four course weeks plus fifth showcase chapter, fictional banner and selected lesson only',async()=>{
  assert.equal(await run(`document.querySelectorAll('[data-demo-chapter-id]').length`),5);assert.equal(await run(`document.querySelectorAll('[data-demo-lesson-id]').length`),25);assert.ok(await run(`document.body.innerText.includes('DEMO — NOT THE LIVE HUB LEADER COURSE')`));
  await click('Save demo');const record=await saved();assert.equal(record.payload.structure.modules.flatMap(m=>m.lessons).filter(l=>l.sections.length).length,1);
 });
 await check('chapter, lesson and content drag handles reorder and restore their original order',async()=>{
  for(const [selector,handle] of [['[data-demo-chapter-id]','summary [draggable]'],['[data-demo-chapter-id] [data-demo-lesson-id]','[draggable]'],['[data-demo-block-id]','header [draggable]']]){
   const before=await run(`[...document.querySelectorAll(${JSON.stringify(selector)})].map(e=>e.getAttribute('data-demo-chapter-id')||e.getAttribute('data-demo-lesson-id')||e.getAttribute('data-demo-block-id'))`);
   await run(`(()=>{const selector=${JSON.stringify(selector)},handle=${JSON.stringify(handle)};const rows=[...document.querySelectorAll(selector)];const source=rows[1],target=rows[0];const a=selector.includes('lesson-id')?source.parentElement:source,b=selector.includes('lesson-id')?target.parentElement:target;const data=new DataTransfer();a.querySelector(handle).dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:data}));(selector.includes('chapter-id')&&!selector.includes('lesson-id')?b.querySelector('summary'):selector.includes('block-id')?b.querySelector('header'):b).dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:data}));})()`);await pause(160);
   const after=await run(`[...document.querySelectorAll(${JSON.stringify(selector)})].map(e=>e.getAttribute('data-demo-chapter-id')||e.getAttribute('data-demo-lesson-id')||e.getAttribute('data-demo-block-id'))`);assert.equal(after[0],before[1]);assert.equal(after[1],before[0]);
   // Repeat the same swap to restore the fixture before all existing assertions.
   await run(`(()=>{const selector=${JSON.stringify(selector)},handle=${JSON.stringify(handle)};const rows=[...document.querySelectorAll(selector)];const source=rows[1],target=rows[0];const a=selector.includes('lesson-id')?source.parentElement:source,b=selector.includes('lesson-id')?target.parentElement:target;const data=new DataTransfer();a.querySelector(handle).dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:data}));(selector.includes('chapter-id')&&!selector.includes('lesson-id')?b.querySelector('summary'):selector.includes('block-id')?b.querySelector('header'):b).dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:data}));})()`);await pause(160);
  }
  assert.ok(await run(`document.body.innerText.includes('Order updated')`));
 });
 await shot('codex3-builder-desktop.png');
 await check('standard H4 and visual H4 paragraphs match across blocks',async()=>{
  const sizes=await run(`[...document.querySelectorAll('[data-pos-typography-root] h4, [data-pos-typography-root] [data-course-style="h4"]')].map(e=>({tag:e.tagName,size:getComputedStyle(e).fontSize}))`);assert.ok(sizes.length>=3);assert.ok(sizes.every(row=>row.size==='20px'));assert.ok(sizes.some(row=>row.tag==='P'));
 });
 await click('Course Customization');
 await check('course H4 token updates both samples; explicit 21px text is preserved',async()=>{
  await input('input[aria-label="H4 size"]','24');assert.ok(await run(`[...document.querySelectorAll('[data-pos-typography-root] h4')].every(e=>getComputedStyle(e).fontSize==='24px')`));assert.ok(await run(`[...document.querySelectorAll('[data-demo-font]')].every(e=>getComputedStyle(e).fontSize==='21px')`));
  const variants=await run(`[...document.querySelectorAll('[data-pos-typography-root] strong,[data-pos-typography-root] em')].map(e=>getComputedStyle(e).fontSize)`);assert.ok(variants.every(v=>v==='16px'));
 });
 await check('theme family changes preserve course overrides and inline font families',async()=>{
  const select=await run(`[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='purpose_sans'))?.outerHTML`);assert.ok(select);await run(`(()=>{const e=[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='purpose_sans'));e.value='purpose_sans';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(120);
  assert.ok(await run(`[...document.querySelectorAll('[data-pos-typography-root] h4')].every(e=>getComputedStyle(e).fontSize==='24px'&&getComputedStyle(e).fontFamily.includes('Arial'))`));assert.ok(await run(`[...document.querySelectorAll('[data-demo-font]')].every(e=>getComputedStyle(e).fontFamily.includes('Georgia'))`));
 });
 await shot('codex3-customization-desktop.png');
 await click('Course Builder');await wait(`document.querySelector('.tiptap')`,'editor remount');
 await check('H6, Bold, Italic, Underline retain size and visual style keeps paragraph semantics',async()=>{
  await selectText('.tiptap h2');await input('select[aria-label="Text style"]','h6');await click('B');await click('I');await click('U');assert.ok(await run(`document.querySelector('.tiptap h6 strong em u')||document.querySelector('.tiptap h6 u')`));assert.equal(await run(`getComputedStyle(document.querySelector('.tiptap h6')).fontSize`),'15px');
  await run(`document.querySelector('input[type="checkbox"]').click()`);await pause(120);assert.ok(await run(`document.querySelector('.tiptap p[data-course-style="h6"]')`));assert.equal(await run(`getComputedStyle(document.querySelector('.tiptap p[data-course-style="h6"]')).fontSize`),'15px');await input('select[aria-label="Text style"]','h5');assert.ok(await run(`document.querySelector('.tiptap p[data-course-style="h5"]')`),'visual paragraph choice must survive style changes');await input('select[aria-label="Text style"]','h6');
 });
 await check('explicit font override survives a course token change and can reset',async()=>{
  await selectText('.tiptap p[data-course-style="h6"]');await click('Font…');const selector='input[placeholder="Course style"]';await run(`document.querySelector(${JSON.stringify(selector)}).focus()`);await input(selector,'29');assert.equal(await run(`getComputedStyle(document.querySelector('.tiptap [data-demo-font]')).fontSize`),'29px','size updates before blur');await run(`document.querySelector(${JSON.stringify(selector)}).blur()`);await pause(120);assert.equal(await run(`getComputedStyle(document.querySelector('.tiptap [data-demo-font]')).fontSize`),'29px');
  await click('Course Customization');await input('input[aria-label="H6 size"]','20');await click('Course Builder');await wait(`document.querySelector('.tiptap [data-demo-font]')`,'override restored');assert.equal(await run(`getComputedStyle(document.querySelector('.tiptap [data-demo-font]')).fontSize`),'29px');await selectText('.tiptap p[data-course-style="h6"]');await click('Font…');await click('Reset to course style');assert.ok(!await run(`document.querySelector('.tiptap [data-demo-font]')`));assert.equal(await run(`getComputedStyle(document.querySelector('.tiptap p[data-course-style="h6"]')).fontSize`),'20px');
 });
 await check('safe links work and executable links are rejected',async()=>{
  await selectText('.tiptap p[data-course-style="h6"]');await click('Link');await input('input[placeholder="https://example.org"]','javascript:alert(1)');await click('Apply link');assert.ok(await run(`document.body.innerText.includes('Enter a safe https URL')`));await input('input[placeholder="https://example.org"]','https://example.invalid/demo');await click('Apply link');assert.ok(await run(`document.querySelector('.tiptap a[href="https://example.invalid/demo"]')`));
 });
 await check('lesson rename, local save receipt and reload preserve edited content',async()=>{
  await input('input[aria-label="Lesson title"]','Owner review lesson');await click('Save demo');const before=await saved();const revision=before.revision;assert.equal(before.payload.structure.modules[0].lessons[0].title,'Owner review lesson');await rpc('Page.reload');await wait(`document.querySelector('.tiptap a[href="https://example.invalid/demo"]')`,'saved content reload');assert.equal((await saved()).revision,revision);
 });
 await check('chapter and lesson headings use the same right-side Edit button',async()=>{
  for(const label of ['chapter heading','lesson heading']){
   await run(`document.querySelector('button[aria-label="Edit ${label}"]').click()`);await wait(`document.querySelector('[data-demo-advanced-sidebar] .tiptap')`,'heading side editor');
   assert.ok(await run(`document.querySelector('[data-demo-advanced-sidebar] button[aria-label="Advanced font controls"]')`));
   await run(`document.querySelector('[data-demo-advanced-sidebar] header button').click()`);await pause(120);
  }
  assert.ok(!await run(`[...document.querySelectorAll('button,summary')].some(e=>e.textContent.trim()==='Advanced Editor'||e.textContent.startsWith('Format lesson heading'))`));
 });
 await check('add lesson and content without a loading loop',async()=>{
  await click('+ Add lesson');await wait(`document.querySelector('input[aria-label="Lesson title"]')?.value==='New lesson'`,'new lesson selected');await click('+ Add content');await click('Text');await wait(`document.querySelectorAll('[data-demo-block-id]').length===1`,'new text content');await editContent();await wait(`document.querySelector('.tiptap')`,'new lesson text editor');assert.ok(!await run(`document.body.innerText.includes('Opening this lesson’s content…')`));
 });
 await check('list formatting works in the new lesson editor',async()=>{
  await selectText('.tiptap p');await click('• List');assert.ok(await run(`document.querySelector('.tiptap ul li')`));await click('1. List');assert.ok(await run(`document.querySelector('.tiptap ol li')`));
 });
 await check('advanced/hybrid layout and no-op Advanced Editor preserve source',async()=>{
  await run(`(()=>{const chapter=[...document.querySelectorAll('[data-demo-chapter-id]')].find(e=>e.querySelector('summary').innerText.includes('Week 4'));chapter.open=true;chapter.querySelector('[data-demo-lesson-id]').click();})()`);await wait(`document.body.innerText.includes('Hybrid community map')`,'hybrid fixture');await click('Save demo');const before=await saved();const block=before.payload.structure.modules[3].lessons[0].sections[0].layout.columns[1].blocks[0];
  await run(`(()=>{const e=[...document.querySelectorAll('[data-demo-block-id]')].find(e=>e.innerText.includes('Hybrid community map'));[...e.querySelectorAll('button')].find(b=>b.innerText==='Edit').click();})()`);await wait(`document.querySelector('textarea[spellcheck="false"]')`,'raw editor');await click('Apply to local demo');await click('Done');await click('Save demo');const after=await saved();assert.deepEqual(after.payload.structure.modules[3].lessons[0].sections[0].layout.columns[1].blocks[0],block);
 });
 await click('Learner preview ↗');
 await check('participant preview has a separate Companion and custom interaction',async()=>{
  assert.ok(await run(`document.querySelector('aside[aria-label="Participant Companion"]')`));await click('Welcome');assert.ok(await run(`document.body.innerText.includes('Create room for someone new.')`));
 });
 await shot('codex3-learner-desktop.png');
 await click('← Back to builder');await click('Course Customization');
 await check('Companion visibility is controlled exclusively by Customization',async()=>{
  await run(`[...document.querySelectorAll('label')].find(e=>e.innerText.includes('Show Companion as')).querySelector('input').click()`);await click('Learner preview ↗');assert.ok(!await run(`document.querySelector('aside[aria-label="Participant Companion"]')`));await click('← Back to builder');await click('Course Customization');await run(`[...document.querySelectorAll('label')].find(e=>e.innerText.includes('Show Companion as')).querySelector('input').click()`);
 });
 await check('cross-tab conflict blocks silent overwrite until explicit owner choice',async()=>{
  await click('Save demo');const previous=await saved();const {targetId}=await rpc('Target.createTarget',{url:`${base}/dev/course-builder-prototype`});const {sessionId}=await rpc('Target.attachToTarget',{targetId,flatten:true});await rpc('Runtime.enable',{},sessionId);for(let i=0;i<60;i++){if(await run(`Boolean(document.querySelector('[data-demo-main]'))`,sessionId))break;await pause(100);}
  await run(`(()=>{const record=JSON.parse(localStorage.getItem('purposeos:codex3:fictional-course:v1'));record.revision='peer-revision';record.payload.structure.version.course_configuration.card.headline='Other tab demo';localStorage.setItem('purposeos:codex3:fictional-course:v1',JSON.stringify(record));})()`,sessionId);
  await wait(`document.body.innerText.includes('Local demo conflict')`,'conflict message');assert.equal((await saved()).revision,'peer-revision');assert.ok(await run(`[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Save demo').disabled`));assert.ok(!await run(`document.body.innerText.includes('Other tab demo')`));
  await click('Keep mine and replace local demo');await wait(`document.body.innerText.includes('Saved on this browser')`,'explicit conflict receipt');assert.notEqual((await saved()).revision,'peer-revision');assert.equal((await saved()).payload.structure.version.course_configuration.card.headline,previous.payload.structure.version.course_configuration.card.headline);await rpc('Target.closeTarget',{targetId});
 });
 await check('storage failure retains draft and retry produces a confirmed local receipt',async()=>{
  await run(`(()=>{window.demoOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Test storage quota','QuotaExceededError')};})()`);
  await run(`(()=>{const e=[...document.querySelectorAll('label')].find(e=>e.innerText.startsWith('Course display name')).querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Recoverable demo draft');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await pause(120);await click('Save demo');await wait(`document.body.innerText.includes('Local save failed')`,'failure receipt');assert.ok(await run(`document.body.innerText.includes('Recoverable demo draft')`));assert.notEqual((await saved()).payload.structure.version.course_configuration.card.headline,'Recoverable demo draft');
  await run(`(()=>{Storage.prototype.setItem=window.demoOriginalSetItem;delete window.demoOriginalSetItem;})()`);await click('Retry local save');await wait(`document.body.innerText.includes('Saved on this browser')`,'retry receipt');assert.equal((await saved()).payload.structure.version.course_configuration.card.headline,'Recoverable demo draft');
 });
 await check('fifth chapter demonstrates all 17 content types with side panels and rendered advanced text',async()=>{
  await click('Course Builder');await click('Save demo');const showcase=(await saved()).payload.structure.modules.find(m=>m.metadata.demoShowcase);assert.equal(showcase.lessons.length,17);
  for(const lesson of showcase.lessons){
   await run(`(()=>{const chapter=document.querySelector('[data-demo-chapter-id="${showcase.id}"]');chapter.open=true;chapter.querySelector('[data-demo-lesson-id="${lesson.id}"]').click();})()`);
   await wait(`document.querySelector('input[aria-label="Lesson title"]')?.value===${JSON.stringify(lesson.title)}&&document.querySelector('[data-demo-content-presentation]')`,'showcase lesson');
   assert.ok(await run(`document.querySelector('[data-demo-main]').innerText.includes('A clear subtitle')`));
   await editContent();await wait(`document.querySelector('[data-demo-advanced-sidebar]')`,'right panel');
   assert.ok(await run(`(()=>{const e=document.querySelector('[data-demo-advanced-sidebar]');return e.innerText.includes('Additional text')&&e.innerText.includes('Layout & appearance')&&e.innerText.includes('Source');})()`));await click('Done');
  }
  // Demonstrate a named field modification with the learner presentation kept visible.
  const video=showcase.lessons.find(l=>l.metadata.demo_showcase_type==='video');await run(`document.querySelector('[data-demo-lesson-id="${video.id}"]').click()`);await wait(`document.body.innerText.includes('video · customized example')`,'video showcase');await editContent();
  assert.ok(await run(`document.querySelector('[data-demo-advanced-sidebar]').innerText.includes('Poster URL')`));await shot('codex3-advanced-sidebar.png');
  await run(`[...document.querySelectorAll('[data-demo-advanced-sidebar] summary')].find(e=>e.textContent.trim()==='title').click()`);await wait(`document.querySelector('[data-demo-advanced-sidebar] .tiptap h4')`,'named title editor');await selectText('[data-demo-advanced-sidebar] .tiptap h4');await rpc('Input.insertText',{text:'Owner customized video title'});await wait(`document.querySelector('[data-demo-content-presentation]').innerText.includes('Owner customized video title')`,'live media title');await click('Done');await click('Save demo');const updated=(await saved()).payload.structure.modules.find(m=>m.metadata.demoShowcase).lessons.find(l=>l.id===video.id).sections[0].layout.columns[0].blocks[0];assert.equal(updated.configuration.title,'Owner customized video title');assert.ok(updated.configuration.demoAdvanced.supportingText);
 });
 await check('chapter add, rename, duplicate and reorder; lesson copy/reorder preserve hierarchy',async()=>{
  await click('Course Builder');await click('Save demo');const before=await saved(),source=before.payload.structure.modules[3];
  await run(`(()=>{const e=document.querySelector('[data-demo-chapter-id="${source.id}"]');e.open=true;[...e.querySelectorAll('button')].find(b=>b.textContent.trim()==='Duplicate chapter').click();})()`);await click('Save demo');const copied=(await saved()).payload.structure.modules.at(-1);assert.equal((await saved()).payload.structure.modules.length,6);
  await run(`(()=>{const e=document.querySelector('[data-demo-chapter-id="${copied.id}"]');e.open=true;[...e.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.endsWith(' up')).click();})()`);await click('Save demo');assert.equal((await saved()).payload.structure.modules[4].id,copied.id);
  await click('+ Add chapter');await click('Save demo');const chapter=(await saved()).payload.structure.modules.at(-1);await run(`document.querySelector('[data-demo-chapter-id="${chapter.id}"]').open=true`);await input('input[aria-label="Rename New chapter"]','Owner added chapter');await run(`(()=>{const e=document.querySelector('[data-demo-chapter-id="${chapter.id}"]');[...e.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Add lesson').click();})()`);await wait(`document.querySelector('input[aria-label="Lesson title"]')?.value==='New lesson'`,'added chapter lesson');await input('input[aria-label="Lesson title"]','A new idea');await click('+ Add content');await click('Reflection question');
  await run(`(()=>{const e=document.querySelector('[data-demo-chapter-id="${chapter.id}"]');[...e.querySelectorAll('button')].find(b=>b.textContent.trim()==='Copy').click();})()`);await wait(`document.querySelector('input[aria-label="Lesson title"]')?.value==='A new idea (copy)'`,'copied lesson');await run(`(()=>{const e=document.querySelector('[data-demo-chapter-id="${chapter.id}"]');[...e.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Move A new idea (copy) up')).click();})()`);await click('Save demo');const result=(await saved()).payload.structure.modules.at(-1);assert.equal(result.title,'Owner added chapter');assert.equal(result.lessons[0].title,'A new idea (copy)');assert.equal(result.lessons[0].sections[0].lesson_id,result.lessons[0].id);assert.equal(result.lessons[0].sections[0].layout.columns[0].blocks[0].lesson_id,result.lessons[0].id);
 });
 await click('Course Settings');await click('Try a 32-week outline');await click('Course Builder');await wait(`document.querySelectorAll('[data-demo-chapter-id]').length===32&&document.querySelector('.tiptap')`,'32 week outline');
 await check('32-week navigation hydrates one lesson, not all 64 bodies',async()=>{
  await click('Save demo');const record=await saved();assert.equal(record.payload.structure.modules.flatMap(m=>m.lessons).filter(l=>l.sections.length).length,1);assert.equal(record.payload.structure.modules.flatMap(m=>m.lessons).length,64);
 });
 await click('Learner preview ↗');await click('Mobile preview');
 await check('mobile preview uses mobile heading tokens and keeps Companion accessible',async()=>{
  assert.ok(await run(`[...document.querySelectorAll('[data-pos-typography-root] h4')].every(e=>getComputedStyle(e).fontSize==='19px')`));assert.ok(await run(`document.querySelector('aside[aria-label="Participant Companion"]')`));
 });
 await shot('codex3-mobile-preview.png');await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(180);
 await check('actual narrow viewport does not overflow horizontally',async()=>{assert.ok(await run(`document.documentElement.scrollWidth<=window.innerWidth`));});await shot('codex3-mobile-viewport.png');
 await check('Advanced opens as a usable mobile drawer',async()=>{
  await click('← Back to builder');await editContent();await wait(`document.querySelector('[data-demo-advanced-sidebar]')`,'mobile drawer');
  assert.ok(await run(`(()=>{const box=document.querySelector('[data-demo-advanced-sidebar]').getBoundingClientRect();return box.left>=-1&&box.right<=window.innerWidth+1&&box.height>500;})()`));await shot('codex3-mobile-advanced.png');await click('Done');
 });
 await click('Reset');await check('reset dialog has keyboard escape and returns to editing',async()=>{assert.ok(await run(`document.querySelector('[role="dialog"]')`));await rpc('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await rpc('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});await pause(120);assert.ok(!await run(`document.querySelector('[role="dialog"]')`));});
 const external=network.filter(url=>/^https?:/.test(url)&&!['127.0.0.1','localhost'].includes(new URL(url).hostname));assert.equal(external.length,0,'Prototype requested an external service');assert.equal(errors.length,0,'Browser runtime exception');assert.equal(consoleErrors.length,0,'Browser console errors');
 await writeFile(join(output,'codex3-browser-results.json'),JSON.stringify({checks:checks.length,passed:checks,externalRequests:external.length,runtimeExceptions:errors,consoleErrors:consoleErrors.length,localRequests:network.length},null,2));console.log(JSON.stringify({checks:checks.length,externalRequests:external.length,runtimeExceptions:errors.length,consoleErrors:consoleErrors.length}));
} catch(error){console.error(error);console.error('Runtime exceptions:',errors);if(ws){console.error('Visible demo text:',await run(`document.body.innerText.slice(0,2600)`));await shot('codex3-browser-failure.png');}process.exitCode=1;}
finally{ws?.close();proc.kill('SIGTERM');await pause(300);await rm(profile,{recursive:true,force:true});}
