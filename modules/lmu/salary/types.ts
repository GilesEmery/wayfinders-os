export type CompensationPeriod = "annual" | "hourly";
export type SalaryTimeHorizon = "within-1" | "1-3" | "3-5" | "unknown";
export type SignificantChange = "yes" | "unsure" | "no";
export type AdvisorRelationship = "current" | "past" | "none" | "prefer-not";
export type SalaryScreen = "introduction" | "context" | "floor" | "goal" | "range" | "realities" | "change" | "support" | "review" | "final";

export interface SalaryFutureFactor {
  id: string;
  type: string;
  customLabel?: string;
  timeHorizon?: SalaryTimeHorizon;
  note?: string;
}

export interface SalaryResponse {
  currency: string;
  compensationPeriod: CompensationPeriod;
  financialFloor?: number;
  floorContext?: string;
  fiveYearGoal?: number;
  goalContext?: string;
  futureFactors: SalaryFutureFactor[];
  significantChange?: SignificantChange;
  significantChangeNote?: string;
  advisorRelationship?: AdvisorRelationship;
  advisorSupportNote?: string;
  finalizedAt?: string;
  resumeScreen: SalaryScreen;
}
