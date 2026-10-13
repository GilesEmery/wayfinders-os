"use client";
import {useState} from 'react';
import {CALLOUT_STYLES,calloutStyle} from '@/lib/experiences/builder/callout-styles';
import {CalloutBlock,CalloutIcon} from '@/components/experiences/builder/CalloutBlock';
import {LiveAppearanceFrame} from './LivePresentationPreview';
export function CalloutCardEditor({blockId,config,settings,requirement,visibility,action}:{blockId:string;config:Record<string,unknown>;settings:unknown;requirement:string;visibility:string;action:(data:FormData)=>Promise<void>}){
 const initialStyle=calloutStyle(config.calloutStyle)?.id??({info:'insight',success:'remember',emphasis:'reflect',warning:'important'} as const)[String(config.treatment||'info') as 'info']??'insight';
 const [style,setStyle]=useState<string>(initialStyle),[title,setTitle]=useState(String(config.title??'')),[body,setBody]=useState(String(config.body??'')),[showIcon,setIcon]=useState(config.showIcon!==false),[showTitle,setShowTitle]=useState(config.showTitle!==false),[border,setBorder]=useState(String(config.borderStyle||'left'));
 async function save(data:FormData){for(const name of ['requirement_level','visibility']){const control=document.querySelector<HTMLSelectElement>(`select[data-callout-owner="${blockId}"][name="${name}"]`);if(control)data.set(name,control.value);}await action(data);}
 return <div className="callout-canvas-editor"><form id={`block-presentation-${blockId}`} action={save} data-presentation-block-id={blockId}>
 <fieldset className="callout-style-picker"><legend>Callout style</legend><div>{CALLOUT_STYLES.map(item=><label key={item.id} className={style===item.id?'is-selected':''} style={{color:item.color}}><input type="radio" name="callout_style" value={item.id} checked={style===item.id} onChange={()=>{if(!title||title===calloutStyle(style)?.label)setTitle(item.label);setStyle(item.id);}}/><CalloutIcon style={item.id}/><span>{item.label}</span></label>)}</div></fieldset>
 <label>Title<input name="title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={180}/></label><label>Content<textarea name="body" value={body} onChange={e=>setBody(e.target.value)} required rows={5} maxLength={4000}/></label>
 <div className="callout-toggles"><label><input name="show_icon" type="checkbox" checked={showIcon} onChange={e=>setIcon(e.target.checked)}/>Show icon</label><label><input name="show_title" type="checkbox" checked={showTitle} onChange={e=>setShowTitle(e.target.checked)}/>Show title</label></div>
 <fieldset className="callout-border-picker"><legend>Border style</legend>{[['left','Left accent'],['outline','Outline'],['none','None']].map(([id,label])=><label key={id}><input type="radio" name="border_style" value={id} checked={border===id} onChange={()=>setBorder(id)}/>{label}</label>)}</fieldset>
 <input type="hidden" name="treatment" value={String(config.treatment||'info')}/><input type="hidden" name="requirement_level" value={requirement}/><input type="hidden" name="visibility" value={visibility}/><button type="submit">Save changes</button></form>
 <div className="callout-live-preview"><small>Live preview</small><LiveAppearanceFrame blockId={blockId} settings={settings}><CalloutBlock config={{...config,calloutStyle:style,title,body,showIcon,showTitle,borderStyle:border}}/></LiveAppearanceFrame></div></div>;
}
