"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendCompanionChatMessageAction } from "@/lib/experiences/builder/companion-actions";
import type { CompanionChatMessage, ResolvedCompanionModule } from "@/lib/experiences/builder/companion-data";
import { curriculumLocationKey, curriculumLocationLabel } from "@/lib/experiences/builder/companion-live";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null };

export function CompanionPolling({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 12000);
    return () => window.clearInterval(timer);
  }, [enabled, router]);
  return null;
}

export function VideoCallExperience({ module }: { module: ResolvedCompanionModule }) {
  const config = module.effective_configuration;
  const text = (key: string) => typeof config[key] === "string" ? config[key] as string : "";
  const provider = text("provider").replaceAll("_", " ") || "Meeting provider";
  const url = text("url");
  if (!url) return null;
  return <div className="companion-call"><a className="companion-call-card" href={url} target="_blank" rel="noreferrer" aria-label={`Join ${module.display_title} with ${provider}`}><div className="companion-call-mark" aria-hidden="true"><span/></div><div className="companion-call-status"><span>{provider}</span><strong>{module.display_title}</strong>{text("recurring_time") && <small>{text("recurring_time")}</small>}{text("instructions") && <p>{text("instructions")}</p>}</div><span className="companion-call-join">Join Call</span></a></div>;
}

export function GroupChatExperience({ module, route, messages }: { module: ResolvedCompanionModule; route: Route; messages: CompanionChatMessage[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const posting = module.effective_configuration.allow_participant_posting !== "false";
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages.length]);
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <div className="companion-chat"><div className="companion-chat-messages" ref={listRef} role="log" aria-label={`${module.display_title} messages`} aria-live="polite">{messages.map((message, index) => { const key = curriculumLocationKey(message.curriculum_context); const previous = index ? curriculumLocationKey(messages[index - 1].curriculum_context) : null; const label = curriculumLocationLabel(message.curriculum_context); return <div className="companion-chat-entry" key={message.id}>{key && key !== previous && label.primary && <div className="companion-chat-location"><strong>{label.primary}</strong>{label.secondary && <span>{label.secondary}</span>}</div>}<article><header><strong>{message.author_name}</strong><time dateTime={message.created_at}>{formatter.format(new Date(message.created_at)).replace(",", " ·")}</time></header><p>{message.body}</p></article></div>; })}{!messages.length && <p className="companion-empty">No messages yet. Start the Cohort conversation.</p>}</div>{posting ? <form className="companion-chat-composer" action={sendCompanionChatMessageAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, module.id, route.cohortId)}><label><span className="sr-only">Write a Cohort message</span><textarea name="message" required maxLength={4000} rows={3} placeholder="Write a message…"/></label><button>Send</button></form> : <p className="companion-empty">Participant posting is currently off.</p>}</div>;
}
