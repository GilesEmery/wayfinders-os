"use client";

import { useEffect, type RefObject } from "react";

export function scrollToPageStart() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function usePageStart(changeKey: string, headingRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      headingRef?.current?.focus({ preventScroll: true });
      scrollToPageStart();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [changeKey, headingRef]);
}

export function focusAndReveal(element: HTMLElement, block: ScrollLogicalPosition = "start") {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ behavior: "auto", block, inline: "nearest" });
}
