import type { XFactorGroup, XFactorGroupRanking, XFactorItem, XFactorRelationship } from "./types";

export function balancedGroups(ids: string[], phase: XFactorGroup["phase"], prefix: string): XFactorGroup[] {
  const groups: XFactorGroup[] = [];
  for (let index = 0; index < ids.length; index += 4) groups.push({ id: `${prefix}-${groups.length + 1}`, phase, itemIds: ids.slice(index, index + 4) });
  return groups;
}

export function localRelationships(stacks: Record<string, string[]>) {
  return Object.values(stacks).flatMap((ids) => ids.flatMap((winnerId, index) => ids.slice(index + 1).map((loserId) => ({ winnerId, loserId }))));
}

export function buildXFactorGraph(items: XFactorItem[], stacks: Record<string, string[]>, rankings: XFactorGroupRanking[]) {
  const ids = items.map((item) => item.id);
  const direct = [
    ...localRelationships(stacks),
    ...rankings.flatMap((ranking) => ranking.orderedItemIds.flatMap((winnerId, index) => ranking.orderedItemIds.slice(index + 1).map((loserId) => ({ winnerId, loserId })))),
  ];
  const wins = new Map(ids.map((id) => [id, new Set<string>()]));
  direct.forEach(({ winnerId, loserId }) => wins.get(winnerId)?.add(loserId));
  let changed = true;
  while (changed) { changed = false; ids.forEach((winner) => [...(wins.get(winner) ?? [])].forEach((middle) => wins.get(middle)?.forEach((loser) => { if (!wins.get(winner)?.has(loser)) { wins.get(winner)?.add(loser); changed = true; } }))); }
  const above = Object.fromEntries(ids.map((id) => [id, ids.filter((other) => wins.get(other)?.has(id) && !wins.get(id)?.has(other)).length]));
  const index = new Map(ids.map((id, itemIndex) => [id, itemIndex]));
  const sorted = [...ids].sort((a, b) => above[a] - above[b] || (wins.get(b)?.size ?? 0) - (wins.get(a)?.size ?? 0) || (index.get(a) ?? 0) - (index.get(b) ?? 0));
  const explicit = new Set(direct.map(({ winnerId, loserId }) => `${winnerId}\0${loserId}`));
  const relationships: XFactorRelationship[] = ids.flatMap((winnerId) => ids.filter((loserId) => loserId !== winnerId && wins.get(winnerId)?.has(loserId) && !wins.get(loserId)?.has(winnerId)).map((loserId) => ({ winnerId, loserId, inferred: !explicit.has(`${winnerId}\0${loserId}`) })));
  return { sorted, relationships, above, eliminatedFromTopFour: ids.filter((id) => above[id] >= 4), eliminatedFromTopEight: ids.filter((id) => above[id] >= 8) };
}

export function initialGlobalGroups(stacks: Record<string, string[]>) { return balancedGroups(Object.values(stacks).flatMap((ids) => ids.slice(0, 1)), "initial", "global-heads"); }

export function promotionGroups(items: XFactorItem[], stacks: Record<string, string[]>, rankings: XFactorGroupRanking[]) {
  const graph = buildXFactorGraph(items, stacks, rankings);
  const headIds = new Set(Object.values(stacks).flatMap((ids) => ids.slice(0, 1)));
  const strongHeads = graph.sorted.filter((id) => headIds.has(id)).slice(0, 4);
  const promoted = Object.values(stacks).flatMap((ids) => strongHeads.includes(ids[0]) ? ids.slice(1, 2) : []);
  return balancedGroups([...new Set(promoted)], "promotion", "stack-promotion");
}

export function deriveXFactorResults(items: XFactorItem[], stacks: Record<string, string[]>, rankings: XFactorGroupRanking[]) {
  const graph = buildXFactorGraph(items, stacks, rankings);
  return { ...graph, algorithmicTopEight: graph.sorted.filter((id) => !graph.eliminatedFromTopEight.includes(id)).slice(0, 8), algorithmicTopFour: graph.sorted.filter((id) => !graph.eliminatedFromTopFour.includes(id)).slice(0, 4) };
}

export function simulateRankedStack(candidateCount: number) {
  const items: XFactorItem[] = Array.from({ length: candidateCount }, (_, index) => ({ id: `item-${index + 1}`, questionId: `q-${index % 8}`, label: `Item ${index + 1}` }));
  const stacks = Object.fromEntries(Array.from({ length: 8 }, (_, questionIndex) => { const ids = items.filter((_, index) => index % 8 === questionIndex).map((item) => item.id); return [`q-${questionIndex}`, ids]; }));
  const truth = new Map(items.map((item, index) => [item.id, index]));
  const rankGroups = (groups: XFactorGroup[]) => groups.map((group) => ({ groupId: group.id, orderedItemIds: [...group.itemIds].sort((a, b) => (truth.get(a) ?? 0) - (truth.get(b) ?? 0)) }));
  const initial = initialGlobalGroups(stacks); const initialRankings = rankGroups(initial); const promoted = promotionGroups(items, stacks, initialRankings); const rankings = [...initialRankings, ...rankGroups(promoted)];
  const provisional = deriveXFactorResults(items, stacks, rankings); const close = candidateCount > 8 ? balancedGroups(provisional.sorted.slice(2, candidateCount <= 16 ? 6 : 10), "close", "close-boundary") : []; const finalRankings = [...rankings, ...rankGroups(close)]; const result = deriveXFactorResults(items, stacks, finalRankings);
  return { candidateCount, interactions: Object.values(stacks).filter((ids) => ids.length > 1).length + initial.length + promoted.length + close.length, derivedRelationships: result.relationships.length, eliminatedFromTopFour: result.eliminatedFromTopFour.length, eliminatedFromTopEight: result.eliminatedFromTopEight.length, topFour: result.algorithmicTopFour, topEight: result.algorithmicTopEight };
}
