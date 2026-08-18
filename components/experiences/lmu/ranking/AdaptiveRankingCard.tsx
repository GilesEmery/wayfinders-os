import type { RankingItemVisual } from "@/lib/experiences/lmu/visuals/ranking-visuals";
import { MapAccent } from "../MapAccent";
import { AdaptiveRankingIcon } from "./AdaptiveRankingIcon";

interface AdaptiveRankingCardProps {
  item: RankingItemVisual;
  expanded: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  selectionLabel?: string;
  state?: "default" | "selected" | "unselected" | "choosing";
  rank?: number;
  actions?: React.ReactNode;
  compact?: boolean;
  onActivate?: () => void;
  selectionDisabled?: boolean;
  itemLabel?: string;
  expandLabel?: string;
  selectedStateLabel?: string;
}

export function AdaptiveRankingCard({
  item,
  expanded,
  onToggle,
  onSelect,
  selectionLabel = "Choose this item",
  state = "default",
  rank,
  actions,
  compact = false,
  onActivate,
  selectionDisabled = false,
  itemLabel = "Story",
  expandLabel = "Story",
  selectedStateLabel = "Top story",
}: AdaptiveRankingCardProps) {
  return (
    <article className={`adaptive-ranking-card is-${state}${compact ? " is-compact" : ""}${onSelect ? " is-selectable" : ""}`} onPointerEnter={onActivate} onFocusCapture={onActivate}>
      <MapAccent className="adaptive-ranking-map" opacity={0.045} position="right" variant={2} />
      <div className="adaptive-ranking-card-main">
        {typeof rank === "number" && <span className="adaptive-ranking-rank">{String(rank).padStart(2, "0")}</span>}
        {state === "selected" && <span className="adaptive-ranking-state">{selectedStateLabel}</span>}
        <div className="adaptive-ranking-identity">
          <AdaptiveRankingIcon iconKey={item.iconKey} active={state === "selected"} />
          <div><span>{itemLabel}</span><p>{item.metadata || "Life stage not specified"}</p></div>
        </div>
        <div className="adaptive-ranking-heading">
          <h3>{item.title}</h3>
        </div>
        {onSelect && <button className="adaptive-ranking-select" type="button" disabled={selectionDisabled} onClick={onSelect}><span>{selectionLabel}</span><span aria-hidden="true">→</span></button>}
        <button className="adaptive-ranking-expand" type="button" aria-expanded={expanded} onClick={onToggle}>{expanded ? `− Hide ${expandLabel}` : `+ View ${expandLabel}`}</button>
        <div className="adaptive-ranking-detail" data-expanded={expanded} aria-hidden={!expanded}>
          <div inert={expanded ? undefined : true}><p>{item.detailLabel}</p><div>{item.detailContent}</div></div>
        </div>
      </div>
      {actions && <div className="adaptive-ranking-actions">{actions}</div>}
    </article>
  );
}
