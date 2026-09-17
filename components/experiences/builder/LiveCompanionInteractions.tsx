"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { endCompanionCallAction, sendCompanionChatMessageAction, startCompanionCallAction } from "@/lib/experiences/builder/companion-actions";
import type { CompanionChatMessage, ResolvedCompanionModule } from "@/lib/experiences/builder/companion-data";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string };

export function CompanionPolling({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 12000);
    return () => window.clearInterval(timer);
  }, [enabled, router]);
  return null;
}

export function VideoCallExperience({ module, route, canStart, canEnd }: { module: ResolvedCompanionModule; route: Route; canStart: boolean; canEnd: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const config = module.effective_configuration;
  const text = (key: string) => typeof config[key] === "string" ? config[key] as string : "";
  const provider = text("provider").replaceAll("_", " ") || "Meeting provider";
  const url = text("url");
  const live = Boolean(module.call_session);
  return <div className={`companion-call${expanded ? " is-expanded" : ""}`} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? `${module.display_title} expanded call` : undefined}>
    <div className="companion-call-frame"><div className="companion-call-status"><span>{provider}</span><strong>{live ? "Group Call is Live" : module.display_title}</strong>{text("recurring_time") && <small>{text("recurring_time")}</small>}<p>{text("instructions")}</p></div></div>
    <div className="companion-call-controls">{!live && canStart && <form action={startCompanionCallAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, module.id)}><button aria-label={`Start ${module.display_title}`}>Start Call</button></form>}{!live && !canStart && <span>Your group call has not started yet.</span>}{live && url && <a href={url} target="_blank" rel="noreferrer" aria-label={`Join ${module.display_title} with ${provider}`}>{text("button_label") || "Join Call"}</a>}{live && url && <a className="is-secondary" href={url} target="_blank" rel="noreferrer">Open Externally</a>}{live && canEnd && <form action={endCompanionCallAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, module.id)}><button className="is-secondary" aria-label={`End ${module.display_title} live state`}>End Call</button></form>}<button className="is-secondary" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? "Collapse Call" : "Expand Call"}</button></div>
    {expanded && <button className="companion-call-backdrop" type="button" aria-label="Collapse call and return to Course" onClick={() => setExpanded(false)}/>} 
  </div>;
}

export function GroupChatExperience({ module, route, messages }: { module: ResolvedCompanionModule; route: Route; messages: CompanionChatMessage[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const posting = module.effective_configuration.allow_participant_posting !== "false";
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages.length]);
  return <div className="companion-chat"><div className="companion-chat-messages" ref={listRef} role="log" aria-label={`${module.display_title} messages`} aria-live="polite">{messages.map((message) => <article key={message.id}><header><strong>{message.author_name}</strong><time dateTime={message.created_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.created_at))}</time></header><p>{message.body}</p></article>)}{!messages.length && <p className="companion-empty">No messages yet. Start the group conversation.</p>}</div>{posting ? <form className="companion-chat-composer" action={sendCompanionChatMessageAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, module.id)}><label><span className="sr-only">Write a group message</span><textarea name="message" required maxLength={4000} rows={3} placeholder="Write a message…"/></label><button>Send</button></form> : <p className="companion-empty">Participant posting is currently off.</p>}</div>;
}
