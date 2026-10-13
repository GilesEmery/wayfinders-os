"use client";
import {useEffect,useId,useState,type ReactNode} from 'react';
import {SidePanel} from '@/components/course-builder-prototype/SidePanel';
export function CompanionEditorCard({title,description,hidden,children}:{title:string;description:string;hidden:boolean;children:ReactNode}){
 const id=useId(),[open,setOpen]=useState(false),[mounted,setMounted]=useState(false);
 useEffect(()=>{function opened(event:Event){if((event as CustomEvent).detail!==id)setOpen(false);}window.addEventListener('purposeos:builder-editor-open',opened);return()=>window.removeEventListener('purposeos:builder-editor-open',opened);},[id]);
 return <article className={`companion-builder-card${hidden?' is-hidden':''}`}><button type="button" className="companion-editor-trigger" aria-label={`Edit Companion · ${title}`} aria-expanded={open} onClick={()=>{window.dispatchEvent(new CustomEvent('purposeos:builder-editor-open',{detail:id}));setMounted(true);setOpen(true);}}><small>{description}</small><strong>{title}</strong></button>{mounted&&<SidePanel visible={open} title={`Companion · ${title}`} onClose={()=>setOpen(false)}><div className="modern-builder-controls">{children}</div></SidePanel>}</article>;
}
