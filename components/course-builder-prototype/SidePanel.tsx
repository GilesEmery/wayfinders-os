"use client";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import {createPortal} from "react-dom";
import styles from "./Prototype.module.css";
export function SidePanel({title,onClose,children,visible=true}:{title:string;onClose:()=>void;children:ReactNode;visible?:boolean}) {
 const mounted=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
 const anchor=useRef<HTMLSpanElement>(null);
 const panel=useRef<HTMLElement>(null),close=useRef(onClose);
 useEffect(()=>{close.current=onClose;},[onClose]);
 useEffect(()=>{if(!visible||!mounted)return;const source=anchor.current?.parentElement;if(source&&panel.current){const computed=getComputedStyle(source);for(let i=0;i<computed.length;i++){const key=computed[i];if(key.startsWith('--'))panel.current.style.setProperty(key,computed.getPropertyValue(key));}}const previous=document.activeElement as HTMLElement|null;panel.current?.focus();function key(event:KeyboardEvent){if(event.key==="Escape"){event.stopPropagation();close.current();}}document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);if(previous?.isConnected)previous.focus();};},[visible,mounted]);
 if(!mounted)return null;
 return <><span ref={anchor} hidden/>{createPortal(<aside hidden={!visible} ref={panel} onClick={event=>event.stopPropagation()} tabIndex={-1} className={styles.advancedSidebar} data-demo-advanced-sidebar aria-label={title}><header><div><small>ADVANCED OPTIONS</small><h2>{title}</h2></div><button type="button" aria-label={`Close ${title}`} onClick={onClose}>×</button></header><div className={styles.sidebarBody}>{children}</div></aside>,document.body)}</>;
}
