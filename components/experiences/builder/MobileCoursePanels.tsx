"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Panel = "outline" | "companion";

/** Keep the desktop grid intact while exposing its sidebars as mobile drawers. */
export function MobileCoursePanels({ children, templateKey, hasCompanion }: { children: ReactNode; templateKey: string; hasCompanion: boolean }) {
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const outlineButton = useRef<HTMLButtonElement>(null);
  const companionButton = useRef<HTMLButtonElement>(null);

  function closePanel() {
    (openPanel === "outline" ? outlineButton : companionButton).current?.focus();
    setOpenPanel(null);
  }

  return <div className={`participant-course-layout is-${templateKey} mobile-course-panels${openPanel ? ` has-open-${openPanel}` : ""}`}
    onKeyDown={event => { if (event.key === "Escape" && openPanel) { event.preventDefault(); closePanel(); } }}
    onClick={event => { if (openPanel === "outline" && (event.target as HTMLElement).closest(".participant-course-outline a")) setOpenPanel(null); }}>
    <button className="mobile-course-tab is-outline" ref={outlineButton} type="button" aria-controls="mobile-course-outline" aria-expanded={openPanel === "outline"} onClick={() => setOpenPanel(current => current === "outline" ? null : "outline")}><span>Outline</span>{openPanel === "outline" ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}</button>
    {hasCompanion && <button className="mobile-course-tab is-companion" ref={companionButton} type="button" aria-controls="mobile-course-companion" aria-expanded={openPanel === "companion"} onClick={() => setOpenPanel(current => current === "companion" ? null : "companion")}><span>Companion</span>{openPanel === "companion" ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}</button>}
    {openPanel && <button className="mobile-course-panel-dismiss" type="button" aria-label="Close course panel" onClick={closePanel}/>}
    {children}
  </div>;
}
