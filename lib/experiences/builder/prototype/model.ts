import type { JSONContent } from "@tiptap/core";
import type { BuilderContentBlock, BuilderCourseStructure, BuilderLesson, BuilderModule, ThemeTypographyKey } from "../types";
import type { CompanionModuleRecord } from "../companion";
import type { Json } from "@/lib/supabase/database.types";
import type { TypographyOverrides } from "./typography";

export type PrototypeCourse = { structure: BuilderCourseStructure; companion: CompanionModuleRecord[] };
export type DemoCustomization = { theme: ThemeTypographyKey; typography: TypographyOverrides; companionVisible: boolean; readingWidth: "focused" | "standard" | "wide"; accent: string; title: string };
export const DEMO_STORAGE_KEY = "purposeos:codex3:fictional-course:v1";
export function configuration(course: PrototypeCourse): DemoCustomization {
  const config = course.structure.version.course_configuration as Record<string, Json>;
  const demo = config.demoCustomization as unknown as Pick<DemoCustomization,"theme"|"typography">;
  const appearance=(config.appearance??{}) as Record<string,Json>,card=(config.card??{}) as Record<string,Json>;
  return {...demo,companionVisible:course.structure.version.shell_mode==="enhanced",readingWidth:(appearance.reading_width??"standard") as DemoCustomization["readingWidth"],accent:String(appearance.accent_color??course.structure.experience.accent_color??"#0054a1"),title:String(card.headline??course.structure.experience.name)};
}
export function customize(course: PrototypeCourse, patch: Partial<DemoCustomization>): PrototypeCourse {
  const config=course.structure.version.course_configuration as Record<string,Json>;
  const demo={...(config.demoCustomization as Record<string,Json>)};
  if(patch.theme!==undefined)demo.theme=patch.theme;
  if(patch.typography!==undefined)demo.typography=patch.typography as Json;
  const appearance={...(config.appearance as Record<string,Json>)};
  if(patch.readingWidth!==undefined)appearance.reading_width=patch.readingWidth;
  if(patch.accent!==undefined)appearance.accent_color=patch.accent;
  const card={...(config.card as Record<string,Json>)};
  if(patch.title!==undefined)card.headline=patch.title;
  return {...course,structure:{...course.structure,version:{...course.structure.version,shell_mode:patch.companionVisible===undefined?course.structure.version.shell_mode:patch.companionVisible?"enhanced":"standard",course_configuration:{...config,appearance,card,demoCustomization:demo}}}};
}
export function findLesson(course: PrototypeCourse, id: string) { return course.structure.modules.flatMap(module=>module.lessons).find(lesson=>lesson.id===id); }
export function lessonBlocks(lesson?: BuilderLesson): BuilderContentBlock[] { return lesson?.sections.flatMap(section=>section.layout?.columns.flatMap(column=>column.blocks) ?? []) ?? []; }
export function updateLesson(course: PrototypeCourse, id: string, change: (lesson: BuilderLesson)=>BuilderLesson): PrototypeCourse {
  return { ...course, structure: { ...course.structure, modules: course.structure.modules.map(module=>({...module,lessons:module.lessons.map(lesson=>lesson.id===id?change(lesson):lesson)})) } };
}
export function updateBlock(course: PrototypeCourse, lessonId: string, blockId: string, change: (block: BuilderContentBlock)=>BuilderContentBlock) {
  return updateLesson(course,lessonId,lesson=>({...lesson,sections:lesson.sections.map(section=>({...section,layout:section.layout?{...section.layout,columns:section.layout.columns.map(column=>({...column,blocks:column.blocks.map(block=>block.id===blockId?change(block):block)}))}:null}))}));
}
export function blockDocument(block: BuilderContentBlock): JSONContent | null { return block.configuration.demoDocument as JSONContent | undefined ?? null; }
export function setBlockDocument(block: BuilderContentBlock, document: JSONContent): BuilderContentBlock {
  const config={...block.configuration,demoDocument:document as Json};return {...block,configuration:config};
}
export function move<T extends { sort_order: number }>(items: T[], index: number, direction: -1|1): T[] {
  if(index<0 || index+direction<0 || index+direction>=items.length)return items;
  const next=[...items];[next[index],next[index+direction]]=[next[index+direction],next[index]];return next.map((item,sort_order)=>({...item,sort_order}));
}
export function reorderBlock(course: PrototypeCourse, lessonId: string, blockId: string, direction: -1|1) {
  return updateLesson(course,lessonId,lesson=>({...lesson,sections:lesson.sections.map(section=>({...section,layout:section.layout?{...section.layout,columns:section.layout.columns.map(column=>({...column,blocks:move(column.blocks,column.blocks.findIndex(block=>block.id===blockId),direction)}))}:null}))}));
}
export function duplicateLesson(lesson: BuilderLesson, id: ()=>string): BuilderLesson {
  const lessonId=id();return {...structuredClone(lesson),id:lessonId,lesson_key:`lesson-${lessonId}`,title:`${lesson.title} (copy)`,sections:lesson.sections.map(section=>{
    const sectionId=id(),layoutId=id();return {...structuredClone(section),id:sectionId,lesson_id:lessonId,layout:section.layout?{...structuredClone(section.layout),id:layoutId,section_id:sectionId,columns:section.layout.columns.map(column=>{
      const columnId=id();return {...structuredClone(column),id:columnId,section_id:sectionId,section_layout_id:layoutId,blocks:column.blocks.map(block=>({...structuredClone(block),id:id(),lesson_id:lessonId,section_id:sectionId,column_id:columnId}))};
    })}:null};
  })};
}
export function cloneChapter(module: BuilderModule, id: ()=>string): BuilderModule {
  const moduleId=id();return {...structuredClone(module),id:moduleId,module_key:`chapter-${moduleId}`,title:`${module.title} (copy)`,lessons:module.lessons.map(source=>{const lesson=duplicateLesson(source,id);return {...lesson,module_id:moduleId,sections:lesson.sections.map(section=>({...section,module_id:moduleId}))};})};
}
export function serializePrototype(course: PrototypeCourse): string { return JSON.stringify(course); }
export function parsePrototype(value: string): PrototypeCourse {
  const course=JSON.parse(value) as PrototypeCourse;
  if(course?.structure?.experience?.slug!=="demo-hub-leader-cohort" || !Array.isArray(course.structure.modules) || !Array.isArray(course.companion) || !configuration(course)?.typography)throw new Error("This is not a compatible fictional demo.");
  for(const chapter of course.structure.modules){if(!Array.isArray(chapter.lessons))throw new Error("Invalid curriculum.");for(const lesson of chapter.lessons){if(lesson.module_id!==chapter.id||!Array.isArray(lesson.sections))throw new Error("Invalid lesson hierarchy.");}}
  return course;
}

// Drag destinations stay inside their existing hierarchy; opaque IDs and references survive.
export function placeBefore<T extends {id:string;sort_order:number}>(items:T[],source:string,target:string):T[] {
 const from=items.findIndex(item=>item.id===source),to=items.findIndex(item=>item.id===target);
 if(from<0||to<0||from===to)return items;
 const next=items.filter(item=>item.id!==source);next.splice(next.findIndex(item=>item.id===target),0,items[from]);
 return next.map((item,sort_order)=>({...item,sort_order}));
}
export function dragCurriculum(course:PrototypeCourse,kind:"chapter"|"lesson"|"block",source:string,target:string,lessonId:string):PrototypeCourse {
 if(kind==="chapter")return {...course,structure:{...course.structure,modules:placeBefore(course.structure.modules,source,target)}};
 if(kind==="lesson")return {...course,structure:{...course.structure,modules:course.structure.modules.map(module=>({...module,lessons:placeBefore(module.lessons,source,target)}))}};
 return updateLesson(course,lessonId,lesson=>({...lesson,sections:lesson.sections.map(section=>({...section,layout:section.layout?{...section.layout,columns:section.layout.columns.map(column=>({...column,blocks:placeBefore(column.blocks,source,target)}))}:null}))}));
}
export function fieldDocument(text:string,style="body"):JSONContent {
 const heading=/^h[1-6]$/.test(style);
 return {type:"doc",content:[{type:heading?"heading":"paragraph",attrs:heading?{level:Number(style[1]),courseStyle:style}:{courseStyle:style},content:text?[{type:"text",text}]:[]}]};
}
export function documentText(document:JSONContent):string {
 if(document.type==="text")return document.text??"";
 const text=(document.content??[]).map(documentText).join(document.type==="doc"?"\n":"");
 return document.type==="doc"?text.replace(/\n+$/,""):text;
}
