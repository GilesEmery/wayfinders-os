"use client";
import { useState, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { fieldDocument } from "@/lib/experiences/builder/prototype/model";
import styles from "./Prototype.module.css";
import { SidePanel } from "./SidePanel";
import { ExtraControls, type DemoExtras } from "./AdvancedOptions";
import { DemoRichEditor, DemoRichText } from "./RichText";
export function TextField({label,text,document,style="body",onChange,extras,onExtras,rules,leadingContent}:{label:string;text:string;document?:JSONContent;style?:string;onChange:(document:JSONContent)=>void;extras?:DemoExtras;onExtras?:(value:DemoExtras)=>void;rules?:ReactNode;leadingContent?:ReactNode}) {
 const [advanced,setAdvanced]=useState(false);
 return <><article className={styles.contentCard} data-demo-text-card={label}><header className={styles.contentHeader}><span className={styles.contentType}>{label}</span><div><button type="button" className={styles.editButton} aria-label={`Edit ${label}`} aria-expanded={advanced} onClick={()=>setAdvanced(true)}>Edit</button></div></header><div className={styles.contentBody}>{leadingContent??<DemoRichText document={document??fieldDocument(text,style)}/>}</div></article>{advanced&&<SidePanel title={`Edit · ${label}`} onClose={()=>setAdvanced(false)}><h3>Heading / text</h3><DemoRichEditor document={document??fieldDocument(text,style)} onChange={onChange}/>{onExtras&&<ExtraControls value={extras??{}} onChange={onExtras}/>} {rules}</SidePanel>}</>;
}
export function FieldPreview({text,document,style="body"}:{text:string;document?:JSONContent;style?:string}) {return <DemoRichText document={document??fieldDocument(text,style)}/>;}
