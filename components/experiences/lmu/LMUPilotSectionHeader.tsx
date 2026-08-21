import type { RefObject } from "react";
import type { LMUIconName } from "./icons/types";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";
import { LMUScreenHeading } from "./LMUScreenHeading";

interface LMUPilotSectionHeaderProps {
  icon: LMUIconName;
  iconLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  className?: string;
}

export function LMUPilotSectionHeader({ icon, iconLabel, eyebrow, title, description, headingRef, className = "" }: LMUPilotSectionHeaderProps) {
  return (
    <div className={`lmu-pilot-section-heading ${className}`.trim()}>
      <LMUBadgeIcon name={icon} state="current" size={72} label={iconLabel} />
      <LMUScreenHeading eyebrow={eyebrow} title={title} description={description} headingRef={headingRef} hideIcon />
    </div>
  );
}
