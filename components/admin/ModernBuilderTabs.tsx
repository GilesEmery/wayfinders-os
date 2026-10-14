"use client";
import {useState,type ReactNode} from 'react';
export function ModernBuilderTabs({customization,children,settings}:{customization:ReactNode;children:ReactNode;settings:ReactNode}){
 const [tab,setTab]=useState<'builder'|'customization'|'settings'>('builder');
 return <><nav className="modern-builder-tabs" aria-label="Creator workspace">{(['builder','customization','settings'] as const).map(value=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>{window.dispatchEvent(new CustomEvent("purposeos:builder-editor-open",{detail:null}));setTab(value);}}>{value==='builder'?'Course Builder':value==='customization'?'Course Customization':'Course Settings'}</button>)}</nav><div hidden={tab!=='customization'}>{customization}</div><div hidden={tab!=='settings'} className="modern-builder-settings"><header className="course-customization-heading"><div><span>Configuration</span><h2>Course Settings</h2><p>Manage your course layout, appearance and cover. Save each section when you’re ready.</p></div></header>{settings}</div><div hidden={tab!=='builder'}>{children}</div></>;
}
