import {Node} from '@tiptap/core';
export const CourseAlignment=Node.create({
 name:'courseAlignment',group:'block',content:'block+',addAttributes:()=>({alignment:{default:'left'}}),
 parseHTML:()=>[{tag:'div[data-course-alignment]',getAttrs:element=>({alignment:(element as HTMLElement).dataset.courseAlignment})}],
 renderHTML:({HTMLAttributes})=>{const alignment=['left','center','right'].includes(HTMLAttributes.alignment)?HTMLAttributes.alignment:'left';return ['div',{'data-course-alignment':alignment,style:`text-align:${alignment}`},0];},
 markdownTokenizer:{name:'courseAlignment',level:'block',start:source=>source.indexOf(':::course-align-'),tokenize(source,_tokens,lexer){const match=/^:::course-align-(left|center|right)\n([\s\S]*?)\n:::end-course-align(?:\n|$)/.exec(source);if(match)return {type:'courseAlignment',raw:match[0],alignment:match[1],tokens:lexer.blockTokens(match[2])};}},
 parseMarkdown:(token,helpers)=>helpers.createNode('courseAlignment',{alignment:token.alignment},helpers.parseChildren(token.tokens??[])),
 renderMarkdown:(node,helpers)=>`:::course-align-${node.attrs?.alignment??'left'}\n${helpers.renderChildren(node.content??[],'\n\n')}\n:::end-course-align`,
});
