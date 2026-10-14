'use server';
import {appendFileSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {revalidatePath} from 'next/cache';
import {readRehearsalState,writeRehearsalState} from './rehearsal-state';
import {parseBlockConfiguration,getBlockDefinition} from '@/lib/experiences/builder/block-registry';
import {presentationSettings} from '@/lib/experiences/builder/block-presentation';
function snapshot(){return JSON.parse(readFileSync(join(process.cwd(),'.local/course-review/hub-leader-published.json'),'utf8'));}
function refresh(args:unknown[]){revalidatePath('/');revalidatePath(`/admin/trainings/${args[0]}/versions/${args[1]}`);}

// Inert server-action substitutes, available only inside the isolated rehearsal app.
// Observe serialized form payloads; never change the course snapshot or call a provider.
async function observe(name:string,args:unknown[]){const form=args.find(value=>value instanceof FormData) as FormData|undefined;const fields=form?Object.fromEntries([...form.entries()].filter(([,value])=>typeof value==='string')):{};appendFileSync(process.cwd()+'/rehearsal-actions.jsonl',JSON.stringify({name,ids:args.filter(value=>typeof value==='string'),fields})+'\n');}
export async function saveInlineBlockAction(...args:unknown[]){await observe('saveInlineBlockAction',args);return {ok:true,revision:new Date().toISOString()};}
export async function addCompanionModuleAction(...args:unknown[]){await observe('addCompanionModuleAction',args);}
export async function applyCourseThemeAction(...args:unknown[]){await observe('applyCourseThemeAction',args);}
export async function companionModuleCommandAction(...args:unknown[]){await observe('companionModuleCommandAction',args);}
export async function createBlockAction(...args:unknown[]){await observe('createBlockAction',args);const supported=(await import('@/lib/experiences/builder/universal-block-editor')).UNIVERSAL_BLOCK_TYPES as readonly string[];if(!supported.includes(String(args[4])))return;const source=snapshot(),state=readRehearsalState();const section=source.sections.find((s:{id:string})=>s.id===args[2]),column=source.columns.find((c:{id:string;section_id:string})=>c.id===args[3]&&c.section_id===args[2]);if(!section||!column)throw Error('Invalid local curriculum target');const id=randomUUID(),definitionId=randomUUID();const definition=getBlockDefinition(String(args[4]))!;const content=definition.defaultConfiguration();
 for(const row of [...source.blocks,...Object.values(state.blocks)].filter((b:{id?:string;column_id?:string;sort_order?:number})=>b.column_id===column.id&&Number(b.sort_order)>=Number(args[5]))){state.blocks[row.id]={...state.blocks[row.id],sort_order:Number(row.sort_order)+1};}
 state.blocks[id]={...source.blocks[0],id,block_type:args[4],block_key:String(args[4]).replace('_','-')+'-'+id,lesson_id:section.lesson_id,section_id:section.id,column_id:column.id,sort_order:Number(args[5])||0,content,settings:{},requirement_level:'optional',status:'active',visibility:'visible',completion_rule:definition.defaultCompletionRule,custom_renderer_key:null,metadata:{source:'local_rehearsal'}};state.definitions??={};if(definition.supportsResponse)state.definitions[definitionId]={...source.definitions[0],id:definitionId,block_id:id,lesson_id:section.lesson_id,experience_version_id:args[1],label:args[4]==='card_selection'?'Choose one answer':definition.label,instructions:'',response_type:definition.response!.responseType,response_key:'single-select-'+id,is_required:false,configuration:content};writeRehearsalState(state);refresh(args);
}
export async function createCourseLessonAction(...args:unknown[]){await observe('createCourseLessonAction',args);}
export async function createModuleAction(...args:unknown[]){await observe('createModuleAction',args);}
export async function createSectionAction(...args:unknown[]){await observe('createSectionAction',args);}
export async function deleteAction(...args:unknown[]){await observe('deleteAction',args);}
export async function deleteBlockAction(...args:unknown[]){await observe('deleteBlockAction',args);}
export async function dragBlockAction(...args:unknown[]){await observe('dragBlockAction',args);}
export async function dragCompanionModuleAction(...args:unknown[]){await observe('dragCompanionModuleAction',args);}
export async function dragCurriculumAction(...args:unknown[]){await observe('dragCurriculumAction',args);}
export async function duplicateBlockAction(...args:unknown[]){await observe('duplicateBlockAction',args);}
export async function moveBlockAction(...args:unknown[]){await observe('moveBlockAction',args);}
export async function publishVersionAction(...args:unknown[]){await observe('publishVersionAction',args);}
export async function renameCourseAction(...args:unknown[]){await observe('renameCourseAction',args);}
export async function renameCurriculumItemAction(...args:unknown[]){await observe('renameCurriculumItemAction',args);}
export async function reorderBlockAction(...args:unknown[]){await observe('reorderBlockAction',args);}
export async function reorderCurriculumAction(...args:unknown[]){await observe('reorderCurriculumAction',args);}
export async function saveCourseThemeAction(...args:unknown[]){await observe('saveCourseThemeAction',args);}
export async function setBlockAssetAction(...args:unknown[]){
 await observe('setBlockAssetAction',args);const form=args.find(a=>a instanceof FormData) as FormData;const blockId=String(args[3]);if(!snapshot().blocks.some((b:{id:string})=>b.id===blockId)&&!readRehearsalState().blocks[blockId])throw Error('Unknown rehearsal block');
 const state=readRehearsalState();const operation=form.get('asset_operation');let id=String(form.get('resource_id')||'');
 if(operation==='upload'){
  const file=form.get('file');if(!(file instanceof File)||file.size<1||file.size>25*1024*1024)throw Error('Choose a local file up to 25 MB');
  const mime=new Set(['application/pdf','image/jpeg','image/png','image/webp','image/gif','text/plain','text/csv','application/rtf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']);if(!mime.has(file.type))throw Error('Unsupported rehearsal file type');
  id=randomUUID();const extension=file.name.match(/\.[a-z0-9]{1,10}$/i)?.[0]||'';const name=id+extension;mkdirSync(join(process.cwd(),'public/rehearsal-files'),{recursive:true});writeFileSync(join(process.cwd(),'public/rehearsal-files',name),Buffer.from(await file.arrayBuffer()));
  state.resources.push({id,title:String(form.get('asset_title')||file.name),original_filename:file.name,mime_type:file.type,file_size_bytes:file.size,resource_type:file.type.startsWith('image/')?'image':file.type==='application/pdf'?'pdf':'download',status:'active',storage_bucket:'rehearsal',storage_path:'rehearsal/'+name,rehearsal_url:'/rehearsal-files/'+name,description:null});
 }else if(operation!=='remove'){
  const available=JSON.parse(readFileSync(join(process.cwd(),'.local/course-review/hub-leader-resources.json'),'utf8')).resources;
  if(![...available,...state.resources].some((r:{id:string})=>r.id===id))throw Error('Unknown rehearsal resource');
 }
 state.attachments[blockId]=operation==='remove'?null:id;writeRehearsalState(state);refresh(args);
}
export async function setCourseCardImageAction(...args:unknown[]){await observe('setCourseCardImageAction',args);}
export async function setCourseCoverAction(...args:unknown[]){await observe('setCourseCoverAction',args);}
export async function setCourseHeaderLogoAction(...args:unknown[]){await observe('setCourseHeaderLogoAction',args);}
export async function setCourseLogoAction(...args:unknown[]){await observe('setCourseLogoAction',args);}
export async function setLessonHeroAction(...args:unknown[]){
 await observe('setLessonHeroAction',args);const form=args.find(a=>a instanceof FormData) as FormData;const sectionId=String(args[2]);if(!snapshot().sections.some((b:{id:string})=>b.id===sectionId))throw Error('Unknown rehearsal lesson');
 const state=readRehearsalState();const operation=form.get('asset_operation');let id=String(form.get('resource_id')||'');
 if(operation==='upload'){
  const file=form.get('file');if(!(file instanceof File)||file.size<1||file.size>25*1024*1024)throw Error('Choose a local file up to 25 MB');
  const mime=new Set(['application/pdf','image/jpeg','image/png','image/webp','image/gif','text/plain','text/csv','application/rtf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']);if(!mime.has(file.type))throw Error('Unsupported rehearsal file type');
  id=randomUUID();const extension=file.name.match(/\.[a-z0-9]{1,10}$/i)?.[0]||'';const name=id+extension;mkdirSync(join(process.cwd(),'public/rehearsal-files'),{recursive:true});writeFileSync(join(process.cwd(),'public/rehearsal-files',name),Buffer.from(await file.arrayBuffer()));
  state.resources.push({id,title:String(form.get('asset_title')||file.name),original_filename:file.name,mime_type:file.type,file_size_bytes:file.size,resource_type:file.type.startsWith('image/')?'image':file.type==='application/pdf'?'pdf':'download',status:'active',storage_bucket:'rehearsal',storage_path:'rehearsal/'+name,rehearsal_url:'/rehearsal-files/'+name,description:null});
 }else if(operation!=='remove'){
  const available=JSON.parse(readFileSync(join(process.cwd(),'.local/course-review/hub-leader-resources.json'),'utf8')).resources;
  if(![...available,...state.resources].some((r:{id:string})=>r.id===id))throw Error('Unknown rehearsal resource');
 }
 state.sections??={};const section={...snapshot().sections.find((row:{id:string})=>row.id===sectionId),...state.sections[sectionId]};state.sections[sectionId]={...state.sections[sectionId],settings:{...section.settings,hero_resource_id:operation==='remove'?null:id},updated_at:new Date().toISOString()};writeRehearsalState(state);refresh(args);
}

export async function updateBlockAction(...args:unknown[]){await observe('updateBlockAction',args);const form=args.find(a=>a instanceof FormData) as FormData;const state=readRehearsalState();const original=snapshot().blocks.find((b:{id:string})=>b.id===args[3]);const block={...original,...state.blocks[String(args[3])]};if(!block.id||!['document','download','image','video','pdf_reader','external_link','card_selection'].includes(block.block_type))return;
 const current=block;const indices=[...new Set([...form.keys()].map(key=>/^option_enabled_(\d+)$/.exec(key)?.[1]).filter(Boolean))];const content=block.block_type==='card_selection'?{options:indices.filter(i=>form.get(`option_enabled_${i}`)==='on').map((i,sortOrder)=>({key:form.get(`option_key_${i}`),label:form.get(`option_label_${i}`),description:form.get(`option_description_${i}`)||'',sortOrder})),displayStyle:form.get('display_style'),cardColumns:Number(form.get('card_columns')),questionPurpose:form.get('question_purpose'),correctAnswerKey:form.get('correct_answer_key')||'',points:Number(form.get('points')||0),feedback:form.get('feedback')||''}:block.block_type==='pdf_reader'?{title:form.get('title')||'',description:form.get('description')||'',readerMode:form.get('reader_mode')||'reader',showReader:form.has('show_reader'),allowDownload:form.has('allow_download'),allowOpenInNewTab:form.has('allow_open_in_new_tab')}:{title:form.get('title')||'',description:form.get('description')||'',url:form.get('url')||'',caption:form.get('caption')||'',alt:form.get('alt')||'',linkLabel:form.get('link_label')||''};const parsed=parseBlockConfiguration(block.block_type,content);if(!parsed.ok)throw Error(parsed.errors.join(' '));state.blocks[block.id]={...state.blocks[block.id],content:parsed.value,settings:presentationSettings(current.settings,form),requirement_level:form.get('requirement_level'),visibility:form.get('visibility')};if(block.block_type==='card_selection'){state.definitions??={};const definition=[...snapshot().definitions,...Object.values(state.definitions)].find((d:{block_id?:string})=>d.block_id===block.id);if(definition)state.definitions[definition.id]={...definition,label:form.get('prompt'),instructions:form.get('instructions'),configuration:parsed.value,is_required:form.get('requirement_level')==='required'};}writeRehearsalState(state);refresh(args);
}
export async function updateBlockSettingsAction(...args:unknown[]){await observe('updateBlockSettingsAction',args);}
export async function updateCompanionModuleAction(...args:unknown[]){await observe('updateCompanionModuleAction',args);}
export async function updateCourseCardAction(...args:unknown[]){await observe('updateCourseCardAction',args);}
export async function updateCourseConfigurationAction(...args:unknown[]){await observe('updateCourseConfigurationAction',args);}
export async function updateCourseLayoutAction(...args:unknown[]){await observe('updateCourseLayoutAction',args);}
export async function updateSectionAction(...args:unknown[]){await observe('updateSectionAction',args);}
export async function updateCourseTypographyAction(...args:unknown[]){await observe("updateCourseTypographyAction",args);}

export async function saveVideoBlockAction(...args:unknown[]){
 await observe('saveVideoBlockAction',args);const form=args.find(a=>a instanceof FormData) as FormData;const state=readRehearsalState(),source=snapshot();const original=source.blocks.find((b:{id:string})=>b.id===args[3]);const block={...original,...state.blocks[String(args[3])]};if(block.block_type!=='video'||block.section_id!==args[2]||source.version.id!==args[1]||source.experience.id!==args[0])return {ok:false,error:'Video unavailable in this local lesson.'};if(form.get('expected_revision')!==block.updated_at)return {ok:false,conflict:true,error:'This video changed elsewhere. Your edits are retained; reload before saving.'};
 try{const {applyVideoEditorPatch}=await import('@/lib/experiences/builder/video-editor');const next=applyVideoEditorPatch(block.content,block.settings,JSON.parse(String(form.get('video_editor_patch'))),block.requirement_level,block.visibility);if(!next.changed)return {ok:true,unchanged:true,revision:block.updated_at};const revision=new Date().toISOString();state.blocks[block.id]={...state.blocks[block.id],content:next.content,settings:next.settings,requirement_level:next.requirement,visibility:next.visibility,updated_at:revision};writeRehearsalState(state);refresh(args);return {ok:true,revision};}catch(error){return {ok:false,error:error instanceof Error?error.message:'Local save could not be confirmed.'};}
}

export async function saveLessonHeadingAction(...args:unknown[]){await observe('saveLessonHeadingAction',args);const {applyLessonHeadingPatch}=await import('@/lib/experiences/builder/lesson-heading');const form=args[3] as FormData,state=readRehearsalState(),original=snapshot().sections.find((row:{id:string})=>row.id===args[2]);if(!original||args[0]!==snapshot().experience.id||args[1]!==snapshot().version.id)return {ok:false,error:'Invalid local lesson target'};state.sections??={};const section={...original,...state.sections[original.id]};if(form.get('expected_revision')!==section.updated_at)return {ok:false,error:'Lesson changed elsewhere'};const next=applyLessonHeadingPatch(section.title,section.description,section.settings,JSON.parse(String(form.get('heading_patch'))));if(!next.changed)return {ok:true,revision:section.updated_at,unchanged:true};const revision=new Date().toISOString();state.sections[section.id]={...state.sections[section.id],title:next.title,description:next.description,settings:next.settings,updated_at:revision};writeRehearsalState(state);refresh(args);return {ok:true,revision};}
export async function saveUniversalBlockAction(...args:unknown[]){
 await observe('saveUniversalBlockAction',args);const {applyUniversalModel}=await import('@/lib/experiences/builder/universal-block-editor');const source=snapshot(),state=readRehearsalState(),id=String(args[3]),original=source.blocks.find((b:{id:string})=>b.id===id),block={...original,...state.blocks[id]},form=args.find(a=>a instanceof FormData) as FormData;
 if(!block.id||block.section_id!==args[2]||source.experience.id!==args[0]||source.version.id!==args[1])return {ok:false,error:'Invalid local content target'};
 const definitions=[...source.definitions,...Object.values(state.definitions??{})];const native=definitions.find((d:{block_id:string})=>d.block_id===id);const response=native?{...native,...state.definitions?.[native.id]}:undefined;
 if(form.get('expected_revision')!==block.updated_at||response&&form.get('expected_definition_revision')!==response.updated_at)return {ok:false,error:'This local item changed elsewhere. Reload before saving.'};
 try{const next=applyUniversalModel(block,response,JSON.parse(String(form.get('universal_model'))));if(!next.changed)return {ok:true,unchanged:true,revision:block.updated_at,definitionRevision:response?.updated_at};const revision=new Date().toISOString();state.blocks[id]={...block,content:next.content,settings:next.settings,requirement_level:next.requirement,visibility:next.visibility,updated_at:revision};if(response&&next.response){state.definitions??={};state.definitions[response.id]={...response,...next.response,updated_at:revision};}writeRehearsalState(state);refresh(args);return {ok:true,revision,definitionRevision:response?revision:undefined};}catch(error){return {ok:false,error:error instanceof Error?error.message:'Local save failed'};}
}
