"use client";

import { useEffect, useState } from "react";

export function CourseSaveStatus() {
  const [status, setStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  useEffect(() => {
    const withinEditor = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(".course-builder-settings-panel,.course-builder-canvas,.course-builder-inspector,.course-builder-outline"));
    const onChange = (event: Event) => { if (withinEditor(event.target)) setStatus("unsaved"); };
    const onSubmit = (event: Event) => { if (withinEditor(event.target)) setStatus("saving"); };
    const onSaveStatus = (event: Event) => { const next = (event as CustomEvent).detail; if (["saved", "saving", "unsaved"].includes(next)) setStatus(next); };
    document.addEventListener("input", onChange, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("purposeos:save-status", onSaveStatus);
    return () => { document.removeEventListener("input", onChange, true); document.removeEventListener("change", onChange, true); document.removeEventListener("submit", onSubmit, true); window.removeEventListener("purposeos:save-status", onSaveStatus); };
  }, []);
  return <small className="course-builder-save-state" aria-live="polite">{status === "saved" ? "Saved · publishing is separate" : status === "saving" ? "Saving…" : "Unsaved changes"}</small>;
}
