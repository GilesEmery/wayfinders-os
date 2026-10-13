import {MarkdownManager} from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import type {BuilderContentBlock} from '../types';
import {CourseTextSize} from '../course-text-size';
import {CourseIndent} from '../course-indent';
import {fieldDocument} from './model';
const markdown=new MarkdownManager({extensions:[StarterKit,CourseTextSize,CourseIndent]});
export function reviewTextDocument(block:BuilderContentBlock){
 if(block.block_type==='heading')return fieldDocument(String(block.configuration.text??block.configuration.title??''),String(block.configuration.level??'h2'));
 if(block.block_type==='rich_text')return markdown.parse(String(block.configuration.text??''));
 if(block.block_type==='callout')return markdown.parse(String(block.configuration.body??''));
 return null;
}
