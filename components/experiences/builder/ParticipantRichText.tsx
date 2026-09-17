import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { safeExternalUrl } from "@/lib/experiences/builder/media-source";

const markdown = new MarkdownManager({
  extensions: [StarterKit.configure({ code: false, codeBlock: false, horizontalRule: false, strike: false })],
});

function markedContent(node: JSONContent, content: ReactNode) {
  return (node.marks ?? []).reduce<ReactNode>((rendered, mark, index) => {
    if (mark.type === "bold") return <strong key={index}>{rendered}</strong>;
    if (mark.type === "italic") return <em key={index}>{rendered}</em>;
    if (mark.type === "link") {
      const href = safeExternalUrl(typeof mark.attrs?.href === "string" ? mark.attrs.href : "");
      return href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer">{rendered}<span className="sr-only"> (opens in a new tab)</span></a> : rendered;
    }
    return rendered;
  }, content);
}

function renderNode(node: JSONContent, key: number | string): ReactNode {
  if (node.type === "text") return <span key={key}>{markedContent(node, node.text ?? "")}</span>;
  if (node.type === "hardBreak") return <br key={key}/>;
  const children = (node.content ?? []).map((child, index) => renderNode(child, index));
  if (node.type === "doc") return <>{children}</>;
  if (node.type === "paragraph") return <p key={key}>{children}</p>;
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 1);
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

export function ParticipantRichText({ title, text }: { title: string; text: string }) {
  const document = markdown.parse(text);
  return <div className="participant-rich-text-block">{title && <h3>{title}</h3>}{renderNode(document, "document")}</div>;
}
