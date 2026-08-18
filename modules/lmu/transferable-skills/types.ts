import type { LMUIconName } from "@/components/experiences/lmu/icons/types";
import type { ConfirmedSkillGroupRanking, DerivedSkillRelationship, GroupRankingPhase, SkillGroupAssignment, SkillRankingChoice } from "./group-ranking";

export const transferableSkillCategoryIds = ["realistic", "social", "conventional", "artistic", "enterprising", "investigative"] as const;
export type TransferableSkillCategoryId = (typeof transferableSkillCategoryIds)[number];

export interface TransferableSkillDefinition {
  id: string;
  label: string;
  categoryId: TransferableSkillCategoryId;
  canonicalKey: string;
  briefDescription?: string;
  longDescription?: string;
}

export interface TransferableSkillCategory {
  id: TransferableSkillCategoryId;
  slug: TransferableSkillCategoryId;
  title: string;
  subtitle: string;
  description: string;
  iconKey: LMUIconName;
  skills: TransferableSkillDefinition[];
}

export interface TransferableSkillEvidence {
  canonicalKey: string;
  label: string;
  categoryIds: TransferableSkillCategoryId[];
  sourceSkillIds: string[];
  storyIds: string[];
  storyCount: number;
}

export type TransferableSkillsScreen = "introduction" | TransferableSkillCategoryId | "patterns" | "ranking" | "review" | "final";

export interface TransferableSkillsResponse {
  storyIds: string[];
  categorySelections: Partial<Record<TransferableSkillCategoryId, Record<string, string[]>>>;
  visitedCategoryIds: TransferableSkillCategoryId[];
  evidence: TransferableSkillEvidence[];
  candidateSkillIds: string[];
  ranking: {
    rankingVersion: 2;
    groupAssignments: SkillGroupAssignment[];
    groupRankings: ConfirmedSkillGroupRanking[];
    draftGroupRankings: Record<string, string[]>;
    currentPhase: GroupRankingPhase | "complete";
    groupPhaseComplete: boolean;
    topCandidates: string[];
    middleCandidates: string[];
    bottomCandidates: string[];
    participantInteractions: number;
    explicitHeadToHeadComparisons: SkillRankingChoice[];
    explicitComparisons: SkillRankingChoice[];
    derivedRelationships: DerivedSkillRelationship[];
    topFiveContenders: string[];
    topTenContenders: string[];
    eliminatedFromTopFive: string[];
    eliminatedFromTopTen: string[];
    provisionalTopTen: string[];
    algorithmicTopFive: string[];
    algorithmicTopTen: string[];
    clarificationComparisons: SkillRankingChoice[];
    finalTopFive: string[];
    finalTopTen: string[];
  };
  finalTopFiveSkillIds: string[];
  finalizedAt?: string;
  resumeScreen: TransferableSkillsScreen;
}
