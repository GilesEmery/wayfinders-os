import type {CSSProperties} from 'react';
import {COURSE_FONT_FAMILIES} from './course-font-style';
export const COURSE_TEXT_STYLES=['h1','h2','h3','h4','h5','h6','body','small'] as const;
export type CourseTextStyle=typeof COURSE_TEXT_STYLES[number];
export type CourseTypography=Partial<Record<CourseTextStyle,{size?:number;family?:keyof typeof COURSE_FONT_FAMILIES;lineHeight?:number;spacing?:number}>>;
// Legacy sizes remain the baseline. No existing course is changed until a creator saves tokens.
export const COURSE_TEXT_DEFAULTS={h1:40,h2:28,h3:20,h4:16,h5:15,h6:13,body:16,small:13};
export function validateCourseTypography(input:unknown):CourseTypography {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Typography must be an object');
 const result:CourseTypography={};
 for(const [key,value] of Object.entries(input)){
  if(!COURSE_TEXT_STYLES.includes(key as CourseTextStyle)||!value||typeof value!=='object'||Array.isArray(value))throw Error('Unsupported text style');
  const token:Record<string,unknown>={};for(const [property,item] of Object.entries(value)){if(property==='family'){if(!Object.hasOwn(COURSE_FONT_FAMILIES,String(item)))throw Error('Unsupported font family');token.family=item;}else if(['size','lineHeight','spacing'].includes(property)){if(typeof item!=='number'||!Number.isFinite(item)||item<(property==='lineHeight'?1:property==='spacing'?0:1)||item>(property==='lineHeight'?3:property==='spacing'?120:256))throw Error('Typography value out of range');token[property]=item;}else throw Error('Unsupported typography property');}
  result[key as CourseTextStyle]=token;
 }
 return result;
}
export function readCourseTypography(input:unknown):CourseTypography {try{return validateCourseTypography(input??{});}catch{return {};}}
export function courseTypographyVariables(input:unknown):CSSProperties {const typography=readCourseTypography(input);return Object.fromEntries(Object.entries(typography).flatMap(([style,token])=>Object.entries(token).map(([property,value])=>[`--course-${style}-${property}`,property==='family'?COURSE_FONT_FAMILIES[value as keyof typeof COURSE_FONT_FAMILIES]:property==='lineHeight'?value:`${value}px`])));}

export function courseTypographyAttribute(input:unknown):string|undefined{return Object.entries(readCourseTypography(input)).flatMap(([style,token])=>Object.keys(token).map(property=>`${style}-${property}`)).join(' ')||undefined;}

export const COURSE_FONT_PACKAGES={balanced:{label:'PurposeOS standard · Cormorant Garamond + Geist',heading:'editorial',body:'sans'},modern:{label:'Geist throughout',heading:'sans',body:'sans'},editorial:{label:'Cormorant Garamond throughout',heading:'editorial',body:'editorial'},technical:{label:'Geist + System monospace',heading:'sans',body:'mono'},lato:{label:'Lato throughout',heading:'lato',body:'lato'},clean:{label:'Montserrat + Lato',heading:'montserrat',body:'lato'},friendly:{label:'Poppins + Open Sans',heading:'poppins',body:'open-sans'},classic:{label:'Playfair Display + Lato',heading:'playfair-display',body:'lato'},readable:{label:'Merriweather + Open Sans',heading:'merriweather',body:'open-sans'},inter:{label:'Inter throughout',heading:'inter',body:'inter'},roboto:{label:'Roboto throughout',heading:'roboto',body:'roboto'}} as const;
export function applyCourseFontFamilies(input:CourseTypography,heading:keyof typeof COURSE_FONT_FAMILIES,body:keyof typeof COURSE_FONT_FAMILIES):CourseTypography{return Object.fromEntries(COURSE_TEXT_STYLES.map(style=>[style,{...input[style],family:style.startsWith('h')?heading:body}]));}
