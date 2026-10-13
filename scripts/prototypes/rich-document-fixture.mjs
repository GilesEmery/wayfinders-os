import {Node,Mark} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {MarkdownManager} from '@tiptap/markdown';
import {load} from '../performance/offline-module.mjs';
const style=load('lib/experiences/builder/course-font-style.ts',{});
const font=load('lib/experiences/builder/course-font-override.ts',{'@tiptap/core':{Mark},'./course-font-style':style});
export const richDocument=load('lib/experiences/builder/rich-text-document.ts',{'@tiptap/markdown':{MarkdownManager},'@tiptap/starter-kit':{default:StarterKit},'./course-font-override':font,'./course-indent':load('lib/experiences/builder/course-indent.ts',{'@tiptap/core':{Node}}),'./course-alignment':load('lib/experiences/builder/course-alignment.ts',{'@tiptap/core':{Node}}),'./course-text-size':load('lib/experiences/builder/course-text-size.ts',{'@tiptap/core':{Mark}})});
