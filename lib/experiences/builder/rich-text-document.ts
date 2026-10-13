import {MarkdownManager} from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import {CourseIndent} from './course-indent';
import {CourseAlignment} from './course-alignment';
import {CourseTextSize} from './course-text-size';
import {CourseFontOverride} from './course-font-override';
import type {JSONContent} from '@tiptap/core';
const markdown=new MarkdownManager({extensions:[StarterKit.configure({code:false,codeBlock:false,horizontalRule:false,strike:false}),CourseIndent,CourseAlignment,CourseTextSize,CourseFontOverride]});
export const readRichText=(text:string)=>markdown.parse(text);
export function plainRichText(text:string){function plain(node:JSONContent):string{return node.type==='text'?node.text??'':node.type==='hardBreak'?' ': (node.content??[]).map(plain).join('')+(['paragraph','heading','listItem'].includes(node.type??'')?' ':'');}return plain(readRichText(text)).replace(/\s+/g,' ').trim();}
export const literalRichText=(text:string)=>text.replace(/[\\`*_{}\[\]<>#+.!~]/g,'\\$&');
