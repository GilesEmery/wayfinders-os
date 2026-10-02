"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { reconcileMessageWindow } from "@/lib/experiences/builder/companion-incremental";
import { deleteCompanionChatMessageAction, sendCompanionChatMessageAction } from "@/lib/experiences/builder/companion-actions";
import type { CompanionChatMessage, ResolvedCompanionModule } from "@/lib/experiences/builder/companion-data";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null };

type LiveModule = { id: string; configuration: ResolvedCompanionModule["effective_configuration"]; callSession: ResolvedCompanionModule["call_session"]; messages: CompanionChatMessage[] };
type ModuleUpdate = LiveModule & { messageIds: string[] };
const LiveContext = createContext<Record<string, LiveModule> | null>(null);

export function CompanionPolling({ enabled, route, initial, children }: { enabled: boolean; route: Route; initial: LiveModule[]; children: ReactNode }) {
  const [state, setState] = useState(() => Object.fromEntries(initial.map(module => [module.id, module])));
  const cursor = useRef<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let controller: AbortController | null = null;
    async function poll() {
      if (!active || document.visibilityState !== "visible" || controller) return;
      controller = new AbortController();
      try {
        const query = new URLSearchParams({ module: route.moduleKey, lesson: route.lessonKey, section: route.sectionKey });
        if (route.cohortId) query.set("cohort", route.cohortId);
        if (cursor.current) query.set("after", cursor.current);
        const response = await fetch(`/api/experiences/${encodeURIComponent(route.slug)}/companion?${query}`, { cache: "no-store", signal: controller.signal });
        if (!active) return;
        if (response.status === 401 || response.status === 403 || response.redirected) { cursor.current = null; stateRef.current = {}; setState({}); return; }
        if (!response.ok) return;
        let payload = await response.json() as { modules: ModuleUpdate[] };
        const missing = payload.modules.some(module => {
          const known = new Set([...(stateRef.current[module.id]?.messages ?? []), ...module.messages].map(message => message.id));
          return module.messageIds.some(id => !known.has(id));
        });
        // Handle delayed commits, reconnects and window changes without cursor gaps.
        if (missing && cursor.current) {
          query.delete("after");
          const reset = await fetch(`/api/experiences/${encodeURIComponent(route.slug)}/companion?${query}`, { cache: "no-store", signal: controller.signal });
          if (!active) return;
          if (reset.status === 401 || reset.status === 403 || reset.redirected) { cursor.current = null; stateRef.current = {}; setState({}); return; }
          if (!reset.ok) return;
          payload = await reset.json() as { modules: ModuleUpdate[] };
        }
        if (!active) return;
        stateRef.current = Object.fromEntries(payload.modules.map(module => [module.id, { ...module, messages: reconcileMessageWindow(stateRef.current[module.id]?.messages ?? [], module.messages, module.messageIds) }]));
        setState(stateRef.current);
        const newest = payload.modules.flatMap(module => module.messages).reduce((max, message) => Math.max(max, Date.parse(message.created_at)), cursor.current ? Date.parse(cursor.current) : 0);
        if (newest) cursor.current = new Date(newest).toISOString();
      } catch {
        // Keep the last successful window on transient failure; the next poll retries.
      } finally { controller = null; }
    }
    const onVisibility = () => { if (document.visibilityState !== "visible") controller?.abort(); else void poll(); };
    const timer = window.setInterval(() => { void poll(); }, 12000);
    document.addEventListener("visibilitychange", onVisibility);
    void poll();
    return () => { active = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [enabled, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.cohortId]);
  return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}

export function VideoCallExperience({ module }: { module: ResolvedCompanionModule }) {
  const live = useContext(LiveContext);
  const config = live ? live[module.id]?.configuration ?? {} : module.effective_configuration;
  const text = (key: string) => typeof config[key] === "string" ? config[key] as string : "";
  const callSession = live ? live[module.id]?.callSession : module.call_session;
  const provider = text("provider").replaceAll("_", " ") || "Meeting provider";
  const url = text("url");
  if (!url) return null;
  return <div className="companion-call"><a className="companion-call-card" href={url} target="_blank" rel="noreferrer" aria-label={`Join ${module.display_title} with ${provider}`}><div className="companion-call-mark" aria-hidden="true"><span/></div><div className="companion-call-status"><span>{provider}</span><strong>{module.display_title}</strong>{callSession?.status === "live" && <small role="status">Call live</small>}{text("recurring_time") && <small>{text("recurring_time")}</small>}{text("instructions") && <p>{text("instructions")}</p>}</div><span className="companion-call-join">Join Call</span></a></div>;
}

export function GroupChatExperience({ module, route, messages, currentParticipantId }: { module: ResolvedCompanionModule; route: Route; messages: CompanionChatMessage[]; currentParticipantId: string | null }) {
  const live = useContext(LiveContext);
  const current = live?.[module.id];
  messages = live ? current?.messages ?? [] : messages;
  const listRef = useRef<HTMLDivElement>(null);
  const posting = (!live || Boolean(current)) && (current?.configuration ?? module.effective_configuration).allow_participant_posting !== "false";
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages.length]);
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <div className="companion-chat-phone"><div className="companion-chat"><div className="companion-chat-messages" ref={listRef} role="log" aria-label={`${module.display_title} messages`} aria-live="polite">{messages.map((message) => { const own = message.author_participant_id === currentParticipantId; return <div className={`companion-chat-entry${own ? " is-own" : ""}`} key={message.id}><article><header><strong>{own ? "You" : message.author_name}</strong><time dateTime={message.created_at}>{formatter.format(new Date(message.created_at)).replace(",", " ·")}</time></header><p>{message.body}</p>{own && <form className="companion-chat-delete" action={deleteCompanionChatMessageAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, module.id, route.cohortId, message.id)}><button type="submit" aria-label="Delete your message">Delete</button></form>}</article></div>; })}{!messages.length && <p className="companion-empty">No messages yet. Start the Cohort conversation.</p>}</div>{posting ? <form className="companion-chat-composer" action={sendCompanionChatMessageAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, module.id, route.cohortId)}><label><span className="sr-only">Write a Cohort message</span><textarea name="message" required maxLength={4000} rows={3} placeholder="Write a message…"/></label><button>Send</button></form> : <p className="companion-empty">Participant posting is currently off.</p>}</div></div>;
}
