"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { preparePrebuiltAssessmentAction } from "@/lib/experiences/builder/prebuilt-assessment-actions";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; cohortId?: string | null };

export function EmbeddedAssessmentLauncher({ blockId, route, label }: { blockId: string; route: Route; label: string }) {
  const router = useRouter();
  const [launchPath, setLaunchPath] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  function launch() {
    if (launchPath) { setOpen(true); return; }
    setError("");
    startTransition(async () => {
      try {
        const path = await preparePrebuiltAssessmentAction(blockId, route);
        setLaunchPath(`${path}${path.includes("?") ? "&" : "?"}embeddedDisplay=modal`);
        setOpen(true);
      } catch {
        setError("Unable to open this Assessment. Please try again.");
      }
    });
  }

  function close() {
    setOpen(false);
    router.refresh();
  }

  return <>
    <button type="button" onClick={launch} disabled={pending}>{pending ? "Opening…" : label}</button>
    {error && <p className="embedded-assessment-error" role="alert">{error}</p>}
    {launchPath && <div className={`embedded-assessment-overlay${open ? " is-open" : ""}`} aria-hidden={!open}>
      <button className="embedded-assessment-backdrop" type="button" aria-label="Close Assessment" onClick={close}/>
      <section className="embedded-assessment-modal" role="dialog" aria-modal="true" aria-label="Course Assessment">
        <button className="embedded-assessment-close" type="button" onClick={close} aria-label="Close Assessment">×</button>
        <iframe src={launchPath} title="Course Assessment"/>
      </section>
    </div>}
  </>;
}
