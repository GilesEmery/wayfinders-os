import type { ReactNode } from "react";
import { readBlockPresentation } from "@/lib/experiences/builder/block-presentation";
import { ParticipantRichText } from "./ParticipantRichText";
import type { CourseLinkContext } from "@/lib/experiences/builder/course-links";

export function BlockPresentation({ settings, children, linkContext }: { settings: unknown; children: ReactNode; linkContext?: CourseLinkContext }) {
  const p = readBlockPresentation(settings);
  if (!p) return <>{children}</>;
  const header = p.header.trim() && <div className={`course-item-text is-${p.headerSize}`}><ParticipantRichText title="" text={p.header} linkContext={linkContext}/></div>;
  const body = p.body.trim() && <div className={`course-item-text is-${p.bodySize}`}><ParticipantRichText title="" text={p.body} linkContext={linkContext}/></div>;
  const item = <div className="course-item-content">{children}</div>;
  return <div className="course-item-presentation">{p.placement === "above" ? <>{item}{header}{body}</> : p.placement === "between" ? <>{header}{item}{body}</> : <>{header}{body}{item}</>}</div>;
}
