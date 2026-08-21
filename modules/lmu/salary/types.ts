export type CompensationPeriod = "annual" | "hourly";
export type SalaryTimeHorizon = "within-1" | "1-3" | "3-5" | "unknown";
export type SignificantChange = "yes" | "unsure" | "no";
export type AdvisorRelationship = "current" | "past" | "none" | "prefer-not";
export type SalaryTradeoffDomain = "skills" | "growth" | "location" | "values" | "x-factor" | "teammates" | "supervisor";
export type SalaryTradeoffChoice = "a" | "b";
export type SalaryTradeoffDifficulty = "easy" | "somewhat" | "very";
export type SalaryScreen = "introduction" | "context" | "floor" | "goal" | "range" | "realities" | "floor-check" | "tradeoff-intro" | "tradeoff" | "perspective" | "change" | "support" | "review" | "final";

export interface SalaryFutureFactor {
  id: string;
  type: string;
  customLabel?: string;
  timeHorizon?: SalaryTimeHorizon;
  note?: string;
}

export interface SalaryTradeoffOption {
  amount: number;
  alignment: "stronger" | "weaker";
  description: string;
}

export interface SalaryTradeoffScenario {
  id: string;
  domain: SalaryTradeoffDomain;
  domainLabel: string;
  contextLabels: string[];
  sourceCompletedAt?: string;
  optionA: SalaryTradeoffOption;
  optionB: SalaryTradeoffOption;
  choice?: SalaryTradeoffChoice;
  difficulty?: SalaryTradeoffDifficulty;
  why?: string;
}

export interface SalaryResponse {
  currency: string;
  compensationPeriod: CompensationPeriod;
  financialFloor?: number;
  floorContext?: string;
  fiveYearGoal?: number;
  goalContext?: string;
  futureFactors: SalaryFutureFactor[];
  tradeoffVersion?: 1;
  tradeoffInputKey?: string;
  tradeoffScenarios?: SalaryTradeoffScenario[];
  tradeoffIndex?: number;
  compensationReflection?: string;
  floorGoalConfirmed?: boolean;
  significantChange?: SignificantChange;
  significantChangeNote?: string;
  advisorRelationship?: AdvisorRelationship;
  advisorSupportNote?: string;
  finalizedAt?: string;
  resumeScreen: SalaryScreen;
}
