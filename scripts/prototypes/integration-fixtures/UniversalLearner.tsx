import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {readRehearsalState} from './rehearsal-state';
import {ParticipantBlockRenderer} from '@/components/experiences/builder/ParticipantBlockRenderer';
import {resolveCourseAssets} from '@/lib/experiences/builder/resource-assets';
import {createAdminSupabaseClient} from './database';
import {courseTypographyVariables,courseTypographyAttribute,readCourseTypography} from '@/lib/experiences/builder/course-typography';
import type {CSSProperties} from 'react';
export default async function UniversalLearner(){
 const source=JSON.parse(readFileSync(join(process.cwd(),'.local/course-review/hub-leader-published.json'),'utf8')),state=readRehearsalState();
 const blocks=Object.entries(state.blocks).map(([id,patch])=>({...source.blocks.find((b:{id:string})=>b.id===id),...patch,id})).filter(b=>b.status==='active');const definitions=[...source.definitions,...Object.values(state.definitions??{})];const assets=await resolveCourseAssets(createAdminSupabaseClient() as never,blocks.map(b=>String(b.id)),[]);const typography=readCourseTypography({});
 return <main className="participant-course course-reading-standard" data-course-typography={courseTypographyAttribute(typography)} style={{...courseTypographyVariables(typography),'--experience-accent':'#0054a1','--experience-background':'#fff','--experience-surface':'#f4f6f8','--experience-text':'#252a29','--course-header-ink':'#fff',padding:24} as CSSProperties}><h1>Local learner preview</h1><p>Temporary authoring changes only. Responses and assessment launches are disabled.</p>{blocks.map((block)=>{const def=definitions.find(d=>d.block_id===block.id);return <section data-learner-block-id={String(block.id)} key={String(block.id)}><ParticipantBlockRenderer block={{...block,configuration:block.content} as never} response={def?{definition:{...def,...state.definitions?.[def.id]},response:state.syntheticResponses?.[String(block.id)]??null} as never:undefined} asset={assets.blocks[String(block.id)]} route={{slug:'preview',moduleKey:'preview',lessonKey:'preview',sectionKey:'preview'}} preview/></section>;})}{!blocks.length&&<p>Edit and save a block in the local builder to preview it here.</p>}</main>;
}
