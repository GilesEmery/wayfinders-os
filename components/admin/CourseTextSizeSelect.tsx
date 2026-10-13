"use client";
import {useRef,useState,type FocusEventHandler,type PointerEventHandler} from 'react';
import type {VideoTextStyle} from '@/lib/experiences/builder/video-editor';
const defaults:Record<VideoTextStyle,number>={h1:40,h2:28,h3:20,h4:16,h5:15,h6:13,body:16,small:13};
export function CourseTextSizeSelect({value,onChange,onCapture,customSize,onCustomSize}:{customSize?:number|null;onCustomSize?:(size:number)=>void;value:string;onChange:(style:VideoTextStyle)=>void;onCapture:()=>void}){
 const ref=useRef<HTMLSelectElement>(null);const [sizes,setSizes]=useState(defaults);
 function capture(){onCapture();if(ref.current){const css=getComputedStyle(ref.current);setSizes(Object.fromEntries(Object.entries(defaults).map(([style,fallback])=>[style,parseFloat(css.getPropertyValue(`--course-${style}-size`))||fallback])) as typeof defaults);}}
 return <label><span className="sr-only">Font size</span><select ref={ref} aria-label="Font size" value={customSize?`custom:${customSize}`:value} onPointerDown={capture as PointerEventHandler<HTMLSelectElement>} onFocus={capture as FocusEventHandler<HTMLSelectElement>} onChange={event=>{if(event.target.value.startsWith("custom:"))onCustomSize?.(Number(event.target.value.slice(7)));else onChange(event.target.value as VideoTextStyle);}}>{Object.keys(defaults).map(style=><option key={style} value={style} title={style.toUpperCase()}>{sizes[style as VideoTextStyle]} px</option>)}{onCustomSize&&[...new Set([10,11,12,14,18,22,24,26,30,32,36,48,64,...(customSize?[customSize]:[])])].filter(size=>!Object.values(sizes).includes(size)||size===customSize).sort((a,b)=>a-b).map(size=><option key={`custom:${size}`} value={`custom:${size}`}>{size} px · Custom</option>)}</select></label>;
}
