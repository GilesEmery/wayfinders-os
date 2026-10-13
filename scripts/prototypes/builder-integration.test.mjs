import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Mark} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {MarkdownManager} from '@tiptap/markdown';
import {load} from '../performance/offline-module.mjs';
const style=load('lib/experiences/builder/course-font-style.ts',{});
const typography=load('lib/experiences/builder/course-typography.ts',{'./course-font-style':style});
const font=load('lib/experiences/builder/course-font-override.ts',{'@tiptap/core':{Mark},'./course-font-style':style});
const sizes=load('lib/experiences/builder/course-text-size.ts',{'@tiptap/core':{Mark}});
const native=value=>JSON.parse(JSON.stringify(value));
const markdown=new MarkdownManager({extensions:[StarterKit,font.CourseFontOverride,sizes.CourseTextSize]});
test('legacy fallback preserves the exact original workspace and content-card code',()=>{
 const head=path=>execFileSync('git',['show','ce649fb03dd5f1d919431e5824a748cec6b21360:'+path],{encoding:'utf8'});
 assert.equal(readFileSync('components/admin/LegacyBuilderBlocks.tsx','utf8'),head('components/admin/BuilderBlocks.tsx'));
 assert.equal(readFileSync('components/admin/LegacyCourseBuilderWorkspace.tsx','utf8').replaceAll('LegacyBuilderBlocks','BuilderBlocks').replaceAll('LegacyCourseBuilderWorkspace','CourseBuilderWorkspace'),head('components/admin/CourseBuilderWorkspace.tsx'));
});
test('existing authoring mutation, publication, authorization, response and enrollment contracts remain unchanged',()=>{
 for(const path of ['app/admin/trainings/[experienceId]/versions/[versionId]/actions.ts','app/admin/trainings/[experienceId]/versions/[versionId]/release-actions.ts','lib/experiences/admin/version-release.ts','lib/platform/response-library.ts','lib/platform/response-library-policy.ts'])assert.equal(readFileSync(path,'utf8'),execFileSync('git',['show','ce649fb03dd5f1d919431e5824a748cec6b21360:'+path],{encoding:'utf8'}));
 const block=readFileSync('lib/experiences/admin/block-mutations.ts','utf8'),original=execFileSync('git',['show','ce649fb03dd5f1d919431e5824a748cec6b21360:lib/experiences/admin/block-mutations.ts'],{encoding:'utf8'});assert.equal(block.split('// Video uses the same hierarchy/author checks and block table, with a changed-only CAS save.')[0].trimEnd().concat('\n').replace("parseBlockConfiguration, retainSingleSelectSettings","parseBlockConfiguration").replace('block.block_type === "card_selection" ? retainSingleSelectSettings(block.content,formConfiguration(block.block_type, form)) : formConfiguration(block.block_type, form)','formConfiguration(block.block_type, form)').replace('const base = requested || slug(label || `option-${position + 1}`);','const base = slug(requested || label || `option-${position + 1}`);').replace('if (blockType === "card_selection") return {...optionConfiguration(form,false),...(form.has("display_style")?{displayStyle:form.get("display_style"),cardColumns:Number(form.get("card_columns")),questionPurpose:form.get("question_purpose"),correctAnswerKey:form.get("correct_answer_key")||"",points:Number(form.get("points")||0),feedback:form.get("feedback")||""}:{})};','if (blockType === "card_selection") return optionConfiguration(form, false);').replace('import {shouldRelinkExternalResource} from "../builder/media-source";\n','').replace('if (MEDIA_TYPES.has(block.block_type) && shouldRelinkExternalResource(block.block_type,block.content,parsed.value)) {','if (MEDIA_TYPES.has(block.block_type)) {').replaceAll(', "h5", "h6"','').replace(', ...(form.has("callout_style")?{calloutStyle:form.get("callout_style"),showIcon:form.has("show_icon"),showTitle:form.has("show_title"),borderStyle:form.get("border_style")}: {})','').replace('["pdf", "download", "worksheet", "guide", "image"]','["pdf", "download", "worksheet", "guide"]').replace('Choose an image, PDF or document asset.','Choose a PDF or document asset.'),original);
});
test('no course-level typography defaults are emitted or applied unless explicitly configured',()=>{
 assert.deepEqual(native(typography.courseTypographyVariables({})),{});assert.equal(typography.courseTypographyAttribute({}),undefined);
 assert.deepEqual(native(typography.courseTypographyVariables({h4:{size:24}})),{'--course-h4-size':'24px'});assert.equal(typography.courseTypographyAttribute({h4:{size:24}}),'h4-size');assert.equal(typography.COURSE_TEXT_DEFAULTS.h4,16);
});
test('font and typography inputs reject executable CSS, invalid ranges, prototype keys and unknown fields',()=>{
 for(const input of [{h4:{size:999}},{h4:{family:'url(https://bad.example)'}},{h4:{lineHeight:0}},{h4:{tracking:'expression(x)'}},{other:{size:22}}])assert.throws(()=>typography.validateCourseTypography(input));
 assert.deepEqual(native(style.safeFontAttributes({size:999,family:'__proto__',color:'url(https://bad.example)'})),{size:null,family:null,color:null});assert.deepEqual(native(style.courseFontStyle({size:24,family:'editorial',color:'#123456'})),{fontSize:'24px',fontFamily:'var(--font-editorial), serif',color:'#123456'});
});
test('explicit font size, bold, italic and underline round-trip through the real Markdown format',()=>{
 const input='[[font:27;editorial;#123456]]**bold** and *italic*[[/font]]';const document=markdown.parse(input),serialized=markdown.serialize(document);assert.match(serialized,/\[\[font:27;editorial;#123456\]\]/);assert.match(serialized,/\*\*bold\*\*/);assert.match(serialized,/\*italic\*/);assert.deepEqual(markdown.parse(serialized),document);
 const underline={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Underlined',marks:[{type:'underline'}]}]}]};assert.match(JSON.stringify(markdown.parse(markdown.serialize(underline))),/underline/);
});
test('H5/H6 headings and visual Body/Small text styles survive serialization',()=>{
 for(const size of ['h1','h2','h3','h4','h5','h6','body','small']){const document=markdown.parse(`[[size:${size}]]Sized text[[/size]]`);assert.match(JSON.stringify(document),new RegExp('"size":"'+size+'"'));assert.match(markdown.serialize(document),new RegExp('size:'+size));}
 assert.match(JSON.stringify(markdown.parse('##### H5\n\n###### H6')),/"level":5/);assert.match(JSON.stringify(markdown.parse('###### H6')),/"level":6/);
});
test('sidebar closure retains mounted editors, and only explicit text editing broadcasts a live preview',()=>{
 const card=readFileSync('components/admin/BuilderEditCard.tsx','utf8');assert.match(card,/mounted&&/);assert.match(card,/visible=\{open\}/);assert.match(card,/purposeos:builder-editor-open/);
 const editor=readFileSync('components/admin/InlineTextBlockEditor.tsx','utf8');assert.match(editor,/if \(!editor \|\| !mounted.current \|\| suppressUpdates.current \|\| recovery \|\| conflict\) return/);assert.match(editor,/purposeos:builder-text-preview/);
});
test('new course typography writer is creator-scoped, draft-only, compares revision and preserves other JSON',()=>{
 const code=readFileSync('app/admin/trainings/[experienceId]/edit-actions.ts','utf8').split('export async function updateCourseTypographyAction')[1];assert.match(code,/canBuildExperienceById/);assert.match(code,/status!=="draft"/);assert.match(code,/\.eq\("status","draft"\)/);assert.match(code,/\.eq\("updated_at",current.data.updated_at\)/);assert.match(code,/\.\.\.original,typography/);assert.doesNotMatch(code,/participant|response_definitions|enrollment|\.insert\(/);
});

async function typographyAction({allow=true,status='draft',stale=false,missing=false,input={h4:{size:22}}}={}){
 const calls=[];let updates=null;
 const configuration=load('lib/experiences/builder/course-configuration.ts',{'./course-typography':typography});
 const current={id:'version',status,course_configuration:{card:{headline:'Keep me'},appearance:{customSource:'preserved'},opaque:{nested:[1,2]}},updated_at:'revision-1'};
 function query(){let write=false;const q={select(){return q;},eq(key,value){calls.push(['eq',key,value]);return q;},update(value){write=true;updates=value;calls.push(['update']);return q;},async maybeSingle(){return {data:write?(stale?null:{id:'version'}):(missing?null:current),error:null};}};return q;}
 const module=load('app/admin/trainings/[experienceId]/edit-actions.ts',{
  'next/cache':{revalidatePath:path=>calls.push(['revalidate',path])},'next/navigation':{redirect:path=>{throw Error('REDIRECT '+path);},unstable_rethrow:()=>{}},
  '@/lib/admin/auth':{requireAdmin:async()=>({id:'creator',email:'creator@example.invalid'}),audit:async()=>calls.push(['audit'])},
  '@/lib/platform/authorization':{getAuthorizationContext:async()=>({}),canBuildExperienceById:async()=>allow},
  '@/lib/experiences/admin/mutations':{},'@/lib/experiences/admin/version-release':{},'@/lib/supabase/admin':{createAdminSupabaseClient:()=>({from:table=>{assert.equal(table,'experience_versions');calls.push(['from',table]);return query();}})},
  '@/lib/experiences/builder/course-configuration':configuration,'@/lib/experiences/builder/resource-assets':{},'@/lib/experiences/builder/theme-validation':{},'@/lib/experiences/builder/course-typography':typography,
 });
 const form=new FormData();form.set('typography_json',JSON.stringify(input));let error;try{await module.updateCourseTypographyAction('course','version',form);}catch(e){error=e.message;}
 return {calls,updates,current,error};
}
test('typography action refuses unauthorized creator, missing/foreign version and published version before writing',async()=>{
 for(const options of [{allow:false},{missing:true},{status:'published'}]){const result=await typographyAction(options);assert.equal(result.updates,null);assert.ok(result.error);assert.ok(!result.calls.some(call=>call[0]==='audit'));}
});
test('typography action rejects unsafe input and stale revision without reporting a successful save',async()=>{
 const invalid=await typographyAction({input:{h4:{size:999}}});assert.equal(invalid.updates,null);assert.match(invalid.error,/range/);
 const stale=await typographyAction({stale:true});assert.match(stale.error,/reload/);assert.ok(!stale.calls.some(call=>call[0]==='audit'||call[0]==='revalidate'));assert.ok(stale.calls.some(call=>call[0]==='eq'&&call[1]==='updated_at'));
});
test('valid typography action changes only draft configuration, preserves custom keys and audits the successful write',async()=>{
 const result=await typographyAction();assert.match(result.error,/REDIRECT/);assert.deepEqual(native(result.updates),{course_configuration:{...result.current.course_configuration,typography:{h4:{size:22}}}});assert.ok(result.calls.some(call=>call[0]==='eq'&&call[1]==='experience_id'&&call[2]==='course'));assert.ok(result.calls.some(call=>call[0]==='eq'&&call[1]==='status'&&call[2]==='draft'));assert.ok(result.calls.some(call=>call[0]==='audit'));
});
