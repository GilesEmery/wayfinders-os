"use client";
import { CourseTextSize } from "@/lib/experiences/builder/course-text-size";
import { CourseIndent } from "@/lib/experiences/builder/course-indent";
import { Extension, Mark, type JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState, type ReactNode } from "react";
import { safeRichTextLink } from "@/lib/experiences/builder/course-links";
import { FONT_FAMILIES, TEXT_STYLES, textStyle, type TextStyle } from "@/lib/experiences/builder/prototype/typography";
import { SidePanel } from "./SidePanel";
import typography from "./Typography.module.css";
import styles from "./Prototype.module.css";

const StyleTokens=Extension.create({name:"demoStyleTokens",addGlobalAttributes(){return [{types:["heading","paragraph"],attributes:{courseStyle:{default:null,parseHTML:element=>textStyle(element.getAttribute("data-course-style")),renderHTML:attrs=>textStyle(attrs.courseStyle)?{"data-course-style":attrs.courseStyle}:{}}}}];}});
const FontOverride=Mark.create({name:"demoFontOverride",addAttributes:()=>({size:{default:null},family:{default:null},color:{default:null}}),parseHTML:()=>[{tag:"span[data-demo-font]"}],renderHTML:({HTMLAttributes})=>["span",{"data-demo-font":"true",style:[HTMLAttributes.size?`font-size:${Number(HTMLAttributes.size)}px`:"",HTMLAttributes.family&&Object.values(FONT_FAMILIES).includes(HTMLAttributes.family)?`font-family:${HTMLAttributes.family}`:"",/^#[0-9a-f]{6}$/i.test(HTMLAttributes.color??"")?`color:${HTMLAttributes.color}`:""].filter(Boolean).join(";")},0]});

export function DemoRichEditor({document,onChange}:{document:JSONContent;onChange:(document:JSONContent)=>void}) {
 const [advanced,setAdvanced]=useState(false),[link,setLink]=useState(""),[linkOpen,setLinkOpen]=useState(false),[linkError,setLinkError]=useState("");
 const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[1,2,3,4,5,6]},link:{openOnClick:false}}),CourseTextSize,CourseIndent,StyleTokens,FontOverride],content:document,immediatelyRender:false,shouldRerenderOnTransaction:true,onUpdate:({editor})=>onChange(editor.getJSON())});
 useEffect(()=>{if(editor&&JSON.stringify(editor.getJSON())!==JSON.stringify(document))editor.commands.setContent(document,{emitUpdate:false});},[document,editor]);
 if(!editor)return <p role="status">Opening text editor…</p>;
 const level=editor.getAttributes("heading").level;
 const token=(editor.getAttributes(editor.isActive("heading")?"heading":"paragraph").courseStyle??(level?`h${level}`:"body")) as TextStyle;
 function applyStyle(value:TextStyle,semantic=editor!.isActive("heading")) {
  if(value.startsWith("h")&&semantic)editor!.chain().focus().setHeading({level:Number(value[1]) as 1|2|3|4|5|6}).updateAttributes("heading",{courseStyle:value}).run();
  else editor!.chain().focus().setParagraph().updateAttributes("paragraph",{courseStyle:value}).run();
 }
 const button=(label:string,active:boolean,action:()=>void,text:string)=><button type="button" title={label} aria-label={label} aria-pressed={active} onMouseDown={event=>event.preventDefault()} onClick={action}>{text}</button>;
 return <div>
  <div className={styles.formatToolbar} aria-label="Text formatting">
   <label>Text style<select aria-label="Text style" value={token} onChange={event=>applyStyle(event.target.value as TextStyle,token.startsWith("h")?editor.isActive("heading"):true)}>{TEXT_STYLES.map(value=><option key={value} value={value}>{value.startsWith("h")?value.toUpperCase():value==="body"?"Body":"Small"}</option>)}</select></label>
   {button("Bold",editor.isActive("bold"),()=>{editor.chain().focus().toggleBold().run();},"B")}
   {button("Italic",editor.isActive("italic"),()=>{editor.chain().focus().toggleItalic().run();},"I")}
   {button("Underline",editor.isActive("underline"),()=>{editor.chain().focus().toggleUnderline().run();},"U")}
   {button("Bullet list",editor.isActive("bulletList"),()=>{editor.chain().focus().toggleBulletList().run();},"• List")}
   {button("Numbered list",editor.isActive("orderedList"),()=>{editor.chain().focus().toggleOrderedList().run();},"1. List")}
   {button("Add or edit link",linkOpen,()=>{setLinkOpen(!linkOpen);setLink(editor.getAttributes("link").href??"");setLinkError("");},"Link")}
   {button("Advanced font controls",advanced,()=>setAdvanced(!advanced),"Font…")}
  </div>
  {token.startsWith("h")&&<label className={styles.semanticControl}><input type="checkbox" checked={editor.isActive("heading")} onChange={event=>applyStyle(token,event.target.checked)}/>Use as a semantic heading <span>Uncheck to keep this visual size as ordinary text.</span></label>}
  {linkOpen&&<div className={styles.inlineFields}><label>Link URL<input value={link} onChange={event=>setLink(event.target.value)} placeholder="https://example.org"/></label><button type="button" onClick={()=>{const href=safeRichTextLink(link);if(!href){setLinkError("Enter a safe https URL or course link.");return;}editor.chain().focus().extendMarkRange("link").setLink({href}).run();setLinkOpen(false);}}>Apply link</button><button type="button" onClick={()=>{editor.chain().focus().unsetLink().run();setLinkOpen(false);}}>Remove link</button>{linkError&&<p role="alert">{linkError}</p>}</div>}
  {advanced&&<SidePanel title="Typography" onClose={()=>setAdvanced(false)}><div className={styles.inlineFields}><label>Selected text size (px)<input type="number" min="1" max="256" placeholder="Course style" defaultValue={editor.getAttributes("demoFontOverride").size??""} onChange={event=>{const size=Number(event.target.value);if(size>=1&&size<=256)editor.chain().setMark("demoFontOverride",{size}).run();}}/></label><label>Font family<select value={editor.getAttributes("demoFontOverride").family??""} onChange={event=>editor.chain().focus().setMark("demoFontOverride",{family:event.target.value||null}).run()}><option value="">Course style</option>{Object.entries(FONT_FAMILIES).map(([key,value])=><option key={key} value={value}>{key}</option>)}</select></label><label>Text color<input type="color" value={editor.getAttributes("demoFontOverride").color??"#252a29"} onChange={event=>editor.chain().focus().setMark("demoFontOverride",{color:event.target.value}).run()}/></label><button type="button" onClick={()=>editor.chain().focus().unsetMark("demoFontOverride").run()}>Reset to course style</button><small>Explicit selections keep their font overrides when course defaults change.</small></div></SidePanel>}
  <EditorContent editor={editor} className={typography.root} data-pos-typography-root/>
 </div>;
}
function nodeContent(node:JSONContent,key:string):ReactNode {
 if(node.type==="text")return (node.marks??[]).reduce<ReactNode>((content,mark,index)=>{
  const id=`${key}-${index}`;if(mark.type==="courseTextSize"&&["h1","h2","h3","h4"].includes(mark.attrs?.size))return <span key={id} data-course-style={mark.attrs?.size}>{content}</span>;if(mark.type==="bold")return <strong key={id}>{content}</strong>;if(mark.type==="italic")return <em key={id}>{content}</em>;if(mark.type==="underline")return <u key={id}>{content}</u>;if(mark.type==="strike")return <s key={id}>{content}</s>;
  if(mark.type==="link"){const href=safeRichTextLink(String(mark.attrs?.href??""));return href?<a key={id} href={href} target="_blank" rel="noopener noreferrer">{content}</a>:content;}
  if(mark.type==="demoFontOverride")return <span key={id} data-demo-font style={{fontSize:mark.attrs?.size?`${Number(mark.attrs.size)}px`:undefined,fontFamily:Object.values(FONT_FAMILIES).includes(mark.attrs?.family)?mark.attrs?.family:undefined,color:/^#[0-9a-f]{6}$/i.test(mark.attrs?.color??"")?mark.attrs?.color:undefined}}>{content}</span>;
  return content;
 },node.text??"");
 if(node.type==="hardBreak")return <br key={key}/>;
 const children=node.content?.map((child,index)=>nodeContent(child,`${key}-${index}`));
 const style=textStyle(node.attrs?.courseStyle);const attrs={"data-course-style":style??undefined};
 if(node.type==="courseIndent")return <div key={key} style={{paddingLeft:24}}>{children}</div>;
 if(node.type==="doc")return <div key={key}>{children}</div>;
 if(node.type==="heading"){const Tag=`h${Math.min(6,Math.max(1,Number(node.attrs?.level)||1))}` as "h1"|"h2"|"h3"|"h4"|"h5"|"h6";return <Tag key={key} {...attrs}>{children}</Tag>;}
 if(node.type==="paragraph")return <p key={key} {...attrs}>{children||<br/>}</p>;
 if(node.type==="bulletList")return <ul key={key}>{children}</ul>;if(node.type==="orderedList")return <ol key={key} start={Number(node.attrs?.start)||1}>{children}</ol>;if(node.type==="listItem")return <li key={key}>{children}</li>;if(node.type==="blockquote")return <blockquote key={key}>{children}</blockquote>;
 if(node.type==="horizontalRule")return <hr key={key}/>;
 return <div key={key}><span className={styles.advancedBadge}>Preserved advanced text node: {node.type}</span>{children}</div>;
}
export function DemoRichText({document}:{document:JSONContent}) { return <div className={typography.root} data-pos-typography-root>{nodeContent(document,"doc")}</div>; }
