"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {readBlockAppearance,readBlockPresentation} from "@/lib/experiences/builder/block-presentation";
import {BlockPresentation} from '@/components/experiences/builder/BlockPresentation';
export function LivePresentationPreview({blockId,settings,children}:{blockId:string;settings:unknown;children:ReactNode}){
 const [draft,setDraft]=useState<{source:unknown;value:unknown}|null>(null);
 useEffect(()=>{function preview(event:Event){const detail=(event as CustomEvent).detail;if(detail?.blockId===blockId)setDraft({source:settings,value:detail.settings});}window.addEventListener('purposeos:builder-presentation-preview',preview);return()=>window.removeEventListener('purposeos:builder-presentation-preview',preview);},[blockId,settings]);
 return <BlockPresentation settings={draft&&draft.source===settings?draft.value:settings}>{children}</BlockPresentation>;
}

export function LiveAppearanceFrame({blockId,settings,children}:{blockId:string;settings:unknown;children:ReactNode}){
 const [draft,setDraft]=useState<{source:unknown;value:unknown}|null>(null);
 useEffect(()=>{function preview(event:Event){const detail=(event as CustomEvent).detail;if(detail?.blockId===blockId)setDraft({source:settings,value:detail.settings});}window.addEventListener('purposeos:builder-presentation-preview',preview);return()=>window.removeEventListener('purposeos:builder-presentation-preview',preview);},[blockId,settings]);
 const current=draft&&draft.source===settings?draft.value:settings;const a=readBlockPresentation(current)?.appearance??readBlockAppearance(current);
 return <div className="modern-inline-appearance" data-text-columns={a?.columns} data-box-font-size={a?.fontSize!==undefined||undefined} data-box-line-height={a?.lineHeight!==undefined||undefined} data-box-letter-spacing={a?.letterSpacing!==undefined||undefined} data-box-color={Boolean(a?.color)||undefined} data-box-family={Boolean(a?.family)||undefined} data-media-fit={a?.fit} style={a?{...{"--block-text-gap":a.columnGap===undefined?undefined:`${a.columnGap}px`},fontSize:a.fontSize===undefined?undefined:`${a.fontSize}px`,lineHeight:a.lineHeight,letterSpacing:a.letterSpacing===undefined?undefined:`${a.letterSpacing}px`,color:a.color,fontFamily:a.family==='editorial'?'var(--font-editorial),serif':a.family==='sans'?'var(--font-sans),sans-serif':a.family==='mono'?'monospace':undefined,textAlign:a.alignment,padding:a.padding===undefined?undefined:`${a.padding}px`,width:a.width===undefined?undefined:`${a.width}%`,background:a.background,border:a.border?'1px solid var(--builder-line,#d3d8d3)':undefined}:undefined}>{children}</div>;
}
