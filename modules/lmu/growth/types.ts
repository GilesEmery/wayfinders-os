import type { GrowthCategory } from "./curriculum";
export type GrowthScreen = "introduction" | "overview" | GrowthCategory | "board" | "prioritize" | "review" | "final";
export interface CustomGrowthCandidate { id: string; sourceCategory: GrowthCategory; sourceType: "custom"; displayLabel: string }
export interface GrowthCandidate { id: string; sourceCategory: GrowthCategory; sourceType: "curriculum" | "custom"; originalLabel?: string; displayLabel: string; detail?: string; detailPrompt?: string }
export interface GrowthResponse { selectedCandidateIds: string[]; customCandidates: CustomGrowthCandidate[]; candidateDetails: Record<string, string>; completedAreas: GrowthCategory[]; finalTopFiveIds: string[]; finalizedAt?: string; resumeScreen: GrowthScreen }
