"use client";

import { useEffect, useSyncExternalStore } from "react";
import { hydrateFromServer } from "@/lib/experiences/lmu/storage";
import { loadServerAssessment, markRestoreFailure, saveStatusSnapshot, subscribeToSaveStatus } from "@/lib/experiences/lmu/persistence";

export function LMUPersistenceHydrator() {
  const status = useSyncExternalStore(subscribeToSaveStatus, saveStatusSnapshot, () => "idle");
  useEffect(() => {
    let active = true;
    void loadServerAssessment().then((assessment) => {
      if (active && assessment) hydrateFromServer(assessment);
    }).catch(() => { if (active) markRestoreFailure(); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (status !== "pending" && status !== "failed") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); };
  }, [status]);
  return status === "idle" ? null : <p role={status === "failed" ? "alert" : "status"} className="lmu-save-status">{status === "pending" ? "Saving your assessment… Keep this page open until saving finishes." : status === "saved" ? "Assessment changes saved." : "Cloud save or restore could not be confirmed. Your draft remains on this device. Reload to verify server progress before retrying the activity save."}</p>;
}
