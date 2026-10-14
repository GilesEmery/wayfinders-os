"use client";
import {ChoiceOptionRows} from "./ChoiceOptionRows";
import {useId,useState} from 'react';
import type {ResponseOption} from '@/lib/experiences/builder/response-registry';
export function SingleSelectChoices({options,initial='',display='cards',columns=2,required=false,legend}:{options:readonly ResponseOption[];initial?:string;display?:string;columns?:number;required?:boolean;legend:string}){
 const id=useId();
 const [selected,setSelected]=useState(initial);
 const chosen=options.find(option=>option.key===selected);
 return <fieldset className={`single-select-choices is-${display} is-columns-${columns}`}><legend className="sr-only">{legend}</legend>
 {display==='dropdown'?<><label className="sr-only" htmlFor={id}>Select one answer</label><select id={id} name="response" value={selected} onChange={e=>setSelected(e.target.value)} required={required}><option value="">Select one answer…</option>{options.map(option=><option value={option.key} key={option.key}>{option.label}</option>)}</select>{chosen?.description&&<p className="single-select-help">{chosen.description}</p>}</>:<ChoiceOptionRows options={options} selected={selected?[selected]:[]} type="radio" onToggle={setSelected} required={required}/>}
 <div className="single-select-summary"><span>{chosen?`Your selected answer: ${chosen.label}`:'Select one answer.'}</span><button type="button" disabled={!selected} onClick={e=>{setSelected('');e.currentTarget.dispatchEvent(new Event('input',{bubbles:true}));}}>Clear selection</button></div>
 </fieldset>;
}
