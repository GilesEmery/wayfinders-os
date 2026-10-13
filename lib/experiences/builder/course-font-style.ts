import type {CSSProperties} from 'react';
export const COURSE_FONT_FAMILIES={sans:'var(--font-sans), sans-serif',editorial:'var(--font-editorial), serif',mono:'ui-monospace, monospace'} as const;
export function safeFontAttributes(input:Record<string,unknown>){
 const size=Number(input.size),family=String(input.family??''),color=String(input.color??'');
 return {size:Number.isFinite(size)&&size>=1&&size<=256?size:null,family:Object.hasOwn(COURSE_FONT_FAMILIES,family)?family:null,color:/^#[0-9a-f]{6}$/i.test(color)?color:null};
}
export function courseFontStyle(input:Record<string,unknown>):CSSProperties {const attrs=safeFontAttributes(input);return {fontSize:attrs.size?`${attrs.size}px`:undefined,fontFamily:attrs.family?COURSE_FONT_FAMILIES[attrs.family as keyof typeof COURSE_FONT_FAMILIES]:undefined,color:attrs.color??undefined};}
