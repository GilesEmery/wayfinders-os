import type {CSSProperties} from 'react';
export const COURSE_FONT_FAMILIES={sans:'var(--font-sans), sans-serif',editorial:'var(--font-editorial), serif',mono:'ui-monospace, monospace',lato:'Lato, sans-serif',roboto:'Roboto, sans-serif','open-sans':'"Open Sans", sans-serif',inter:'Inter, sans-serif',montserrat:'Montserrat, sans-serif',poppins:'Poppins, sans-serif',merriweather:'Merriweather, serif','playfair-display':'"Playfair Display", serif',nunito:'Nunito, sans-serif',raleway:'Raleway, sans-serif','libre-baskerville':'"Libre Baskerville", serif','source-sans-3':'"Source Sans 3", sans-serif','roboto-mono':'"Roboto Mono", monospace'} as const;
export function safeFontAttributes(input:Record<string,unknown>){
 const size=Number(input.size),family=String(input.family??''),color=String(input.color??'');
 return {size:Number.isFinite(size)&&size>=1&&size<=256?size:null,family:Object.hasOwn(COURSE_FONT_FAMILIES,family)?family:null,color:/^#[0-9a-f]{6}$/i.test(color)?color:null};
}
export function courseFontStyle(input:Record<string,unknown>):CSSProperties {const attrs=safeFontAttributes(input);return {fontSize:attrs.size?`${attrs.size}px`:undefined,fontFamily:attrs.family?COURSE_FONT_FAMILIES[attrs.family as keyof typeof COURSE_FONT_FAMILIES]:undefined,color:attrs.color??undefined};}

export type CourseFontFamily=keyof typeof COURSE_FONT_FAMILIES;
export const COURSE_FONT_NAMES:Record<CourseFontFamily,string>={sans:'Geist',editorial:'Cormorant Garamond',mono:'System monospace',lato:'Lato',roboto:'Roboto','open-sans':'Open Sans',inter:'Inter',montserrat:'Montserrat',poppins:'Poppins',merriweather:'Merriweather','playfair-display':'Playfair Display',nunito:'Nunito',raleway:'Raleway','libre-baskerville':'Libre Baskerville','source-sans-3':'Source Sans 3','roboto-mono':'Roboto Mono'};
export const GOOGLE_COURSE_FONTS=['lato','roboto','open-sans','inter','montserrat','poppins','merriweather','playfair-display'] as const;
export const COURSE_FONT_LIBRARY=[...GOOGLE_COURSE_FONTS,'editorial','sans','mono','nunito','raleway','libre-baskerville','source-sans-3','roboto-mono'] as const;
export function defaultCourseFont(style:string):CourseFontFamily{return style.startsWith('h')?'editorial':'sans';}
