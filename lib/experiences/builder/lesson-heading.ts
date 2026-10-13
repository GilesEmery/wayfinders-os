import {plainRichText,literalRichText} from "./rich-text-document";
import type {VideoTextStyle} from './video-editor';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function lessonHeadingModel(title:string,description:string|null,settings:unknown){const h=record(record(settings).lessonHeading);return {title,titleFormatting:typeof h.titleFormatting==='string'&&plainRichText(h.titleFormatting)===title?h.titleFormatting:literalRichText(title),introduction:description??'',labelOverride:typeof h.labelOverride==='string'?h.labelOverride:'',showChapterLabel:h.showChapterLabel!==false,showHero:h.showHero!==false,titleStyle:['h1','h2','h3','h4','h5','h6','body','small'].includes(String(h.titleStyle))?String(h.titleStyle):'',introductionStyle:(['h1','h2','h3','h4','h5','h6','body','small'].includes(String(h.introductionStyle))?h.introductionStyle:'body') as VideoTextStyle,titleSize:typeof h.titleSize==='number'?h.titleSize:'',alignment:['left','center','right'].includes(String(h.alignment))?String(h.alignment):'',spacing:typeof h.spacing==='number'?h.spacing:'',heroFit:['cover','contain'].includes(String(h.heroFit))?String(h.heroFit):'',heroPosition:['center','top','bottom'].includes(String(h.heroPosition))?String(h.heroPosition):''};}
export type LessonHeadingModel=ReturnType<typeof lessonHeadingModel>;
export type LessonHeadingReceipt={ok:true;revision:string;unchanged?:boolean}|{ok:false;error:string};
export function applyLessonHeadingPatch(title:string,description:string|null,settings:unknown,input:unknown){const patch=record(input);if(input===null||Array.isArray(input)||typeof input!=='object')throw Error('Invalid heading edit');const current=lessonHeadingModel(title,description,settings);const h={...record(record(settings).lessonHeading)};let nextTitle=title,nextDescription=description;
 for(const [key,value] of Object.entries(patch)){
  if(!Object.hasOwn(current,key))throw Error('Unsupported lesson heading field');
  if(value===current[key as keyof LessonHeadingModel])continue;
  if(key==='title'){if(typeof value!=='string'||!value.trim()||value.length>200)throw Error('Enter a lesson title of at most 200 characters');nextTitle=value;continue;}
  if(key==='titleFormatting'){if(typeof value!=='string'||value.length>12000)throw Error('Title formatting is too large');const plain=plainRichText(value);if(!plain||plain.length>200)throw Error('Enter a lesson title of at most 200 characters');nextTitle=plain;h.titleFormatting=value;continue;}
  if(key==='introduction'){if(typeof value!=='string'||value.length>3000)throw Error('Introduction must be at most 3000 characters');nextDescription=value;h.richIntroduction=true;continue;}
  if(['showChapterLabel','showHero'].includes(key)){if(typeof value!=='boolean')throw Error('Invalid display option');}
  else if(key==='labelOverride'){if(typeof value!=='string'||value.length>300)throw Error('Invalid chapter label');}
  else if(['titleStyle','introductionStyle'].includes(key)){if(!['','h1','h2','h3','h4','h5','h6','body','small'].includes(String(value)))throw Error('Invalid text style');}
  else if(['titleSize','spacing'].includes(key)){if(value!==''&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>(key==='spacing'?120:256)||key==='titleSize'&&value<1))throw Error('Invalid heading spacing or size');}
  else if(key==='alignment'&&!['','left','center','right'].includes(String(value)))throw Error('Invalid alignment');
  else if(key==='heroFit'&&!['','cover','contain'].includes(String(value)))throw Error('Invalid image crop');
  else if(key==='heroPosition'&&!['','center','top','bottom'].includes(String(value)))throw Error('Invalid image position');
  h[key]=value;
 }
 const changed=nextTitle!==title||nextDescription!==description||JSON.stringify(h)!==JSON.stringify(record(record(settings).lessonHeading));return {title:nextTitle,description:nextDescription,settings:changed?{...record(settings),lessonHeading:h}:settings,changed};
}
