import { LMULogo } from "./LMULogo";
import type { CSSProperties } from "react";

interface LMUExperienceBadgeProps {
  label: string;
  state?: "active" | "coming-soon";
  size?: number;
}

export function LMUExperienceBadge({ label, state = "active", size = 68 }: LMUExperienceBadgeProps) {
  return <span className={`lmu-experience-badge is-${state}`} role="img" aria-label={label} style={{ "--lmu-experience-badge-size": `${size}px` } as CSSProperties}>
    <LMULogo decorative variant="mark" />
  </span>;
}
