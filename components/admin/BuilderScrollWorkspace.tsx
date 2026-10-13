"use client";
import {useLayoutEffect,useRef,type ReactNode} from 'react';
// Size every authoring column to the space below the actual workspace header.
export function BuilderScrollWorkspace({children}:{children:ReactNode}){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const element=root.current;if(!element)return;let frame=0;
  function measure(){if(!element)return;const top=Math.max(0,element.getBoundingClientRect().top);const height=Math.max(180,window.innerHeight-top);element.style.setProperty('--builder-workspace-height',`${height}px`);}
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);}
  const observer=new ResizeObserver(schedule);if(element.parentElement)observer.observe(element.parentElement);
  measure();window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{passive:true});
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule);};
 },[]);
 return <div ref={root} className="builder-scroll-workspace">{children}</div>;
}
