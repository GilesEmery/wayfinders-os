import {readRichText} from "@/lib/experiences/builder/rich-text-document";
import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { courseFontStyle } from "@/lib/experiences/builder/course-font-override";
import Link from "next/link";
import { safeRichTextLink, safeCourseLink, contextualCourseLink, type CourseLinkContext } from "@/lib/experiences/builder/course-links";


function markedContent(node: JSONContent, content: ReactNode, context?: CourseLinkContext) {
  return (node.marks ?? []).reduce<ReactNode>((rendered, mark, index) => {
    if (mark.type === "courseTextSize" && ["h1", "h2", "h3", "h4", "h5", "h6", "body", "small"].includes(String(mark.attrs?.size))) return <span key={index} className={`course-text-size is-${mark.attrs?.size}`}>{rendered}</span>;
    if (mark.type === "courseFontOverride") return <span key={index} data-course-font style={courseFontStyle(mark.attrs??{})}>{rendered}</span>;
    if (mark.type === "underline") return <u key={index}>{rendered}</u>;
    if (mark.type === "bold") return <strong key={index}>{rendered}</strong>;
    if (mark.type === "italic") return <em key={index}>{rendered}</em>;
    if (mark.type === "link") {
      const href = safeRichTextLink(typeof mark.attrs?.href === "string" ? mark.attrs.href : "");
      if (href && safeCourseLink(href)) return <Link key={index} href={contextualCourseLink(href, context)}>{rendered}</Link>;
      return href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer">{rendered}<span className="sr-only"> (opens in a new tab)</span></a> : rendered;
    }
    return rendered;
  }, content);
}

function renderNode(node: JSONContent, key: number | string, context?: CourseLinkContext): ReactNode {
  if (node.type === "text") return <span key={key}>{markedContent(node, node.text ?? "", context)}</span>;
  if (node.type === "hardBreak") return <br key={key}/>;
  const children = (node.content ?? []).map((child, index) => renderNode(child, index, context));
  if (node.type === "courseAlignment") return <div key={key} style={{textAlign:["left","center","right"].includes(String(node.attrs?.alignment))?node.attrs?.alignment:"left"}}>{children}</div>;
  if (node.type === "courseIndent") return <div key={key} className="course-text-indent">{children}</div>;
  if (node.type === "doc") return <>{children}</>;
  if (node.type === "paragraph") return <p key={key}>{children.length ? children : <br/>}</p>;
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 1);
    if (level === 6) return <h6 key={key}>{children}</h6>;
    if (level === 5) return <h5 key={key}>{children}</h5>;
    if (level === 4) return <h4 key={key}>{children}</h4>;
    if (level === 3) return <h3 key={key}>{children}</h3>;
    if (level === 2) return <h2 key={key}>{children}</h2>;
    return <h1 key={key}>{children}</h1>;
  }
  if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
  if (node.type === "orderedList") return <ol key={key} start={Number(node.attrs?.start ?? 1)}>{children}</ol>;
  if (node.type === "listItem") return <li key={key}>{children}</li>;
  if (node.type === "blockquote") return <blockquote key={key}>{children}</blockquote>;
  return <span key={key}>{children}</span>;
}

export function ParticipantRichText({ title, text, linkContext, titleLevel = "h3" }: { titleLevel?: string; title: string; text: string; linkContext?: CourseLinkContext }) {
  const document = readRichText(text);
  return <div className="participant-rich-text-block">{title && (titleLevel === "h1" ? <h1>{title}</h1> : titleLevel === "h2" ? <h2>{title}</h2> : titleLevel === "h4" ? <h4>{title}</h4> : titleLevel === "h5" ? <h5>{title}</h5> : titleLevel === "h6" ? <h6>{title}</h6> : <h3>{title}</h3>)}{renderNode(document, "document", linkContext)}</div>;
}

export function ParticipantRichTitle({text}:{text:string}){function inline(node:JSONContent,key:string):ReactNode{if(node.type==='text')return <span key={key}>{markedContent(node,node.text??'')}</span>;if(node.type==='hardBreak')return <br key={key}/>;const children=(node.content??[]).map((child,index)=>inline(child,`${key}-${index}`));if(node.type==='paragraph'||node.type==='heading')return <span key={key} style={{display:'block'}}>{children}</span>;if(node.type==='courseAlignment')return <span key={key} style={{display:'block',textAlign:['left','center','right'].includes(String(node.attrs?.alignment))?node.attrs?.alignment:'left'}}>{children}</span>;return <span key={key}>{children}</span>;}return <>{inline(readRichText(text),'title')}</>;}
