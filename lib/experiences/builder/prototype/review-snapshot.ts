import type { BuilderCourseStructure, BuilderLesson } from '../types';
import type { CompanionModuleRecord } from '../companion';
import type { Json } from '@/lib/supabase/database.types';
import type { PrototypeCourse } from './model';
export type ReviewBundle={course:PrototypeCourse;lessons:BuilderLesson[];sourceVersion:string;capturedAt:string;assets:Record<string,string>;assessments:{id:string;name:string;slug:string;description:string;blocks?:{custom_renderer_key:string}[]}[]};
// Only authoring rows enter this adapter. The original snapshot remains unchanged on disk.
export function reviewBundle(snapshot:Record<string,unknown>,resources:Record<string,unknown>,manifest:{assets:{id:string;path:string}[]},assessments:ReviewBundle['assessments']):ReviewBundle {
 const source=snapshot as unknown as {experience:BuilderCourseStructure['experience'];version:BuilderCourseStructure['version'];modules:BuilderCourseStructure['modules'];lessons:BuilderLesson[];sections:BuilderLesson['sections'];layouts:NonNullable<BuilderLesson['sections'][number]['layout']>[];columns:NonNullable<BuilderLesson['sections'][number]['layout']>['columns'];blocks:Record<string,unknown>[];definitions:Record<string,unknown>[];companion:CompanionModuleRecord[];captured_at:string};
 if(source.experience.slug!=='hub-leader-cohort'||source.version.id!=='34181531-b723-4d7f-863a-3b5da948110d')throw Error('Unexpected course review source');
 const linked=resources.block_resources as {content_block_id:string;resource_id:string}[];
 const assets=Object.fromEntries(manifest.assets.map(asset=>[asset.id,asset.path]));
 const lessons=source.lessons.map(lesson=>({...lesson,sections:source.sections.filter(section=>section.lesson_id===lesson.id).map(section=>{
  const layout=source.layouts.find(layout=>layout.section_id===section.id);
  return {...section,legacy:false,layout:layout?{...layout,columns:source.columns.filter(column=>column.section_layout_id===layout.id).map(column=>({...column,blocks:source.blocks.filter(block=>block.section_id===section.id&&block.column_id===column.id).map(block=>({...block,configuration:structuredClone(block.content??{}),metadata:{...(block.metadata as Record<string,Json>),reviewCopy:true},reviewDefinition:source.definitions.find(definition=>definition.block_id===block.id),reviewAsset:assets[linked.find(link=>link.content_block_id===block.id)?.resource_id??'']}))}))}:null};
 })})) as unknown as BuilderLesson[];
 const version={...structuredClone(source.version),status:'draft',published_at:null,course_configuration:{...(source.version.course_configuration as Record<string,Json>),demoCustomization:{theme:'purpose_mixed',typography:{}}}} as BuilderCourseStructure['version'];
 const course:PrototypeCourse={structure:{experience:{...structuredClone(source.experience),slug:'demo-hub-leader-cohort',status:'draft',current_published_version_id:null},version,modules:source.modules.map(module=>({...module,lessons:lessons.filter(lesson=>lesson.module_id===module.id).map(lesson=>({...lesson,sections:[],metadata:{...(lesson.metadata as Record<string,Json>),demo_source_lesson_id:lesson.id}}))}))},companion:structuredClone(source.companion)};
 return {course,lessons,assets,assessments,sourceVersion:source.version.id,capturedAt:source.captured_at};
}
