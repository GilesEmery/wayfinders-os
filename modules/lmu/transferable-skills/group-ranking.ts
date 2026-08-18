export interface SkillRankingChoice { leftId: string; rightId: string; selectedId: string }
export interface DerivedSkillRelationship { winnerId: string; loserId: string; inferred: boolean }

export type GroupRankingPhase = "initial" | "bottom" | "top" | "middle" | "boundary" | "cutoff";

export interface SkillGroupAssignment {
  groupId: string;
  phase: GroupRankingPhase;
  skillIds: string[];
}

export interface ConfirmedSkillGroupRanking {
  groupId: string;
  orderedSkillIds: string[];
  confirmedAt: string;
}

export interface GroupRankingGraph {
  derivedRelationships: DerivedSkillRelationship[];
  sortedSkillIds: string[];
  eliminatedFromTopFive: string[];
  eliminatedFromTopTen: string[];
  knownAboveCounts: Record<string, number>;
}

export function createBalancedSkillGroups(skillIds: string[], maximumSize: number, phase: GroupRankingPhase, prefix: string = phase): SkillGroupAssignment[] {
  if (!skillIds.length) return [];
  const groupCount = Math.ceil(skillIds.length / maximumSize);
  const baseSize = Math.floor(skillIds.length / groupCount);
  const largerGroupCount = skillIds.length % groupCount;
  const sizes = Array.from({ length: groupCount }, (_, index) => baseSize + (index < largerGroupCount ? 1 : 0));
  const groups = sizes.map((_, index) => ({ groupId: `${prefix}-${index + 1}`, phase, skillIds: [] as string[] }));
  let groupIndex = 0;
  skillIds.forEach((skillId) => {
    while (groups[groupIndex].skillIds.length >= sizes[groupIndex]) groupIndex = (groupIndex + 1) % groups.length;
    groups[groupIndex].skillIds.push(skillId);
    groupIndex = (groupIndex + 1) % groups.length;
  });
  return groups;
}

export function deriveChoicesFromGroupRankings(groupRankings: ConfirmedSkillGroupRanking[]): SkillRankingChoice[] {
  return groupRankings.flatMap((ranking) => ranking.orderedSkillIds.flatMap((winnerId, winnerIndex) => ranking.orderedSkillIds.slice(winnerIndex + 1).map((loserId) => ({ leftId: winnerId, rightId: loserId, selectedId: winnerId }))));
}

export function buildGroupRankingGraph(candidateIds: string[], groupRankings: ConfirmedSkillGroupRanking[], headToHeadComparisons: SkillRankingChoice[] = []): GroupRankingGraph {
  const ids = [...new Set(candidateIds)];
  const choices = [...deriveChoicesFromGroupRankings(groupRankings), ...headToHeadComparisons];
  const wins = new Map(ids.map((id) => [id, new Set<string>()]));
  choices.forEach((choice) => {
    const loserId = choice.selectedId === choice.leftId ? choice.rightId : choice.leftId;
    if (wins.has(choice.selectedId) && wins.has(loserId)) wins.get(choice.selectedId)?.add(loserId);
  });
  let changed = true;
  while (changed) {
    changed = false;
    ids.forEach((winnerId) => [...(wins.get(winnerId) ?? [])].forEach((middleId) => wins.get(middleId)?.forEach((loserId) => {
      if (!wins.get(winnerId)?.has(loserId)) { wins.get(winnerId)?.add(loserId); changed = true; }
    })));
  }
  const knownAboveCounts = Object.fromEntries(ids.map((id) => [id, ids.filter((otherId) => wins.get(otherId)?.has(id) && !wins.get(id)?.has(otherId)).length]));
  const derivedRelationships = ids.flatMap((winnerId) => ids.filter((loserId) => loserId !== winnerId && wins.get(winnerId)?.has(loserId) && !wins.get(loserId)?.has(winnerId)).map((loserId) => ({ winnerId, loserId, inferred: !choices.some((choice) => choice.selectedId === winnerId && (choice.leftId === loserId || choice.rightId === loserId)) })));
  const candidateIndex = new Map(ids.map((id, index) => [id, index]));
  const sortedSkillIds = [...ids].sort((leftId, rightId) => knownAboveCounts[leftId] - knownAboveCounts[rightId] || (wins.get(rightId)?.size ?? 0) - (wins.get(leftId)?.size ?? 0) || (candidateIndex.get(leftId) ?? 0) - (candidateIndex.get(rightId) ?? 0));
  return { derivedRelationships, sortedSkillIds, eliminatedFromTopFive: ids.filter((id) => knownAboveCounts[id] >= 5), eliminatedFromTopTen: ids.filter((id) => knownAboveCounts[id] >= 10), knownAboveCounts };
}

export function createInitialGroupAssignments(candidateIds: string[]) {
  return createBalancedSkillGroups(candidateIds, 4, "initial", "initial-group");
}

export function createStratificationAssignments(initialAssignments: SkillGroupAssignment[], rankings: ConfirmedSkillGroupRanking[]) {
  const byGroup = new Map(rankings.map((ranking) => [ranking.groupId, ranking.orderedSkillIds]));
  const orderedGroups = initialAssignments.map((assignment) => byGroup.get(assignment.groupId) ?? []);
  const topCandidates = orderedGroups.flatMap((ids) => ids.slice(0, 1));
  const middleCandidates = orderedGroups.flatMap((ids) => ids.slice(1, -1));
  const bottomCandidates = orderedGroups.flatMap((ids) => ids.slice(-1));
  return {
    topCandidates,
    middleCandidates,
    bottomCandidates,
    assignments: [
      ...createBalancedSkillGroups(bottomCandidates, 5, "bottom", "bottom-elimination"),
      ...createBalancedSkillGroups(topCandidates, 5, "top", "top-consolidation"),
      ...createBalancedSkillGroups(middleCandidates, 4, "middle", "middle-challenge"),
    ],
  };
}

export function createBoundaryAssignments(candidateIds: string[], rankings: ConfirmedSkillGroupRanking[], headToHeadComparisons: SkillRankingChoice[] = []) {
  const graph = buildGroupRankingGraph(candidateIds, rankings, headToHeadComparisons);
  return createBalancedSkillGroups(graph.sortedSkillIds.slice(5, Math.min(candidateIds.length, 17)), 4, "boundary", "top-ten-boundary");
}

export function createCutoffAssignment(candidateIds: string[], rankings: ConfirmedSkillGroupRanking[], headToHeadComparisons: SkillRankingChoice[] = []) {
  if (candidateIds.length <= 10) return [];
  const graph = buildGroupRankingGraph(candidateIds, rankings, headToHeadComparisons);
  const skillIds = graph.sortedSkillIds.slice(7, Math.min(candidateIds.length, 12));
  return skillIds.length > 1 ? [{ groupId: "final-cutoff-1", phase: "cutoff" as const, skillIds }] : [];
}
