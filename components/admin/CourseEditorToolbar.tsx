"use client";
import type {ReactNode} from 'react';
import {AlignLeft,AlignCenter,AlignRight,Bold,Italic,Underline,Undo2,Redo2,IndentIncrease,IndentDecrease,Link,Link2,List,ListOrdered,Ellipsis,Heading,TextQuote,Type} from 'lucide-react';
export function CourseEditorToolbar({label,children,className=''}:{label:string;children:ReactNode;className?:string}){return <div className={`course-editor-toolbar ${className}`} role="toolbar" aria-label={label}>{children}</div>;}
export function CourseEditorToolIcon({label,fallback}:{label:string;fallback?:ReactNode}){
 const icons:Record<string,typeof Bold>={'Align left':AlignLeft,'Align center':AlignCenter,'Align right':AlignRight,Bold,Italic,Underline,Undo:Undo2,Redo:Redo2,Indent:IndentIncrease,Outdent:IndentDecrease,Link,'Add link':Link,'Edit or remove link':Link,'Insert internal course link':Link2,Bullets:List,'Bulleted list':List,Numbers:ListOrdered,'Numbered list':ListOrdered,'Font…':Ellipsis,'Advanced font controls':Ellipsis,'Use semantic heading':Heading,'Use paragraph':TextQuote,'Reset selected override':Type};
 const Icon=icons[label];return Icon?<Icon size={16} strokeWidth={1.8} aria-hidden="true"/>:<>{fallback??label}</>;
}
