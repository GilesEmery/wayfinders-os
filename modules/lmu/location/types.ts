export type RelocationOpenness = "stay" | "regional" | "right-opportunity" | "very-open";
export type LocationScreen = "introduction" | "relocation" | "locations" | "reasons" | "primary" | "constraints" | "review" | "final";

export interface PrioritizedLocationReason {
  id: string;
  label: string;
  customLabel?: string;
  priority: 1 | 2 | 3;
}

export interface LocationPreference {
  id: string;
  label: string;
  prioritizedReasons: PrioritizedLocationReason[];
  /** Kept only to migrate Location responses saved before prioritized reasons. */
  reasons?: string[];
  note?: string;
  order: number;
}

export interface LocationResponse {
  relocationOpenness?: RelocationOpenness;
  stayReason?: string;
  relocationContext?: string;
  locations: LocationPreference[];
  primaryLocationId?: string;
  constraints: string[];
  constraintNote?: string;
  finalizedAt?: string;
  resumeScreen: LocationScreen;
}
