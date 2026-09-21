"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CourseNavigatorViewport({ activeLocationKey, children }: { activeLocationKey: string; children: ReactNode }) {
  const navigatorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const navigator = navigatorRef.current;
        const activeItem = navigator?.querySelector<HTMLElement>('[aria-current="page"]');
        const scrollPanel = navigator?.closest<HTMLElement>(".participant-course-outline");

        if (!activeItem || !scrollPanel || scrollPanel.scrollHeight <= scrollPanel.clientHeight) return;

        const panelBounds = scrollPanel.getBoundingClientRect();
        const itemBounds = activeItem.getBoundingClientRect();
        const centeredTop = scrollPanel.scrollTop
          + itemBounds.top
          - panelBounds.top
          - (scrollPanel.clientHeight - itemBounds.height) / 2;

        scrollPanel.scrollTo({ top: Math.max(0, centeredTop), behavior: "auto" });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeLocationKey]);

  return <nav ref={navigatorRef} className="participant-course-navigator" aria-label="Course navigator">{children}</nav>;
}
