import type { CSSProperties } from "react";
import type { LMUIconName } from "./icons/types";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";

export type LMUInternalProgressStatus = "completed" | "current" | "future";

export interface LMUInternalProgressItem {
  id: string;
  label: string;
  icon: LMUIconName;
  status: LMUInternalProgressStatus;
  onSelect?: () => void;
}

export function LMUInternalProgress({ items, label }: { items: LMUInternalProgressItem[]; label: string }) {
  return (
    <ol className="lmu-internal-progress" aria-label={label} style={{ "--lmu-internal-progress-count": items.length } as CSSProperties}>
      {items.map((item) => {
        const content = <><LMUBadgeIcon name={item.icon} state={item.status === "completed" ? "active" : item.status === "current" ? "current" : "light"} size={38} /><span>{item.label}</span></>;
        return <li className={`is-${item.status}`} aria-current={item.status === "current" ? "step" : undefined} key={item.id}>{item.onSelect ? <button type="button" onClick={item.onSelect}>{content}</button> : content}</li>;
      })}
    </ol>
  );
}
