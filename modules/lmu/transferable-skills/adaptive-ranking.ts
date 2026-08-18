export interface SkillRankingChoice {
  leftId: string;
  rightId: string;
  selectedId: string;
}

export interface DerivedSkillRelationship {
  winnerId: string;
  loserId: string;
  inferred: boolean;
}

export interface AdaptiveTopTenStep {
  pair?: [string, string];
  phase: "primary" | "clarification" | "complete";
  reason?: "top-five-boundary" | "top-ten-boundary" | "binary-insertion" | "boundary-review" | "cycle-review";
  provisionalTopTen: string[];
  excludedIds: string[];
  processedCount: number;
  derivedRelationships: DerivedSkillRelationship[];
  topFiveContenders: string[];
  topTenContenders: string[];
  eliminatedFromTopFive: string[];
  eliminatedFromTopTen: string[];
}

function pairKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join("\u0000");
}

function buildGraph(candidateIds: string[], history: SkillRankingChoice[]) {
  const ids = [...new Set(candidateIds)];
  const latest = new Map<string, SkillRankingChoice>();
  history.forEach((choice) => latest.set(pairKey(choice.leftId, choice.rightId), choice));
  const wins = new Map(ids.map((id) => [id, new Set<string>()]));
  latest.forEach((choice) => {
    const loserId = choice.selectedId === choice.leftId ? choice.rightId : choice.leftId;
    if (wins.has(choice.selectedId) && wins.has(loserId)) wins.get(choice.selectedId)?.add(loserId);
  });

  function reaches(winnerId: string, loserId: string) {
    const pending = [winnerId];
    const visited = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!;
      if (current === loserId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      wins.get(current)?.forEach((id) => pending.push(id));
    }
    return false;
  }

  function relation(leftId: string, rightId: string) {
    const leftWins = reaches(leftId, rightId);
    const rightWins = reaches(rightId, leftId);
    if (leftWins && rightWins) return "cycle" as const;
    if (leftWins) return "left" as const;
    if (rightWins) return "right" as const;
    return "unknown" as const;
  }

  const derivedRelationships: DerivedSkillRelationship[] = [];
  ids.forEach((winnerId, winnerIndex) => ids.forEach((loserId, loserIndex) => {
    if (winnerIndex === loserIndex || !reaches(winnerId, loserId) || reaches(loserId, winnerId)) return;
    const direct = latest.get(pairKey(winnerId, loserId));
    derivedRelationships.push({ winnerId, loserId, inferred: direct?.selectedId !== winnerId });
  }));

  const aboveCounts = new Map(ids.map((id) => [id, ids.filter((other) => other !== id && reaches(other, id) && !reaches(id, other)).length]));
  return { latest, reaches, relation, derivedRelationships, aboveCounts };
}

function insertionPair(candidateId: string, ladder: string[], low: number, high: number, relation: ReturnType<typeof buildGraph>["relation"]) {
  let start = low;
  let end = high;
  while (start < end) {
    const middle = Math.floor((start + end) / 2);
    const againstId = ladder[middle];
    const known = relation(candidateId, againstId);
    if (known === "cycle") return { pair: [candidateId, againstId] as [string, string], index: start, cycle: true };
    if (known === "unknown") return { pair: [candidateId, againstId] as [string, string], index: start, cycle: false };
    if (known === "left") end = middle;
    else start = middle + 1;
  }
  return { index: start, cycle: false };
}

/**
 * Deterministically replays explicit choices into a bounded Top 10 ladder.
 * Challengers test the #5 boundary first, then #10 when needed. Known graph
 * relationships drive binary insertion, so inferred comparisons are skipped.
 */
export function getAdaptiveTopTenStep(candidateIds: string[], explicitComparisons: SkillRankingChoice[], clarificationComparisons: SkillRankingChoice[] = []): AdaptiveTopTenStep {
  const ids = [...new Set(candidateIds)];
  const graph = buildGraph(ids, explicitComparisons);
  const ladder: string[] = [];
  const excludedIds: string[] = [];

  const snapshot = (values: Partial<AdaptiveTopTenStep>): AdaptiveTopTenStep => {
    const eliminatedFromTopFive = ids.filter((id) => (graph.aboveCounts.get(id) ?? 0) >= 5);
    const eliminatedFromTopTen = ids.filter((id) => (graph.aboveCounts.get(id) ?? 0) >= 10);
    return {
      phase: "primary",
      provisionalTopTen: [...ladder],
      excludedIds: [...excludedIds],
      processedCount: 0,
      derivedRelationships: graph.derivedRelationships,
      topFiveContenders: ids.filter((id) => !eliminatedFromTopFive.includes(id)),
      topTenContenders: ids.filter((id) => !eliminatedFromTopTen.includes(id)),
      eliminatedFromTopFive,
      eliminatedFromTopTen,
      ...values,
    };
  };

  for (let candidateIndex = 0; candidateIndex < ids.length; candidateIndex += 1) {
    const candidateId = ids[candidateIndex];
    if (!ladder.length) {
      ladder.push(candidateId);
      continue;
    }

    if (ladder.length < 5) {
      const insertion = insertionPair(candidateId, ladder, 0, ladder.length, graph.relation);
      if (insertion.pair) return snapshot({ pair: insertion.pair, reason: insertion.cycle ? "cycle-review" : "binary-insertion", processedCount: candidateIndex });
      ladder.splice(insertion.index, 0, candidateId);
      continue;
    }

    const topFiveBoundary = (graph.aboveCounts.get(candidateId) ?? 0) >= 5 ? "right" : graph.relation(candidateId, ladder[4]);
    if (topFiveBoundary === "cycle" || topFiveBoundary === "unknown") {
      return snapshot({ pair: [candidateId, ladder[4]], reason: topFiveBoundary === "cycle" ? "cycle-review" : "top-five-boundary", processedCount: candidateIndex });
    }
    if (topFiveBoundary === "left") {
      const insertion = insertionPair(candidateId, ladder, 0, 5, graph.relation);
      if (insertion.pair) return snapshot({ pair: insertion.pair, reason: insertion.cycle ? "cycle-review" : "binary-insertion", processedCount: candidateIndex });
      ladder.splice(insertion.index, 0, candidateId);
      const displacedId = ladder.splice(5, 1)[0];
      const lowerInsertion = insertionPair(displacedId, ladder, 5, ladder.length, graph.relation);
      if (lowerInsertion.pair) return snapshot({ pair: lowerInsertion.pair, reason: lowerInsertion.cycle ? "cycle-review" : "binary-insertion", processedCount: candidateIndex });
      ladder.splice(lowerInsertion.index, 0, displacedId);
      if (ladder.length > 10) excludedIds.push(ladder.pop()!);
      continue;
    }

    if (ladder.length < 10) {
      const insertion = insertionPair(candidateId, ladder, 5, ladder.length, graph.relation);
      if (insertion.pair) return snapshot({ pair: insertion.pair, reason: insertion.cycle ? "cycle-review" : "binary-insertion", processedCount: candidateIndex });
      ladder.splice(insertion.index, 0, candidateId);
      continue;
    }

    if ((graph.aboveCounts.get(candidateId) ?? 0) >= 10) {
      excludedIds.push(candidateId);
      continue;
    }
    const topTenBoundary = graph.relation(candidateId, ladder[9]);
    if (topTenBoundary === "cycle" || topTenBoundary === "unknown") {
      return snapshot({ pair: [candidateId, ladder[9]], reason: topTenBoundary === "cycle" ? "cycle-review" : "top-ten-boundary", processedCount: candidateIndex });
    }
    if (topTenBoundary === "right") {
      excludedIds.push(candidateId);
      continue;
    }
    const insertion = insertionPair(candidateId, ladder, 5, 10, graph.relation);
    if (insertion.pair) return snapshot({ pair: insertion.pair, reason: insertion.cycle ? "cycle-review" : "binary-insertion", processedCount: candidateIndex });
    ladder.splice(insertion.index, 0, candidateId);
    excludedIds.push(ladder.pop()!);
  }

  // A challenger entering the Top 5 displaces the previous #5 into the lower
  // ladder. Reinsert only the retained 6–10 skills so their displayed order is
  // useful, without spending comparisons on any rank below the Top 10.
  const refinedLowerLadder: string[] = [];
  for (const candidateId of ladder.slice(5)) {
    const insertion = insertionPair(candidateId, refinedLowerLadder, 0, refinedLowerLadder.length, graph.relation);
    if (insertion.pair) return snapshot({ pair: insertion.pair, reason: insertion.cycle ? "cycle-review" : "binary-insertion", processedCount: ids.length });
    refinedLowerLadder.splice(insertion.index, 0, candidateId);
  }
  ladder.splice(5, ladder.length - 5, ...refinedLowerLadder);

  if (clarificationComparisons.length < 5) {
    const clarifiedPairs = new Set(clarificationComparisons.map((choice) => pairKey(choice.leftId, choice.rightId)));
    const boundaryPairs: Array<[string | undefined, string | undefined]> = [
      [ladder[3], ladder[5]], [ladder[4], ladder[6]], [ladder[8], excludedIds[0]], [ladder[9], excludedIds[0]],
    ];
    for (const [leftId, rightId] of boundaryPairs) {
      if (!leftId || !rightId || clarifiedPairs.has(pairKey(leftId, rightId))) continue;
      const known = graph.relation(leftId, rightId);
      const isDirect = graph.latest.has(pairKey(leftId, rightId));
      if (known === "cycle" || !isDirect) {
        return snapshot({ pair: [leftId, rightId], phase: "clarification", reason: known === "cycle" ? "cycle-review" : "boundary-review", processedCount: ids.length });
      }
    }
  }

  return snapshot({ phase: "complete", provisionalTopTen: ladder.slice(0, 10), processedCount: ids.length });
}
