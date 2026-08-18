import type { CSSProperties } from "react";
import type { LMUIconName } from "../types";
import { LMUBadgeSymbol } from "./LMUBadgeSymbol";

export type LMUBadgeState = "light" | "active" | "dark" | "outlined" | "current";

export function LMUBadgeIcon({ name, state = "light", size = 48, label, context = "light" }: { name: LMUIconName; state?: LMUBadgeState; size?: number; label?: string; context?: "light" | "dark" }) {
  return <span aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} className={`lmu-badge-icon is-${state} on-${context}`} style={{ "--lmu-badge-size": `${size}px` } as CSSProperties}>
    <svg aria-hidden="true" className="lmu-badge-form" viewBox="0 0 2000 1900" preserveAspectRatio="xMidYMid meet"><path d="M55 24h1890v1606l-945 246-945-246Z"/></svg>
    <LMUBadgeSymbol name={name} />
  </span>;
}
