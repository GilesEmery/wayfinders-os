"use client";
import { useState, type ReactNode, type CSSProperties } from "react";
import type { BuilderContentBlock, BuilderLesson } from "@/lib/experiences/builder/types";
import type { Json } from "@/lib/supabase/database.types";
import type { JSONContent } from "@tiptap/core";
import { reviewTextDocument } from "@/lib/experiences/builder/prototype/review-text";
import { ReviewBlock } from "./ReviewBlock";
import { useCourseReview } from "./ReviewContext";
import { AdvancedContent, type DemoExtras } from "./AdvancedOptions";
import { TextField, FieldPreview } from "./TextField";
import { documentText, blockDocument } from "@/lib/experiences/builder/prototype/model";
import { safeRichTextLink } from "@/lib/experiences/builder/course-links";
import { DemoRichEditor, DemoRichText } from "./RichText";
import styles from "./Prototype.module.css";
import typography from "./Typography.module.css";

function savedField(block:BuilderContentBlock,field:string):JSONContent|undefined {return (block.configuration.demoTextFields as Record<string,Json>|undefined)?.[field] as JSONContent|undefined;}
function ConfigText({block,field,style="body"}:{block:BuilderContentBlock;field:string;style?:string}) {return <FieldPreview text={String(block.configuration[field]??"")} document={savedField(block,field)} style={style}/>;}
export function DemoDownload({block}:{block:BuilderContentBlock}) {
 return <button type="button" className={`${styles.download} ${typography.root}`} data-pos-typography-root onClick={()=>{const url=URL.createObjectURL(new Blob([String(block.configuration.demoDownload??"DEMO RESOURCE — fictional sample")],{type:"text/plain"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=String(block.configuration.filename??"demo-resource.txt");anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>↓ <ConfigText block={block} field="title" style="h4"/><small data-course-style="small">{String(block.configuration.linkLabel??"Sample text download · local demo")}</small></button>;
}
function DemoMap({block}:{block:BuilderContentBlock}){const [selected,setSelected]=useState("Listen");return <div className={`${styles.map} ${typography.root}`} data-pos-typography-root><ConfigText block={block} field="title" style="h4"/><p>Try this custom interaction.</p><div>{["Listen","Welcome","Act"].map(value=><button type="button" key={value} aria-pressed={selected===value} onClick={()=>setSelected(value)}>{value}</button>)}</div><p>{selected==="Listen"?"Begin by learning a neighbor’s story.":selected==="Welcome"?"Create room for someone new.":"Choose one small, meaningful action."}</p><small data-course-style="small">Fictional, source-controlled renderer example.</small></div>;}
function CorePreview({block}:{block:BuilderContentBlock}) {
 const review=useCourseReview();
 const doc=blockDocument(block),config=block.configuration;
 if(review&&!doc)return <ReviewBlock block={block}/>;
 if(doc)return <div className={block.block_type==="callout"?styles.callout:undefined}><DemoRichText document={doc}/></div>;
 if(block.block_type==="heading"){const Tag=["h1","h2","h3","h4","h5","h6"].includes(String(config.level))?config.level as "h1"|"h2"|"h3"|"h4"|"h5"|"h6":"h2";return <div className={typography.root}><Tag>{String(config.title)}</Tag></div>;}
 if(block.block_type==="video")return <div className={`${styles.video} ${typography.root}`} data-pos-typography-root style={{"--demo-text":"#eaf0e6"} as CSSProperties}><span aria-hidden="true">▷</span><ConfigText block={block} field="title" style="h4"/><small data-course-style="small">{String(config.demoDuration??"Video")} · video placeholder</small><p data-course-style="small">No external video is loaded in this demo.</p>{config.transcript&&<details><summary>Transcript</summary><p>{String(config.transcript)}</p></details>}</div>;
 if(block.block_type==="image")return <figure className={`${styles.image} ${typography.root}`} data-pos-typography-root><svg preserveAspectRatio={(config.demoAdvanced as DemoExtras)?.fit==="cover"?"xMidYMid slice":"xMidYMid meet"} style={{height:220,width:"100%"}} viewBox="0 0 720 260" role="img" aria-label={String(config.alt)}><rect width="720" height="260" fill="#e8ede3"/><circle cx="300" cy="130" r="85" fill="#446956"/><circle cx="420" cy="130" r="85" fill="#c8d5ab" opacity=".9"/><circle cx="360" cy="90" r="60" fill="#86a1a0" opacity=".7"/><path d="M160 210H560" stroke="#315044" strokeWidth="2"/></svg><figcaption><ConfigText block={block} field="title" style="small"/></figcaption></figure>;
 if(block.block_type==="document"||block.block_type==="download")return <DemoDownload block={block}/>;
 if(["checklist","check_in","card_selection","structured_response"].includes(block.block_type))return <DemoOptions block={block}/>;
 if(block.block_type==="external_link")return <div className={typography.root}><ConfigText block={block} field="title" style="h4"/>{safeRichTextLink(String(config.url??""))?<a href={safeRichTextLink(String(config.url))!} target="_blank" rel="noopener noreferrer">{String(config.linkLabel??"Open resource")}</a>:<p>Set a safe source URL in Advanced.</p>}</div>;
 if(block.block_type==="pdf_reader")return <div className={styles.advancedPlaceholder}><ConfigText block={block} field="title" style="h4"/><p>PDF reader · fictional resource placeholder</p><button type="button" disabled>{String(config.linkLabel??"Open PDF")}</button></div>;
 if(block.block_type==="reflection")return <DemoReflection block={block}/>;
 if(block.block_type==="custom_component"&&block.custom_renderer_key==="demo.community-map.v1")return <DemoMap block={block}/>;
 if(block.block_type==="prebuilt_assessment")return <div className={`${styles.callout} ${typography.root}`} data-pos-typography-root><ConfigText block={block} field="title" style="h4"/><p>Canonical assessment attachment preserved. Production launch is disabled in this fictional demo.</p><button type="button" disabled>{String(config.linkLabel??"Open assessment")}</button></div>;
 return <div className={`${styles.advancedPlaceholder} ${typography.root}`} data-pos-typography-root><ConfigText block={block} field="title" style="h4"/><p>{block.block_type} · {block.custom_renderer_key??"custom configuration"}</p><small>Use Advanced Editor to inspect the original data. Arbitrary code is not executed here.</small></div>;
}
function PresentationFrame({block,children}:{block:BuilderContentBlock;children:ReactNode}) {
 const extras=(block.configuration.demoAdvanced??{}) as DemoExtras;
 const style:CSSProperties={textAlign:['left','center','right'].includes(extras.alignment??'')?extras.alignment as CSSProperties['textAlign']:undefined,padding:extras.padding,width:extras.width?`${extras.width}%`:undefined,background:/^#[0-9a-f]{6}$/i.test(extras.background??'')?extras.background:undefined,border:extras.border?'1px solid #bbc7b2':undefined,marginInline:'auto'};
 return <div data-demo-content-presentation style={style}>{extras.subtitle&&<DemoRichText document={extras.subtitle}/>}{savedField(block,"title")&&blockDocument(block)&&<ConfigText block={block} field="title" style="h4"/>}{children}{extras.supportingText&&<DemoRichText document={extras.supportingText}/>} {extras.caption&&<DemoRichText document={extras.caption}/>}</div>;
}
export function BlockPreview({block}:{block:BuilderContentBlock}) {return <PresentationFrame block={block}><CorePreview block={block}/></PresentationFrame>;}
function DemoOptions({block}:{block:BuilderContentBlock}) {
 const [selected,setSelected]=useState<string[]>([]),[answer,setAnswer]=useState('');
 const options=Array.isArray(block.configuration.options)?block.configuration.options as {label?:string;value?:string}[]:[{label:'Listen to a neighbor',value:'listen'},{label:'Host a gathering',value:'host'}];
 return <div className={typography.root}><ConfigText block={block} field="title" style="h4"/><ConfigText block={block} field="prompt"/><ConfigText block={block} field="instructions"/>{['checklist','card_selection','check_in'].includes(block.block_type)?options.map((option,index)=>{const value=String(option.value??index);return <label key={value} style={{display:'block',padding:8}}><input type="checkbox" checked={selected.includes(value)} onChange={event=>setSelected(event.target.checked?[...selected,value]:selected.filter(v=>v!==value))}/> {String(option.label??value)}</label>}):<textarea aria-label="Demo structured response" value={answer} onChange={event=>setAnswer(event.target.value)} placeholder={String(block.configuration.placeholder??'Try a fictional response…')}/>}<small>Demo interaction only · responses stay in memory.</small></div>;
}
function DemoReflection({block}:{block:BuilderContentBlock}) {const [value,setValue]=useState("");return <div className={`${styles.reflection} ${typography.root}`} data-pos-typography-root><p className={styles.eyebrow}>Reflection · demo only</p><ConfigText block={block} field="prompt" style="h4"/><label><span className="sr-only">Demo response</span><textarea value={value} onChange={event=>setValue(event.target.value)} placeholder="Try a fictional response…" rows={4}/></label><small>Preview response stays in memory. Nothing is submitted.</small></div>;}
export const AdvancedBlock=AdvancedContent;
export function ContentEditor({block,active,onChange}:{block:BuilderContentBlock;active:boolean;onChange:(block:BuilderContentBlock)=>void}) {
 const review=useCourseReview();
 const doc=blockDocument(block)??(review?reviewTextDocument(block):null);
 function set(field:string,value:Json){const config={...block.configuration,[field]:value};onChange({...block,configuration:config});}
 if(!active)return <BlockPreview block={block}/>;
 if(doc)return <PresentationFrame block={block}><div className={block.block_type==="callout"?styles.callout:undefined}><DemoRichEditor document={doc} onChange={document=>set("demoDocument",document as Json)}/></div></PresentationFrame>;
 const fields=Object.entries(block.configuration).filter(([key,value])=>typeof value==="string"&&!/url|uri|source|html|css|renderer|filename|response_type|level|duration|id|key/i.test(key));
 return <><div className={styles.inlineFields}>{fields.map(([field,value])=>field==="alt"?<label key={field}>Image description<input value={String(value)} onChange={event=>set(field,event.target.value)}/></label>:<TextField key={field} label={field} text={String(value)} style={field==="title"||field==="prompt"?"h4":"body"} document={savedField(block,field)} onChange={document=>onChange({...block,configuration:{...block.configuration,[field]:documentText(document),demoTextFields:{...((block.configuration.demoTextFields as Record<string,Json>)??{}),[field]:document as Json}}})}/>)}{block.block_type==="reflection"&&<label><input type="checkbox" checked={Boolean(block.configuration.is_required)} onChange={event=>set("is_required",event.target.checked)}/>Required</label>}{block.block_type==="reflection"&&<label>Response type<select value={String(block.configuration.response_type??"long_text")} onChange={event=>set("response_type",event.target.value)}><option value="long_text">Long answer</option><option value="short_text">Short answer</option></select></label>}</div><BlockPreview block={block}/></>;
}
export function LessonPreview({lesson}:{lesson:BuilderLesson}) {return <>{lesson.sections.map(section=><div key={section.id} className={styles.lessonColumns} style={{gridTemplateColumns:section.layout?.layout_mode==="single_column"?"1fr":section.layout?.columns.map(column=>`${column.width_percent}fr`).join(" ")}}>{(section.metadata as Record<string,Json>)?.demoTitleDocument&&<div style={{gridColumn:"1 / -1"}}><FieldPreview text={section.title??""} style="h2" document={(section.metadata as Record<string,Json>).demoTitleDocument as JSONContent}/></div>}{section.layout?.columns.map(column=><div key={column.id}>{column.blocks.filter(block=>block.visibility!=="hidden").map(block=><div className={styles.previewBlock} key={block.id}><BlockPreview block={block}/></div>)}</div>)}</div>)}</>;}
