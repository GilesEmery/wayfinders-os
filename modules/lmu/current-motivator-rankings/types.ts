export const motivatorIds = ["skills","location","teammates","supervisor","growth","values","x-factor","salary"] as const;
export type MotivatorId = (typeof motivatorIds)[number];
export type MotivatorRankingScreen = "introduction" | "review" | "ranking" | "final-review" | "final";
export interface MotivatorRankingResponse { orderedMotivatorIds: MotivatorId[]; topPriorityReflection?: string; finalizedAt?: string; resumeScreen: MotivatorRankingScreen }
