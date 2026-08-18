export type XFactorScreen = "introduction" | "questions" | "local-ranking" | "collection" | "global-ranking" | "close-review" | "top-eight" | "final";
export interface XFactorItem { id: string; questionId: string; label: string; localRank?: number }
export interface XFactorGroup { id: string; phase: "initial" | "promotion" | "close"; itemIds: string[] }
export interface XFactorGroupRanking { groupId: string; orderedItemIds: string[] }
export interface XFactorRelationship { winnerId: string; loserId: string; inferred: boolean }
export interface XFactorResponse {
  responsesByQuestion: Record<string, XFactorItem[]>;
  questionIndex: number;
  localRankingQuestionIndex: number;
  localDrafts: Record<string, string[]>;
  localRankings: Record<string, string[]>;
  globalGroups: XFactorGroup[];
  globalRankings: XFactorGroupRanking[];
  globalDrafts: Record<string, string[]>;
  derivedRelationships: XFactorRelationship[];
  activeStackHeads: string[];
  eliminatedFromTopFour: string[];
  eliminatedFromTopEight: string[];
  algorithmicTopFour: string[];
  algorithmicTopEight: string[];
  finalTopFour: string[];
  finalTopEight: string[];
  participantInteractions: number;
  finalizedAt?: string;
  resumeScreen: XFactorScreen;
}
