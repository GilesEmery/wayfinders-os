'use server';
import {appendFileSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {revalidatePath} from 'next/cache';
import {readRehearsalState,writeRehearsalState} from './rehearsal-state';
import {parseBlockConfiguration} from '@/lib/experiences/builder/block-registry';
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
export async function createBlockAction(...args:unknown[]){await observe('createBlockAction',args);}
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
 await observe('setBlockAssetAction',args);const form=args.find(a=>a instanceof FormData) as FormData;const blockId=String(args[3]);if(!snapshot().blocks.some((b:{id:string})=>b.id===blockId))throw Error('Unknown rehearsal block');
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
export async function setLessonHeroAction(...args:unknown[]){await observe('setLessonHeroAction',args);}
export async function updateBlockAction(...args:unknown[]){await observe('updateBlockAction',args);const form=args.find(a=>a instanceof FormData) as FormData;const block=snapshot().blocks.find((b:{id:string})=>b.id===args[3]);if(!block||!['document','download','image','video','pdf_reader','external_link'].includes(block.block_type))return;
 const state=readRehearsalState();const current={...block,...state.blocks[block.id]};const content=block.block_type==='pdf_reader'?{title:form.get('title')||'',description:form.get('description')||'',readerMode:form.get('reader_mode')||'reader',showReader:form.has('show_reader'),allowDownload:form.has('allow_download'),allowOpenInNewTab:form.has('allow_open_in_new_tab')}:{title:form.get('title')||'',description:form.get('description')||'',url:form.get('url')||'',caption:form.get('caption')||'',alt:form.get('alt')||'',linkLabel:form.get('link_label')||''};const parsed=parseBlockConfiguration(block.block_type,content);if(!parsed.ok)throw Error(parsed.errors.join(' '));state.blocks[block.id]={...state.blocks[block.id],content:parsed.value,settings:presentationSettings(current.settings,form),requirement_level:form.get('requirement_level'),visibility:form.get('visibility')};writeRehearsalState(state);refresh(args);
}
export async function updateBlockSettingsAction(...args:unknown[]){await observe('updateBlockSettingsAction',args);}
export async function updateCompanionModuleAction(...args:unknown[]){await observe('updateCompanionModuleAction',args);}
export async function updateCourseCardAction(...args:unknown[]){await observe('updateCourseCardAction',args);}
export async function updateCourseConfigurationAction(...args:unknown[]){await observe('updateCourseConfigurationAction',args);}
export async function updateCourseLayoutAction(...args:unknown[]){await observe('updateCourseLayoutAction',args);}
export async function updateSectionAction(...args:unknown[]){await observe('updateSectionAction',args);}
export async function updateCourseTypographyAction(...args:unknown[]){await observe("updateCourseTypographyAction",args);}
