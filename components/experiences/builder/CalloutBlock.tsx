import {Info,Lightbulb,MessageCircle,Footprints,TriangleAlert,BookOpen,Heart,MessagesSquare,ArrowRight} from 'lucide-react';
import type {CSSProperties} from 'react';
import {calloutStyle} from '@/lib/experiences/builder/callout-styles';
const icons={insight:Info,remember:Lightbulb,reflect:MessageCircle,practice:Footprints,important:TriangleAlert,scripture:BookOpen,prayer:Heart,discuss:MessagesSquare,next_step:ArrowRight};
export function CalloutIcon({style}:{style:string}){const Icon=icons[style as keyof typeof icons]??Info;return <Icon size={20} strokeWidth={1.8} aria-hidden="true"/>;}
export function CalloutBlock({config}:{config:Record<string,unknown>}){
 const style=calloutStyle(config.calloutStyle);const title=String(config.title??'');const body=String(config.body??'');
 if(!style)return <aside className={`participant-callout-block is-${String(config.treatment||'info')}`}>{title&&<strong>{title}</strong>}<p>{body}</p></aside>;
 return <aside className={`participant-callout-block modern-callout is-border-${config.borderStyle||'left'}`} style={{'--callout-color':style.color} as CSSProperties}>
 {(config.showIcon!==false||config.showTitle!==false&&title)&&<div className="callout-heading">{config.showIcon!==false&&<CalloutIcon style={style.id}/>} {config.showTitle!==false&&title&&<strong>{title}</strong>}</div>}
 <div className="callout-body">{body}</div></aside>;
}
