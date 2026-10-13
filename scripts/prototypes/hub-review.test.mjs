import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from '../performance/offline-module.mjs';
const source=JSON.parse(readFileSync('.local/course-review/hub-leader-published.json','utf8'));
const resources=JSON.parse(readFileSync('.local/course-review/hub-leader-resources.json','utf8'));
const manifest=JSON.parse(readFileSync('.local/course-review/asset-manifest.json','utf8'));
const assessments=JSON.parse(readFileSync('.local/course-review/hub-leader-assessments.json','utf8'));
const model=load('lib/experiences/builder/prototype/model.ts',{});
const {reviewBundle}=load('lib/experiences/builder/prototype/review-snapshot.ts',{fixture:{structuredClone}},'const {structuredClone}=require("fixture");\n'+readFileSync('lib/experiences/builder/prototype/review-snapshot.ts','utf8'));
const native=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const review=reviewBundle(source,resources,manifest,assessments);
test('published source has complete authoring curriculum and no participant dataset',()=>{
 assert.equal(source.version.id,'34181531-b723-4d7f-863a-3b5da948110d');assert.equal(source.modules.length,16);assert.equal(source.lessons.length,16);assert.equal(source.sections.length,68);assert.equal(source.blocks.length,194);assert.equal(source.definitions.length,49);
 assert.deepEqual(Object.keys(source).sort(),['blocks','captured_at','columns','companion','definitions','experience','layouts','lessons','modules','project','sections','theme','version']);assert.ok(!source.experience.created_by);assert.ok(!source.version.published_by);
});
test('new-builder adapter preserves every authored configuration, layout, resource identity and question definition',()=>{
 const sections=review.lessons.flatMap(lesson=>lesson.sections),blocks=sections.flatMap(section=>section.layout?.columns.flatMap(column=>column.blocks)??[]);
 assert.equal(sections.length,68);assert.equal(blocks.length,194);for(const block of blocks){const original=source.blocks.find(row=>row.id===block.id);assert.deepEqual(native(block.configuration),original.content);assert.deepEqual(native(block.settings),original.settings);assert.equal(block.column_id,original.column_id);assert.equal(block.section_id,original.section_id);assert.equal(block.custom_renderer_key,original.custom_renderer_key);assert.deepEqual(native(block.reviewDefinition),source.definitions.find(definition=>definition.block_id===block.id));}
 assert.deepEqual(native(review.course.companion),source.companion);assert.ok(review.course.structure.modules.every(module=>module.lessons.every(lesson=>!lesson.sections.length)));assert.equal(review.course.structure.version.status,'draft');assert.equal(review.course.structure.experience.current_published_version_id,null);
});
test('all linked stored media has a local copy; source files and snapshot remain unchanged',()=>{
 assert.equal(manifest.assets.length,36);assert.equal(manifest.failures.length,0);for(const asset of manifest.assets){assert.ok(asset.path.startsWith('/review-assets/'));assert.equal(readFileSync('.local/course-review/assets/'+asset.path.split('/').at(-1)).byteLength,asset.bytes);}const before=JSON.stringify(source);reviewBundle(source,resources,manifest,assessments);assert.equal(JSON.stringify(source),before);
});
test('local source rejects foreign snapshots and edits remain serializable without migrating authoring data',()=>{
 assert.throws(()=>reviewBundle({...source,experience:{...source.experience,slug:'another-course'}},resources,manifest,assessments));assert.equal(model.parsePrototype(model.serializePrototype(review.course)).structure.modules.length,16);
 const route=readFileSync('app/dev/hub-leader-builder/page.tsx','utf8');assert.match(route,/NODE_ENV==='production'\)notFound/);assert.doesNotMatch(route,/createAdmin|\.from\(|fetch\(/);
});
