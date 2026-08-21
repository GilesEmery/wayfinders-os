import type { RefObject } from "react";
import type { LMUIconName } from "./icons/types";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";

interface LMUScreenHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  className?: string;
  icon?: LMUIconName;
  hideIcon?: boolean;
}

function sectionIcon(eyebrow: string): LMUIconName | undefined {
  const label = eyebrow.toLowerCase();
  if (label.includes("success stor")) return "story";
  if (label.includes("transferable skill")) return "realistic";
  if (label.includes("teammate")) return "teammates";
  if (label.includes("supervisor")) return "supervisor";
  if (label.includes("value")) return "values";
  if (label.includes("growth")) return "growth";
  if (label.includes("location")) return "location";
  if (label.includes("x-factor")) return "x-factor";
  if (label.includes("salary")) return "salary";
  if (label.includes("motivator")) return "motivators";
  return undefined;
}

export function LMUScreenHeading({ eyebrow, title, description, headingRef, className = "", icon, hideIcon = false }: LMUScreenHeadingProps) {
  const resolvedIcon = icon ?? sectionIcon(eyebrow);
  return (
    <div className={`lmu-screen-heading-frame${resolvedIcon && !hideIcon ? " has-icon" : " is-iconless"} ${className}`.trim()}>
      {resolvedIcon && !hideIcon && <LMUBadgeIcon name={resolvedIcon} state="current" size={72} label={eyebrow} />}
      <header className="lmu-screen-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
        {description && <p>{description}</p>}
      </header>
    </div>
  );
}
