"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function AssessmentFocusFrame({ active, label, onClose, children }: { active: boolean; label: string; onClose: () => void; children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        const controls = Array.from(frameRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? []).filter((element) => element.getClientRects().length);
        const first = controls[0]; const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus();
        else {
          const label = previousFocus?.getAttribute("aria-label");
          if (label) Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-label]")).find((button) => button.getAttribute("aria-label") === label)?.focus();
        }
      });
    };
  }, [active]);

  if (!active || typeof document === "undefined") return children;
  return createPortal(<div aria-label={label} aria-modal="true" className="assessment-focus-backdrop" ref={frameRef} role="dialog" tabIndex={-1}>
    <button aria-label={`Close ${label}`} className="assessment-focus-close" onClick={onClose} ref={closeRef} type="button">×</button>
    <div className="assessment-focus-panel">{children}</div>
  </div>, document.body);
}
