"use client";

import { useEffect, useState } from "react";

export function LifeMapPrintTrigger({ enabled }: { enabled: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { document.title = "Life-Mapping-U-Life-Map"; const timer = window.setTimeout(() => setReady(true), 300); return () => window.clearTimeout(timer); }, []);
  return <aside className="life-map-print-controls" aria-live="polite"><p>{!enabled ? "Life Map in progress. Complete all 10 waypoints to enable the final PDF." : ready ? "Your Life Map is ready." : "Preparing your Life Map..."}</p><button className="button button-primary" type="button" disabled={!enabled || !ready} onClick={() => window.print()}><span>Print / Save as PDF</span><span aria-hidden="true">↓</span></button></aside>;
}
