import {COURSE_FONT_FAMILIES} from "@/lib/experiences/builder/course-font-style";
import type { ReactNode, CSSProperties } from "react";
import { readBlockAppearance, readBlockPresentation, type BlockPresentation as Presentation } from "@/lib/experiences/builder/block-presentation";
import { ParticipantRichText } from "./ParticipantRichText";
import type { CourseLinkContext } from "@/lib/experiences/builder/course-links";

export function BlockPresentation({ settings, children, linkContext, headerNode, bodyNode }: { settings: unknown; children: ReactNode; linkContext?: CourseLinkContext;headerNode?:ReactNode;bodyNode?:ReactNode }) {
  const p:Presentation|null = readBlockPresentation(settings) ?? (readBlockAppearance(settings)?{header:"",body:"",headerSize:"h3",bodySize:"h4",placement:"below",appearance:readBlockAppearance(settings)} as const:null);
  if (!p) return <>{children}</>;
  const header = headerNode !== undefined ? headerNode : p.header.trim() && <div className={`course-item-text is-${p.headerSize}`}><ParticipantRichText title="" text={p.header} linkContext={linkContext}/></div>;
  const body = bodyNode !== undefined ? bodyNode : p.body.trim() && <div className={`course-item-text is-${p.bodySize}`}><ParticipantRichText title="" text={p.body} linkContext={linkContext}/></div>;
  const subtitle=p.subtitle?.trim()&&<div className={`course-item-text is-${p.subtitleSize??"h3"}`}><ParticipantRichText title="" text={p.subtitle} linkContext={linkContext}/></div>;
  const caption=p.caption?.trim()&&<div className={`course-item-text is-${p.captionSize??"small"}`}><ParticipantRichText title="" text={p.caption} linkContext={linkContext}/></div>;
  const a=p.appearance,style:CSSProperties=a?{...{"--block-text-gap":a.columnGap===undefined?undefined:`${a.columnGap}px`},fontSize:a.fontSize===undefined?undefined:`${a.fontSize}px`,lineHeight:a.lineHeight,letterSpacing:a.letterSpacing===undefined?undefined:`${a.letterSpacing}px`,color:a.color,fontFamily:a.family?COURSE_FONT_FAMILIES[a.family as keyof typeof COURSE_FONT_FAMILIES]:undefined,textAlign:a.alignment,padding:a.padding===undefined?undefined:`${a.padding}px`,width:a.width===undefined?undefined:`${a.width}%`,background:a.background,border:a.border?"1px solid var(--experience-border,#cbd0cd)":undefined,marginInline:a.alignment==="center"?"auto":a.alignment==="right"?"auto 0":undefined}:{};
  const item = <div className="course-item-content">{children}</div>;
  return <div className="course-item-presentation" data-media-side={p.mediaSide} data-text-columns={a?.columns} data-box-font-size={a?.fontSize!==undefined||undefined} data-box-line-height={a?.lineHeight!==undefined||undefined} data-box-letter-spacing={a?.letterSpacing!==undefined||undefined} data-box-color={Boolean(a?.color)||undefined} data-box-family={Boolean(a?.family)||undefined} data-media-fit={a?.fit} style={style}>{p.mediaSide&&p.mediaSide!=="stacked"?<>{header}{subtitle}<div className={`video-text-layout is-video-${p.mediaSide}`}>{item}<div className="video-supporting-text">{body}</div></div></>:p.placement === "above" ? <>{item}{header}{subtitle}{body}</> : p.placement === "between" ? <>{header}{subtitle}{item}{body}</> : <>{header}{subtitle}{body}{item}</>}{caption}</div>;
}
