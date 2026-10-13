import {safeExternalUrl} from './media-source.ts';
export type VideoTextStyle='h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'body'|'small';
export type VideoEditorPatch={content?:Record<string,unknown>;presentation?:Record<string,unknown>;appearance?:Record<string,unknown>;requirement?:string;visibility?:string};
export type VideoSaveResult={ok:true;revision:string;unchanged?:boolean}|{ok:false;error:string;conflict?:boolean};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const own=(value:Record<string,unknown>,key:string)=>Object.prototype.hasOwnProperty.call(value,key);
const string=(value:unknown)=>typeof value==='string'?value:'';
export const VIDEO_TEXT_STYLES=['h1','h2','h3','h4','h5','h6','body','small'] as const;
const style=(value:unknown,fallback:VideoTextStyle):VideoTextStyle=>VIDEO_TEXT_STYLES.includes(value as VideoTextStyle)?value as VideoTextStyle:fallback;
export function videoEditorModel(content:unknown,settings:unknown,requirement='optional',visibility='visible'){
 const c=record(content),s=record(settings),p=record(s.textPresentation);
 const subtextKey: 'subtitle'|'caption'=own(p,'subtitle')?'subtitle':'caption';
 return {header:own(p,'header')?string(p.header):string(c.title),text:own(p,'body')?string(p.body):string(c.description),subtext:own(p,subtextKey)?string(p[subtextKey]):string(c.caption),url:string(c.url),layout:string(p.mediaSide)||'stacked',placement:string(p.placement)||'below',headerStyle:style(p.headerSize,'h3'),textStyle:style(p.bodySize,own(p,'body')?'h4':'body'),subtextStyle:style(p[`${subtextKey}Size`],subtextKey==='subtitle'?'h3':'small'),legacyCaptionStyle:style(p.captionSize,'small'),legacyCaption:subtextKey==='subtitle'?string(p.caption):'',mediaTitle:string(c.title),mediaDescription:string(c.description),mediaCaption:string(c.caption),alt:string(c.alt),linkLabel:string(c.linkLabel),appearance:{...record(p.appearance??s.blockAppearance)},requirement,visibility,subtextKey,hasLegacyCaption:subtextKey==='subtitle'&&own(p,'caption')};
}
export type VideoEditorModel=ReturnType<typeof videoEditorModel>;
export function videoEditorChanges(initial:VideoEditorModel,next:VideoEditorModel):VideoEditorPatch{
 const content:Record<string,unknown>={},presentation:Record<string,unknown>={},appearance:Record<string,unknown>={};
 for(const [field,key] of [['url','url'],['mediaTitle','title'],['mediaDescription','description'],['mediaCaption','caption'],['alt','alt'],['linkLabel','linkLabel']] as const)if(initial[field]!==next[field])content[key]=next[field];
 for(const [field,key] of [['header','header'],['text','body'],['subtext',initial.subtextKey],['layout','mediaSide'],['placement','placement'],['headerStyle','headerSize'],['textStyle','bodySize'],['subtextStyle',`${initial.subtextKey}Size`],['legacyCaption','caption'],['legacyCaptionStyle','captionSize']] as const)if(initial[field]!==next[field])presentation[key]=next[field];
 for(const key of new Set([...Object.keys(initial.appearance),...Object.keys(next.appearance)]))if(initial.appearance[key]!==next.appearance[key])appearance[key]=next.appearance[key]??null;
 return {...(Object.keys(content).length?{content}:{}),...(Object.keys(presentation).length?{presentation}:{}),...(Object.keys(appearance).length?{appearance}:{}),...(initial.requirement!==next.requirement?{requirement:next.requirement}:{}),...(initial.visibility!==next.visibility?{visibility:next.visibility}:{})};
}
export function applyVideoEditorPatch(content:unknown,settings:unknown,input:unknown,requirement='optional',visibility='visible'){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Video changes must be an object.');
 const patch=record(input);for(const key of ['content','presentation','appearance'])if(own(patch,key)&&(!patch[key]||typeof patch[key]!=='object'||Array.isArray(patch[key])))throw Error('Invalid Video change group.');if(Object.keys(patch).some(k=>!['content','presentation','appearance','requirement','visibility'].includes(k)))throw Error('Unsupported Video edit field.');
 if(!Object.keys(record(patch.content)).length&&!Object.keys(record(patch.presentation)).length&&!Object.keys(record(patch.appearance)).length&&!own(patch,'requirement')&&!own(patch,'visibility'))return {content:content as Record<string,unknown>,settings:settings as Record<string,unknown>,requirement,visibility,changed:false};
 const c={...record(content)},s={...record(settings)},original=videoEditorModel(content,settings,requirement,visibility);
 const contentPatch=record(patch.content),pPatch=record(patch.presentation),aPatch=record(patch.appearance);
 for(const [key,value] of Object.entries(contentPatch)){
  const limits:Record<string,number>={title:200,description:3000,url:2048,caption:1000,alt:300,linkLabel:120};
  if(!(key in limits)||typeof value!=='string'||value.length>limits[key])throw Error('Invalid Video content field.');
  if(key==='url'&&value.trim()&&!safeExternalUrl(value))throw Error('Enter a valid HTTPS video URL without embedded credentials.');
  c[key]=key==='url'?(safeExternalUrl(value)||''):value;
 }
 const p={...record(s.textPresentation)};
 if(Object.keys(pPatch).length||Object.keys(aPatch).length){
  s.videoTextEditor=1;
  if(!own(p,'header'))p.header=original.header;if(!own(p,'body'))p.body=original.text;
  if(!own(p,'headerSize'))p.headerSize=original.headerStyle;if(!own(p,'bodySize'))p.bodySize=original.textStyle;
  if(!own(p,'placement'))p.placement=original.placement;
  // A new presentation must retain a pre-existing media caption when its native copy becomes hidden.
  if(!own(p,'subtitle')&&!own(p,'caption')&&original.subtext)p.caption=original.subtext;
 }
 for(const [key,value] of Object.entries(pPatch)){
  if(['header','body','subtitle','caption'].includes(key)){if(typeof value!=='string'||value.length>12000)throw Error('Text fields must be at most 12000 characters.');}
  else if(['headerSize','bodySize','subtitleSize','captionSize'].includes(key)){if(!VIDEO_TEXT_STYLES.includes(value as VideoTextStyle))throw Error('Choose a standard text style.');}
  else if(key==='mediaSide'){if(!['stacked','left','right'].includes(String(value)))throw Error('Choose a supported Video and Text layout.');}
  else if(key==='placement'){if(!['above','between','below'].includes(String(value)))throw Error('Choose a supported content position.');}
  else throw Error('Unsupported Video presentation field.');p[key]=value;
 }
 if(Object.keys(aPatch).length){
  const a={...record(p.appearance??s.blockAppearance)};
  const ranges:Record<string,[number,number]>={fontSize:[1,256],lineHeight:[1,3],letterSpacing:[-2,20],width:[20,100],padding:[0,120],columnGap:[0,120]};
  for(const [key,value] of Object.entries(aPatch)){
   if(![...Object.keys(ranges),'alignment','color','family','background','border','columns'].includes(key))throw Error('Unsupported Video appearance override.');
   if(value===null){delete a[key];if(s.blockAppearance&&typeof s.blockAppearance==='object'){const legacy={...record(s.blockAppearance)};delete legacy[key];s.blockAppearance=legacy;}continue;}
   if(key in ranges){const [min,max]=ranges[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Invalid typography or spacing override.');}
   else if(key==='family'&&!['sans','editorial','mono'].includes(String(value)))throw Error('Invalid font family.');
   else if(key==='alignment'&&!['left','center','right'].includes(String(value)))throw Error('Invalid text alignment.');
   else if(['color','background'].includes(key)&&(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value)))throw Error('Use a six-digit hex color.');
   else if(key==='border'&&typeof value!=='boolean')throw Error('Invalid border override.');
   else if(key==='columns'&&(typeof value!=='number'||![1,2,3].includes(value)))throw Error('Choose one, two or three text columns.');
   a[key]=value;
  }p.appearance=a;
 }
 if(Object.keys(pPatch).length||Object.keys(aPatch).length)s.textPresentation=p;
 const nextRequirement=patch.requirement??requirement,nextVisibility=patch.visibility??visibility;
 if(!['required','recommended','optional'].includes(String(nextRequirement))||!['visible','hidden'].includes(String(nextVisibility)))throw Error('Invalid Video availability settings.');
 return {content:c,settings:s,requirement:String(nextRequirement),visibility:String(nextVisibility),changed:JSON.stringify(c)!==JSON.stringify(content)||JSON.stringify(s)!==JSON.stringify(settings)||nextRequirement!==requirement||nextVisibility!==visibility};
}

// Only explicitly adopted Video text uses the new presentation ownership. Legacy courses remain unchanged.
export function videoMediaConfiguration(content:Record<string,unknown>,settings:unknown){const s=record(settings),p=record(s.textPresentation);if(s.videoTextEditor!==1)return content;return {...content,title:"",description:"",caption:content.caption===p.caption?"":content.caption,suppressAssetText:true};}
