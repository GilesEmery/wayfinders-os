import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {load} from '../performance/offline-module.mjs';
import {typographyTokens,typographyVariables,TEXT_STYLES,FONT_FAMILIES} from '../../lib/experiences/builder/prototype/typography.ts';
const prefix='const {structuredClone,crypto}=require("fixture");\n';
const runtime={structuredClone,crypto};
const model=load('lib/experiences/builder/prototype/model.ts',{fixture:runtime},prefix+readFileSync('lib/experiences/builder/prototype/model.ts','utf8'));
const companion=load('lib/experiences/builder/companion.ts',{});
const config=load('lib/experiences/builder/course-configuration.ts',{});
const fixture=load('lib/experiences/builder/prototype/fixtures.ts',{'../companion':companion,'../course-configuration':config,'./model':model,fixture:runtime},prefix+readFileSync('lib/experiences/builder/prototype/fixtures.ts','utf8'));
const storage=load('lib/experiences/builder/prototype/storage.ts',{'./model':model});
const native=x=>JSON.parse(JSON.stringify(x));
async function hydrated(){let course=fixture.createDemoCourse();for(const chapter of course.structure.modules)for(const lesson of chapter.lessons){const body=await fixture.loadDemoLesson(lesson);course=model.updateLesson(course,lesson.id,()=>body);}return course;}
function allIds(course){return course.structure.modules.flatMap(m=>[m.id,...m.lessons.flatMap(l=>[l.id,...l.sections.flatMap(s=>[s.id,...(s.layout?[s.layout.id,...s.layout.columns.flatMap(c=>[c.id,...c.blocks.map(b=>b.id)])]:[])])])]);}
test('fictional four-week outline has eight lessons with no eager bodies; 32+ weeks have no cap',async()=>{
 const four=fixture.createDemoCourse();assert.equal(four.structure.modules.length,4);assert.equal(four.structure.modules.flatMap(m=>m.lessons).length,8);assert.ok(four.structure.modules.every(m=>m.lessons.every(l=>l.sections.length===0)));
 const large=fixture.createDemoCourse(40);assert.equal(large.structure.modules.length,40);const body=await fixture.loadDemoLesson(large.structure.modules[20].lessons[0]);const selected=model.updateLesson(large,body.id,()=>body);assert.equal(selected.structure.modules.flatMap(m=>m.lessons).filter(l=>l.sections.length).length,1);
 console.info('CODEX3 fixture: 40-week outline, 80 lessons, one hydrated lesson, '+Buffer.byteLength(model.serializePrototype(selected))+' JSON bytes');
});
test('no-op open/save round trip preserves exact nested layouts, custom source, inline legacy HTML, resources, Companion and metadata',async()=>{
 const course=await hydrated();const json=model.serializePrototype(course);assert.equal(model.serializePrototype(model.parsePrototype(json)),json);
 const advanced=course.structure.modules[3].lessons[0].sections[0];assert.equal(advanced.renderer_mode,'hybrid');assert.equal(advanced.layout.columns.length,2);assert.match(JSON.stringify(advanced.settings),/font-size:21px/);
 const custom=advanced.layout.columns[1].blocks[0];assert.ok(custom.configuration.source);assert.ok(custom.configuration.resourceBindings);assert.equal(course.companion.length,5);
});
test('one content edit leaves all other data and opaque configuration unchanged',async()=>{
 const course=await hydrated(),lesson=course.structure.modules[3].lessons[0],block=model.lessonBlocks(lesson)[0];
 const next=model.updateBlock(course,lesson.id,block.id,b=>model.setBlockDocument(b,{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Owner edit'}]}]}));
 assert.deepEqual(native(next.structure.modules.slice(0,3)),native(course.structure.modules.slice(0,3)));assert.deepEqual(native(model.findLesson(next,lesson.id).sections[0].layout.columns[1]),native(lesson.sections[0].layout.columns[1]));assert.deepEqual(native(next.companion),native(course.companion));assert.deepEqual(native(model.lessonBlocks(model.findLesson(next,lesson.id))[0].metadata),native(block.metadata));
});
test('chapter/lesson duplication remaps hierarchy IDs while retaining raw configuration and resource links',async()=>{
 const course=await hydrated(),source=course.structure.modules[3];let seed=700000;const copied=model.cloneChapter(source,()=>fixture.fixtureId(seed++));
 const all={...course,structure:{...course.structure,modules:[...course.structure.modules,copied]}};const ids=allIds(all);assert.equal(new Set(ids).size,ids.length);
 for(const l of copied.lessons)for(const s of l.sections){assert.equal(l.module_id,copied.id);assert.equal(s.module_id,copied.id);assert.equal(s.lesson_id,l.id);for(const c of s.layout.columns){assert.equal(c.section_id,s.id);assert.equal(c.section_layout_id,s.layout.id);for(const b of c.blocks){assert.equal(b.lesson_id,l.id);assert.equal(b.section_id,s.id);assert.equal(b.column_id,c.id);}}}
 assert.deepEqual(native(copied.lessons[0].sections[0].layout.columns[1].blocks[0].configuration),native(source.lessons[0].sections[0].layout.columns[1].blocks[0].configuration));
});
test('duplicating an unloaded lesson materializes unique IDs rather than colliding with its source',async()=>{
 const course=fixture.createDemoCourse(),source=course.structure.modules[0].lessons[0];let seed=800000;const clone=model.duplicateLesson(source,()=>fixture.fixtureId(seed++));const [a,b]=await Promise.all([fixture.loadDemoLesson(source),fixture.loadDemoLesson(clone)]);const seen=new Set(model.lessonBlocks(a).map(b=>b.id));assert.ok(model.lessonBlocks(b).every(b=>!seen.has(b.id)));assert.equal(b.id,clone.id);
});
test('reordering keeps resource and opaque content exactly; out-of-bounds move is a no-op',async()=>{
 const course=await hydrated(),lesson=course.structure.modules[0].lessons[0],blocks=model.lessonBlocks(lesson);const result=model.reorderBlock(course,lesson.id,blocks[1].id,-1);assert.equal(model.lessonBlocks(model.findLesson(result,lesson.id))[0].id,blocks[1].id);assert.deepEqual(native(model.lessonBlocks(model.findLesson(result,lesson.id))[0].configuration),native(blocks[1].configuration));assert.equal(model.move(blocks,0,-1),blocks);
});
test('H1–H6 / Body / Small resolve theme then course tokens; typography changes never rewrite inline overrides',async()=>{
 for(const theme of ['purpose_mixed','purpose_sans','purpose_editorial']){const tokens=typographyTokens(theme);assert.equal(Object.keys(tokens).length,8);for(const key of TEXT_STYLES){assert.ok(tokens[key].size>0);assert.ok(tokens[key].mobileSize>0);assert.ok(tokens[key].lineHeight>=1);}}
 const base=typographyTokens('purpose_mixed');assert.equal(base.h4.size,20);assert.equal(base.h4.mobileSize,19);assert.equal(typographyTokens('purpose_sans').h4.family,FONT_FAMILIES.sans);
 const course=await hydrated(),before=model.serializePrototype(course);const next=model.customize(course,{typography:{h4:{size:24}}});assert.deepEqual(native(next.structure.modules),native(course.structure.modules));assert.equal(typographyTokens(model.configuration(next).theme,model.configuration(next).typography).h4.size,24);assert.equal(typographyVariables(base)['--pos-h4-size'],'20px');assert.notEqual(model.serializePrototype(next),before);
});
test('local receipts detect conflicts and storage errors without overwriting another draft',()=>{
 const map=new Map();const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const course=fixture.createDemoCourse();const first=storage.saveDemo(store,course,null,'revision-a');assert.equal(first.revision,'revision-a');assert.throws(()=>storage.saveDemo(store,course,null,'stale'),/conflict/);assert.equal(storage.readDemo(store).revision,'revision-a');
 const failing={...store,setItem:()=>{throw Error('quota');}};assert.throws(()=>storage.saveDemo(failing,course,'revision-a','revision-b'),/quota/);assert.equal(storage.readDemo(store).revision,'revision-a');
});
test('production route rejects access and prototype imports do not invoke database, actions, remote media or publish operations',()=>{
 const route=readFileSync('app/dev/course-builder-prototype/page.tsx','utf8');assert.match(route,/process.env.NODE_ENV===\"production\"\)notFound/);
 for(const path of ['components/course-builder-prototype/CourseBuilderPrototype.tsx','lib/experiences/builder/prototype/model.ts','lib/experiences/builder/prototype/fixtures.ts','lib/experiences/builder/prototype/storage.ts'])assert.doesNotMatch(readFileSync(path,'utf8'),/createAdminSupabaseClient|\.from\(["\x27]|fetch\(|use server|publishVersion|uploadResource/);
 const css=readFileSync('components/course-builder-prototype/Typography.module.css','utf8');for(const key of TEXT_STYLES)assert.match(css,new RegExp('data-course-style=\\"'+key+'\\"'));assert.match(css,/strong,b\).*font-size:inherit/);assert.match(css,/p:not\(\[data-course-style\]\)/);
});
test('malformed local data cannot replace the fictional fixture',()=>{
 assert.throws(()=>model.parsePrototype(JSON.stringify({structure:{experience:{slug:'live-course'},modules:[]},companion:[]})));assert.throws(()=>storage.readDemo({getItem:()=>JSON.stringify({schemaVersion:2,revision:'wrong'})}));
});

test('Customization uses existing shell and appearance/card authorities rather than parallel layout flags',()=>{
 const initial=fixture.createDemoCourse(),next=model.customize(initial,{companionVisible:false,readingWidth:'wide',accent:'#123456',title:'Demo brand'});
 assert.equal(next.structure.version.shell_mode,'standard');assert.equal(next.structure.version.course_configuration.appearance.reading_width,'wide');assert.equal(next.structure.version.course_configuration.appearance.accent_color,'#123456');assert.equal(next.structure.version.course_configuration.card.headline,'Demo brand');
 assert.equal(next.structure.version.course_configuration.demoCustomization.companionVisible,undefined);assert.equal(next.structure.version.course_configuration.demoCustomization.readingWidth,undefined);assert.equal(model.configuration(next).companionVisible,false);assert.equal(next.structure.experience.name,initial.structure.experience.name);
});

test('drag reordering preserves hierarchy, fields and custom source; foreign destinations are ignored',async()=>{
 const course=await hydrated(),modules=course.structure.modules;
 const chapters=model.dragCurriculum(course,'chapter',modules[2].id,modules[0].id,'');assert.equal(chapters.structure.modules[0].id,modules[2].id);
 const lesson=modules[0].lessons[0],other=modules[0].lessons[1];
 const lessons=model.dragCurriculum(course,'lesson',other.id,lesson.id,'');assert.equal(lessons.structure.modules[0].lessons[0].id,other.id);
 const foreign=model.dragCurriculum(course,'lesson',other.id,modules[1].lessons[0].id,'');assert.deepEqual(native(foreign),native(course));
 const blocks=model.lessonBlocks(lesson),moved=model.dragCurriculum(course,'block',blocks[2].id,blocks[0].id,lesson.id);
 assert.equal(model.lessonBlocks(model.findLesson(moved,lesson.id))[0].id,blocks[2].id);assert.deepEqual(native(model.lessonBlocks(model.findLesson(moved,lesson.id))[0].configuration),native(blocks[2].configuration));
 assert.deepEqual(native(moved.companion),native(course.companion));assert.deepEqual(native(moved.structure.modules[3]),native(modules[3]));
});
test('heading sidecars retain plain navigation titles and explicit font marks in local export',()=>{
 const document=model.fieldDocument('Chapter name','h2');document.content[0].content[0].marks=[{type:'demoFontOverride',attrs:{size:31}}];assert.equal(model.documentText(document),'Chapter name');
 const course=fixture.createDemoCourse();course.structure.modules[0].metadata.demoTitleDocument=document;const copy=model.parsePrototype(model.serializePrototype(course));assert.equal(copy.structure.modules[0].metadata.demoTitleDocument.content[0].content[0].marks[0].attrs.size,31);
});

test('fifth showcase preserves existing chapters and lazily demonstrates each of the 17 content types',async()=>{
 const original=fixture.createDemoCourse(),next=fixture.withAdvancedShowcase(original);assert.deepEqual(native(next.structure.modules.slice(0,4)),native(original.structure.modules));assert.equal(next.structure.modules.length,5);assert.equal(fixture.withAdvancedShowcase(next),next);
 const showcase=next.structure.modules[4];assert.equal(showcase.lessons.length,17);assert.ok(showcase.lessons.every(l=>!l.sections.length));
 const types=[];for(const lesson of showcase.lessons){const hydrated=await fixture.loadDemoLesson(lesson);const block=model.lessonBlocks(hydrated)[0];types.push(block.block_type);assert.ok(block.configuration.demoAdvanced.subtitle);assert.ok(block.configuration.demoAdvanced.supportingText);assert.equal(block.lesson_id,lesson.id);}assert.deepEqual(types,native(fixture.SHOWCASE_TYPES));
});
