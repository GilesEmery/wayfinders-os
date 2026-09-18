"use client";

import { useState, type ReactNode } from "react";

const devices = ["desktop", "tablet", "mobile"] as const;
type Device = typeof devices[number];

export function PreviewDeviceFrame({ children, contexts = [], selectedContext = "" }: { children: ReactNode; contexts?: Array<{ cohortId: string; label: string }>; selectedContext?: string }) {
  const [device, setDevice] = useState<Device>("desktop");
  return <div className="course-preview-workspace"><div className="course-preview-toolbar"><span>Preview</span><div role="group" aria-label="Preview device">{devices.map((item) => <button key={item} type="button" aria-pressed={device === item} onClick={() => setDevice(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><form className="course-preview-context" method="get"><label htmlFor="preview-context">Companion context</label><select id="preview-context" name="cohort" defaultValue={selectedContext}><option value="">Personal</option>{contexts.map((context) => <option key={context.cohortId} value={context.cohortId}>{context.label}</option>)}</select><button type="submit">Apply</button></form><small>Preview only · no participant data is loaded</small></div><div className={`course-preview-frame is-${device}`}>{children}</div></div>;
}
