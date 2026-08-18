import { LMUIcon } from "../icons/LMUIcon";
import type { LMUIconFamily, LMUIconName } from "../icons/types";

interface LMUIconBadgeProps {
  children?: React.ReactNode;
  family?: LMUIconFamily;
  name?: LMUIconName;
  active?: boolean;
  context?: "light" | "dark";
  label?: string;
}

/**
 * Shared visual frame for LMU ranking identities.
 * TODO: Reuse this badge for the six custom Holland Code icons: Realistic,
 * Social, Conventional, Artistic, Enterprising, and Investigative.
 */
export function LMUIconBadge({ children, family, name, active = false, context = "light", label }: LMUIconBadgeProps) {
  return <span aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} className={`lmu-icon-badge is-${context}${active ? " is-active" : ""}`}>{family && name ? <LMUIcon family={family} name={name} /> : children}</span>;
}
