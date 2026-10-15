"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Panel = "outline" | "companion";

/** Keep the desktop grid intact while exposing its sidebars as mobile drawers. */
export function MobileCoursePanels({ children, templateKey, hasCompanion }: { children: ReactNode; templateKey: string; hasCompanion: boolean }) {
  const layout = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = layout.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      const top = Math.max(0, element.getBoundingClientRect().top);
      element.style.setProperty("--course-viewport-height", `${Math.max(180, window.innerHeight - top)}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    if (element.parentElement) observer.observe(element.parentElement);
    measure();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, {passive:true});
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", schedule); window.removeEventListener("scroll", schedule); };
  }, []);
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const outlineButton = useRef<HTMLButtonElement>(null);
  const companionButton = useRef<HTMLButtonElement>(null);

  function closePanel() {
    (openPanel === "outline" ? outlineButton : companionButton).current?.focus();
    setOpenPanel(null);
  }

  return <div ref={layout} className={`participant-course-layout is-${templateKey} mobile-course-panels${openPanel ? ` has-open-${openPanel}` : ""}`}
    onKeyDown={event => { if (event.key === "Escape" && openPanel) { event.preventDefault(); closePanel(); } }}
    onClick={event => { if (openPanel === "outline" && (event.target as HTMLElement).closest(".participant-course-outline a")) setOpenPanel(null); }}>
    <button className="mobile-course-tab is-outline" ref={outlineButton} type="button" aria-controls="mobile-course-outline" aria-expanded={openPanel === "outline"} onClick={() => setOpenPanel(current => current === "outline" ? null : "outline")}><span>Outline</span>{openPanel === "outline" ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}</button>
    {hasCompanion && <button className="mobile-course-tab is-companion" ref={companionButton} type="button" aria-controls="mobile-course-companion" aria-expanded={openPanel === "companion"} onClick={() => setOpenPanel(current => current === "companion" ? null : "companion")}><span>Companion</span>{openPanel === "companion" ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}</button>}
    {openPanel && <button className="mobile-course-panel-dismiss" type="button" aria-label="Close course panel" onClick={closePanel}/>}
    {children}
  </div>;
}
