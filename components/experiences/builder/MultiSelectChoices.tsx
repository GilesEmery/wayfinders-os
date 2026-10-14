"use client";
import {useId,useState} from 'react';
import type {ResponseOption} from '@/lib/experiences/builder/response-registry';
import {multiSelectLimits,multiSelectInstructions} from '@/lib/experiences/builder/multi-select';
import {ChoiceOptionRows} from './ChoiceOptionRows';
export function MultiSelectChoices({options,initial=[],display='list',columns=2,required=false,configuration,legend}:{options:readonly ResponseOption[];initial?:readonly string[];display?:string;columns?:number;required?:boolean;configuration:Record<string,unknown>;legend:string}){
 const id=useId(),[values,setValues]=useState<readonly string[]>(initial);
 // Keep saved keys in state; reconcile display only against the current ordered options.
 const selected=options.filter(o=>values.includes(o.key)).map(o=>o.key);
 const {minimum,maximum,errors}=multiSelectLimits(configuration,options.length,required),reached=maximum!==null&&selected.length>=maximum;
 function toggle(key:string){setValues(current=>current.includes(key)?current.filter(v=>v!==key):maximum!==null&&current.filter(v=>options.some(o=>o.key===v)).length>=maximum?current:[...current,key]);}
 return <fieldset className={`single-select-choices multi-select-choices is-${display==='cards'?'cards':'list'} is-columns-${columns===1?1:2}`} aria-describedby={`${id}-instructions ${id}-status`}><legend className="sr-only">{legend}</legend><p id={`${id}-instructions`} className="single-select-help">{errors.length?'Selection limits need updating.':multiSelectInstructions(minimum,maximum)}{!required&&minimum>0&&!errors.length&&<> You may leave this question unanswered.</>}</p><ChoiceOptionRows options={options} selected={selected} type="checkbox" onToggle={toggle} maximum={errors.length?null:maximum} describedBy={`${id}-instructions ${id}-status`}/><div className="single-select-summary"><span id={`${id}-status`} role="status" aria-live="polite" aria-atomic="true">{maximum===null?`${selected.length} selected`:`${selected.length} of ${maximum} selected`}{reached&&<>. Selection limit reached. Deselect an option to choose another.</>}</span><button type="button" disabled={!selected.length} onClick={e=>{setValues([]);e.currentTarget.dispatchEvent(new Event('input',{bubbles:true}));}}>Clear selections</button></div></fieldset>;
}
