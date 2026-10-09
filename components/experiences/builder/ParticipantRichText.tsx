import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { CourseTextSize } from "@/lib/experiences/builder/course-text-size";
import { CourseIndent } from "@/lib/experiences/builder/course-indent";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import Link from "next/link";
import { safeRichTextLink, safeCourseLink, contextualCourseLink, type CourseLinkContext } from "@/lib/experiences/builder/course-links";

const markdown = new MarkdownManager({
  extensions: [StarterKit.configure({ code: false, codeBlock: false, horizontalRule: false, strike: false }), CourseIndent, CourseTextSize],
});

function markedContent(node: JSONContent, content: ReactNode, context?: CourseLinkContext) {
  return (node.marks ?? []).reduce<ReactNode>((rendered, mark, index) => {
    if (mark.type === "courseTextSize" && ["h1", "h2", "h3", "h4"].includes(String(mark.attrs?.size))) return <span key={index} className={`course-text-size is-${mark.attrs?.size}`}>{rendered}</span>;
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
  if (node.type === "courseIndent") return <div key={key} className="course-text-indent">{children}</div>;
  if (node.type === "doc") return <>{children}</>;
  if (node.type === "paragraph") return <p key={key}>{children.length ? children : <br/>}</p>;
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 1);
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
  const document = markdown.parse(text);
  return <div className="participant-rich-text-block">{title && (titleLevel === "h1" ? <h1>{title}</h1> : titleLevel === "h2" ? <h2>{title}</h2> : titleLevel === "h4" ? <h4>{title}</h4> : <h3>{title}</h3>)}{renderNode(document, "document", linkContext)}</div>;
}
