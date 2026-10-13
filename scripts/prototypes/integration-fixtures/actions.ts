'use server';
import {appendFileSync} from 'node:fs';
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
export async function setBlockAssetAction(...args:unknown[]){await observe('setBlockAssetAction',args);}
export async function setCourseCardImageAction(...args:unknown[]){await observe('setCourseCardImageAction',args);}
export async function setCourseCoverAction(...args:unknown[]){await observe('setCourseCoverAction',args);}
export async function setCourseHeaderLogoAction(...args:unknown[]){await observe('setCourseHeaderLogoAction',args);}
export async function setCourseLogoAction(...args:unknown[]){await observe('setCourseLogoAction',args);}
export async function setLessonHeroAction(...args:unknown[]){await observe('setLessonHeroAction',args);}
export async function updateBlockAction(...args:unknown[]){await observe('updateBlockAction',args);}
export async function updateBlockSettingsAction(...args:unknown[]){await observe('updateBlockSettingsAction',args);}
export async function updateCompanionModuleAction(...args:unknown[]){await observe('updateCompanionModuleAction',args);}
export async function updateCourseCardAction(...args:unknown[]){await observe('updateCourseCardAction',args);}
export async function updateCourseConfigurationAction(...args:unknown[]){await observe('updateCourseConfigurationAction',args);}
export async function updateCourseLayoutAction(...args:unknown[]){await observe('updateCourseLayoutAction',args);}
export async function updateSectionAction(...args:unknown[]){await observe('updateSectionAction',args);}
export async function updateCourseTypographyAction(...args:unknown[]){await observe("updateCourseTypographyAction",args);}
