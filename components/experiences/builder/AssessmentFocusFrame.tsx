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
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  if (!active || typeof document === "undefined") return children;
  return createPortal(<div aria-label={label} aria-modal="true" className="assessment-focus-backdrop" ref={frameRef} role="dialog" tabIndex={-1}>
    <button aria-label={`Close ${label}`} className="assessment-focus-close" onClick={onClose} ref={closeRef} type="button">×</button>
    <div className="assessment-focus-panel">{children}</div>
  </div>, document.body);
}
