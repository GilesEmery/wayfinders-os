export interface PairwiseChoice {
  leftId: string;
  rightId: string;
  selectedId: string;
}

export interface PairwiseStep {
  pair?: [string, string];
  proposedIds: string[];
  complete: boolean;
  clarification: boolean;
}

function stableValue(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pairKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join("\u0000");
}

/**
 * Finds the strongest K candidates without fully sorting the remainder.
 * Each rank is the transitive maximum of the candidates still in contention.
 * The latest explicit answer for a pair is canonical, so history can be
 * truncated or amended and all inference safely derived again.
 */
export function getAdaptiveTopKStep(
  candidateIds: string[],
  history: PairwiseChoice[],
  targetCount: number,
): PairwiseStep {
  const ids = [...new Set(candidateIds)].sort((a, b) => stableValue(a) - stableValue(b) || a.localeCompare(b));
  const latest = new Map<string, PairwiseChoice>();
  history.forEach((choice) => latest.set(pairKey(choice.leftId, choice.rightId), choice));

  const wins = new Map(ids.map((id) => [id, new Set<string>()]));
  latest.forEach((choice) => {
    const loser = choice.selectedId === choice.leftId ? choice.rightId : choice.leftId;
    if (wins.has(choice.selectedId) && wins.has(loser)) wins.get(choice.selectedId)?.add(loser);
  });

  const reaches = (winner: string, loser: string) => {
    const visited = new Set<string>();
    const pending = [winner];
    while (pending.length) {
      const current = pending.pop()!;
      if (current === loser) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      wins.get(current)?.forEach((id) => pending.push(id));
    }
    return false;
  };

  const proposedIds: string[] = [];
  while (proposedIds.length < Math.min(targetCount, ids.length)) {
    const remaining = ids.filter((id) => !proposedIds.includes(id));
    const unbeaten = remaining.filter((id) =>
      !remaining.some((other) => other !== id && reaches(other, id) && !reaches(id, other)),
    );

    if (unbeaten.length === 1) {
      proposedIds.push(unbeaten[0]);
      continue;
    }

    if (unbeaten.length > 1) {
      for (let leftIndex = 0; leftIndex < unbeaten.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < unbeaten.length; rightIndex += 1) {
          const left = unbeaten[leftIndex];
          const right = unbeaten[rightIndex];
          if (!reaches(left, right) && !reaches(right, left)) {
            return { pair: [left, right], proposedIds, complete: false, clarification: false };
          }
        }
      }
    }

    // A cycle means no single transitive maximum exists. Re-ask the oldest
    // direct edge in the material cycle; a new answer replaces it for inference.
    const cycle = remaining.filter((id) => remaining.some((other) => other !== id && reaches(id, other) && reaches(other, id)));
    const clarification = history.find((choice) => cycle.includes(choice.leftId) && cycle.includes(choice.rightId));
    if (clarification) {
      return {
        pair: [clarification.leftId, clarification.rightId],
        proposedIds,
        complete: false,
        clarification: true,
      };
    }

    return { proposedIds: [...proposedIds, ...remaining].slice(0, targetCount), complete: true, clarification: false };
  }

  return { proposedIds, complete: proposedIds.length === targetCount, clarification: false };
}
