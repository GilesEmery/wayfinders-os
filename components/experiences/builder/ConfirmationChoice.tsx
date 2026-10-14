"use client";
import {useId,useState,type CSSProperties} from 'react';
import {confirmationStatement,confirmationStyle,REQUIRED_CONFIRMATION_MESSAGE} from '@/lib/experiences/builder/confirmation';
import {ParticipantRichText} from './ParticipantRichText';

export function ConfirmationChoice({configuration,initial=false,required=false,legend}:{configuration:Record<string,unknown>;initial?:boolean;required?:boolean;legend:string}){
 const id=useId(),[checked,setChecked]=useState(initial),[invalid,setInvalid]=useState(false);
 const showError=invalid&&required&&!checked;
 const description=typeof configuration.statementDescription==='string'?configuration.statementDescription:'';
 const style=(size:string)=>({'--confirmation-size':`var(--course-${size}-size,${({h1:40,h2:28,h3:20,h4:16,h5:15,h6:13,body:16,small:13})[size as 'body']}px)`,fontFamily:`var(--course-${size}-family,var(--font-sans))`,lineHeight:`var(--course-${size}-lineHeight,1.5)`} as CSSProperties);
 return <fieldset className={`single-select-choices confirmation-choice is-${configuration.displayStyle==='cards'?'cards':'list'}`} aria-describedby={`${id}-help`}>
  <legend className="sr-only">{legend}</legend>
  <p id={`${id}-help`} className="single-select-help">{required?'Required confirmation':'Optional confirmation'}. {required?'Check the box to submit.':'You may submit without checking the box.'} Unchecked means not confirmed.</p>
  <div className="single-select-option-grid"><div className={`single-select-option${checked?' is-selected':''}`} onClick={event=>{
   if((event.target as Element).closest('a,button,input'))return;
   event.currentTarget.querySelector('input')?.click();
  }}>
   <input id={`${id}-checkbox`} type="checkbox" name="response" value="true" checked={checked} required={required} aria-labelledby={`${id}-statement`} aria-describedby={`${id}-help${description?` ${id}-description`:''}${showError?` ${id}-error`:''}`} aria-invalid={showError||undefined}
    ref={input=>{input?.setCustomValidity(required&&!checked?REQUIRED_CONFIRMATION_MESSAGE:'');}}
    onInvalid={()=>setInvalid(true)} onChange={event=>{setChecked(event.target.checked);setInvalid(false);event.target.setCustomValidity(required&&!event.target.checked?REQUIRED_CONFIRMATION_MESSAGE:'');}}/>
   <div className="confirmation-copy">
    <div id={`${id}-statement`} className="confirmation-statement" style={style(confirmationStyle(configuration.statementStyle,'body'))}><ParticipantRichText title="" text={confirmationStatement(configuration)}/></div>
    {description&&<div id={`${id}-description`} className="confirmation-description" style={style(confirmationStyle(configuration.descriptionStyle,'small'))}><ParticipantRichText title="" text={description}/></div>}
   </div>
  </div></div>
  {showError&&<p id={`${id}-error`} role="alert">{REQUIRED_CONFIRMATION_MESSAGE}</p>}
 </fieldset>;
}
