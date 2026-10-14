"use client";
import {BuilderSaveButton} from "./BuilderSaveButton";

import {useEffect,useState} from 'react';
import {LiveAppearanceFrame} from "./LivePresentationPreview";
import {ExternalResourceCard} from '@/components/experiences/builder/ExternalResourceCard';
export function ExternalLinkCardEditor({blockId,config,settings,requirement,visibility,action}:{blockId:string;config:Record<string,unknown>;settings:unknown;requirement:string;visibility:string;action:(data:FormData)=>Promise<void>}){
 const [label,setLabel]=useState(String(config.linkLabel||'Open'));
 useEffect(()=>{function change(event:Event){const detail=(event as CustomEvent).detail;if(detail?.blockId===blockId)setLabel(detail.label);}window.addEventListener('purposeos:external-link-label',change);return()=>window.removeEventListener('purposeos:external-link-label',change);},[blockId]);
 const [title,setTitle]=useState(String(config.title??'')),[url,setUrl]=useState(String(config.url??'')),[subtext,setSubtext]=useState(String(config.description??''));
 async function save(data:FormData){for(const name of ['requirement_level','visibility']){const control=document.querySelector<HTMLSelectElement>(`select[data-external-link-owner="${blockId}"][name="${name}"]`);if(control)data.set(name,control.value);}await action(data);}
 return <div className="external-link-canvas-editor"><form id={`block-presentation-${blockId}`} data-presentation-block-id={blockId} action={save}><label>Title (resource)<input name="title" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label><label>Link<input name="url" value={url} onChange={e=>setUrl(e.target.value)} type="url" pattern="https://.*" placeholder="https://" required maxLength={2048}/></label><label>Subtext<textarea name="description" value={subtext} onChange={e=>setSubtext(e.target.value)} rows={3} maxLength={3000}/></label><input type="hidden" name="caption" value={String(config.caption??'')}/><input type="hidden" name="alt" value={String(config.alt??'')}/><input type="hidden" name="link_label" value={label}/><input type="hidden" name="requirement_level" value={requirement}/><input type="hidden" name="visibility" value={visibility}/><BuilderSaveButton/></form><div className="external-link-live-preview"><h3 className="builder-preview-label">Preview</h3><LiveAppearanceFrame blockId={blockId} settings={settings}><ExternalResourceCard title={title} url={url} subtext={subtext} label={label}/></LiveAppearanceFrame></div></div>;
}

export function ExternalLinkButtonLabel({blockId,initial}:{blockId:string;initial:string}){return <label>Button label<input data-external-label-owner={blockId} defaultValue={initial||'Open'} maxLength={120} onChange={e=>window.dispatchEvent(new CustomEvent('purposeos:external-link-label',{detail:{blockId,label:e.target.value}}))}/></label>;}
