import { transferableSkillCategories } from "./curriculum";
import type { TransferableSkillCategoryId, TransferableSkillEvidence, TransferableSkillsResponse } from "./types";

export function calculateTransferableSkillEvidence(storyIds: string[], categorySelections: TransferableSkillsResponse["categorySelections"]) {
  const finalizedStoryIds = new Set(storyIds);
  const aggregated = new Map<string, TransferableSkillEvidence>();

  transferableSkillCategories.forEach((category) => category.skills.forEach((skill) => {
    const selectedStoryIds = (categorySelections[category.id]?.[skill.id] ?? []).filter((id) => finalizedStoryIds.has(id));
    const existing = aggregated.get(skill.canonicalKey) ?? {
      canonicalKey: skill.canonicalKey, label: skill.label, categoryIds: [], sourceSkillIds: [], storyIds: [], storyCount: 0,
    };
    existing.categoryIds = [...new Set([...existing.categoryIds, skill.categoryId])] as TransferableSkillCategoryId[];
    existing.sourceSkillIds = [...new Set([...existing.sourceSkillIds, skill.id])];
    existing.storyIds = [...new Set([...existing.storyIds, ...selectedStoryIds])];
    existing.storyCount = existing.storyIds.length;
    aggregated.set(skill.canonicalKey, existing);
  }));

  return [...aggregated.values()].filter((item) => item.storyCount > 0);
}

export function buildTransferableSkillCandidatePool(evidence: TransferableSkillEvidence[]) {
  const byCount = (count: number) => evidence.filter((item) => item.storyCount === count).map((item) => item.canonicalKey);
  const three = byCount(3);
  if (three.length >= 10) return three;
  const two = byCount(2);
  if (three.length + two.length >= 10) return [...three, ...two];
  return [...three, ...two, ...byCount(1)];
}
