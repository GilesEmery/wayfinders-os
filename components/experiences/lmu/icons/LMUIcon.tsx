import { lmuIconFamilyComponents } from "./registry";
import type { LMUIconFamily, LMUIconName } from "./types";

export function LMUIcon({ family, name, size = 24, title, className = "" }: { family: LMUIconFamily; name: LMUIconName; size?: number; title?: string; className?: string }) {
  const FamilyIcon = lmuIconFamilyComponents[family];
  return <span className={`lmu-system-icon ${className}`.trim()} style={{ height: size, width: size }}><FamilyIcon name={name} title={title} /></span>;
}
