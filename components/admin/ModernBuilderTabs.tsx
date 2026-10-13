"use client";
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
export function ModernBuilderTabs({customization,children,legacyHref,settings}:{customization:ReactNode;children:ReactNode;legacyHref:string;settings:ReactNode}){
 const [tab,setTab]=useState<'builder'|'customization'|'settings'>('builder');
 return <><nav className="modern-builder-tabs" aria-label="Creator workspace">{(['builder','customization','settings'] as const).map(value=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>{window.dispatchEvent(new CustomEvent("purposeos:builder-editor-open",{detail:null}));setTab(value);}}>{value==='builder'?'Course Builder':value==='customization'?'Course Customization':'Course Settings'}</button>)}</nav><div hidden={tab!=='customization'}>{customization}</div><div hidden={tab!=='settings'} className="modern-builder-settings"><h2>Course Settings</h2>{settings}<p>Publishing, cover images, access and version history retain their existing controls in the top bar and course overview.</p><Link href={legacyHref}>Use the previous builder interface</Link><p>Switching interfaces preserves your course, identifiers and saved work.</p></div><div hidden={tab!=='builder'}>{children}</div></>;
}
