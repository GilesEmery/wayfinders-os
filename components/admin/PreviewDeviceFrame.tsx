"use client";

import { useState, type ReactNode } from "react";

const devices = ["desktop", "tablet", "mobile"] as const;
type Device = typeof devices[number];

export function PreviewDeviceFrame({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<Device>("desktop");
  return <div className="course-preview-workspace"><div className="course-preview-toolbar"><span>Preview</span><div role="group" aria-label="Preview device">{devices.map((item) => <button key={item} type="button" aria-pressed={device === item} onClick={() => setDevice(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><small>Visual preview · test on real devices before release</small></div><div className={`course-preview-frame is-${device}`}>{children}</div></div>;
}
