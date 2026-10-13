"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { persistResponseAction } from "@/lib/experiences/builder/response-actions";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null };
export function ParticipantResponseForm({ route, children }: { route: Route; children: ReactNode }) {
  const busy = useRef(false);
  const [status, setStatus] = useState<{ pending: boolean; message: string; failed: boolean }>({ pending: false, message: "", failed: false });
  useEffect(() => {
    if (!status.pending && !status.failed && status.message !== "Unsaved changes") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); };
  }, [status.pending, status.failed, status.message]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const mode = ((event.nativeEvent as SubmitEvent).submitter as HTMLElement | null)?.dataset.saveMode === "draft" ? "draft" : "final";
    const form = new FormData(event.currentTarget);
    busy.current = true;
    setStatus({ pending: true, message: "Saving…", failed: false });
    try {
      const receipt = await persistResponseAction(mode, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, form);
      setStatus({ pending: false, message: receipt.message, failed: !receipt.ok });
    } catch {
      setStatus({ pending: false, message: "Save could not be confirmed. Keep your text and try again.", failed: true });
    } finally { busy.current = false; }
  }
  return <form onSubmit={submit} onInput={() => { if (!busy.current) setStatus({ pending: false, message: "Unsaved changes", failed: false }); }} onChange={() => { if (!busy.current) setStatus({ pending: false, message: "Unsaved changes", failed: false }); }}>
    <fieldset disabled={status.pending}>{children}</fieldset>
    {status.message && <p role={status.failed ? "alert" : "status"}>{status.message}</p>}
  </form>;
}
