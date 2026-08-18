export type TeammatesScreen = "introduction" | "selection" | "confirmation" | "writing" | "review" | "final";

export interface SelectedPainPoint { id: string; type: "curriculum" | "custom"; label: string }
export interface CustomPainPoint { id: string; label: string }
export interface TeammateAttribute {
  id: string;
  sourcePainPointId: string;
  sourcePainPointLabel: string;
  sourceType: "curriculum" | "custom";
  positiveAttribute: string;
  description: string;
  order: number;
}
export interface TeammatesResponse {
  selectedPainPoints: SelectedPainPoint[];
  customPainPoints: CustomPainPoint[];
  attributes: TeammateAttribute[];
  finalizedAttributeIds: string[];
  finalizedAt?: string;
  resumeScreen: TeammatesScreen;
  writingIndex: number;
}
