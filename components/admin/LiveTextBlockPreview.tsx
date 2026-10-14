"use client";
import {useEffect,useState,type ReactNode} from 'react';
import type {InlineDraft} from '@/lib/experiences/admin/inline-draft';
import {ParticipantRichText} from '@/components/experiences/builder/ParticipantRichText';
export function LiveTextBlockPreview({blockId,revision,kind,children}:{blockId:string;revision:string;kind:'heading'|'rich_text';children:ReactNode}){
 const [live,setLive]=useState<{revision:string;draft:InlineDraft}|null>(null);
 useEffect(()=>{function changed(event:Event){const detail=(event as CustomEvent).detail;if(detail?.blockId===blockId&&detail.revision===revision&&typeof detail.draft?.text==='string')setLive({revision,draft:detail.draft});}window.addEventListener('purposeos:builder-text-preview',changed);return()=>window.removeEventListener('purposeos:builder-text-preview',changed);},[blockId,revision]);
 if(!live||live.revision!==revision)return children;
 return <div data-live-authoring-preview><h3 className="builder-preview-label">Preview</h3><ParticipantRichText title={kind==='heading'?live.draft.text:live.draft.title} titleLevel={live.draft.level} text={kind==='heading'?'':live.draft.text}/><small>Editing preview · see course save status</small></div>;
}
