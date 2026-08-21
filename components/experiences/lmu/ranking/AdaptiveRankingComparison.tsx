import type { RankingItemVisual } from "@/lib/experiences/lmu/visuals/ranking-visuals";
import { AdaptiveRankingCard } from "./AdaptiveRankingCard";

interface AdaptiveRankingComparisonProps {
  prompt: string;
  eyebrow?: string;
  items: [RankingItemVisual, RankingItemVisual];
  expandedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId?: string | null;
  selectionLabel?: string;
  itemLabel?: string;
  expandLabel?: string;
}

export function AdaptiveRankingComparison({ prompt, eyebrow = "Compare", items, expandedIds, onToggle, onSelect, selectedId, selectionLabel = "Choose this story", itemLabel, expandLabel }: AdaptiveRankingComparisonProps) {
  function activateCard(itemId: string) {
    expandedIds.filter((expandedId) => expandedId !== itemId).forEach(onToggle);
  }

  return (
    <section className="adaptive-ranking-comparison" aria-labelledby="adaptive-ranking-prompt">
      <header className="adaptive-ranking-prompt"><p className="eyebrow">{eyebrow}</p><h2 id="adaptive-ranking-prompt">{prompt}</h2></header>
      <div className="adaptive-ranking-pair">
        <AdaptiveRankingCard item={items[0]} state={selectedId ? selectedId === items[0].id ? "choosing" : "unselected" : "default"} selectionDisabled={Boolean(selectedId)} expanded={expandedIds.includes(items[0].id)} onActivate={() => activateCard(items[0].id)} onToggle={() => onToggle(items[0].id)} onSelect={() => onSelect(items[0].id)} selectionLabel={selectionLabel} itemLabel={itemLabel} expandLabel={expandLabel} wholeCardSelection />
        <div aria-hidden="true" className="adaptive-ranking-or"><span>or</span></div>
        <AdaptiveRankingCard item={items[1]} state={selectedId ? selectedId === items[1].id ? "choosing" : "unselected" : "default"} selectionDisabled={Boolean(selectedId)} expanded={expandedIds.includes(items[1].id)} onActivate={() => activateCard(items[1].id)} onToggle={() => onToggle(items[1].id)} onSelect={() => onSelect(items[1].id)} selectionLabel={selectionLabel} itemLabel={itemLabel} expandLabel={expandLabel} wholeCardSelection />
      </div>
    </section>
  );
}
