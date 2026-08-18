import type { AdvisorRelationship, SalaryTimeHorizon, SignificantChange } from "./types";

export const salaryCurrencies = [
  ["USD", "US Dollar"], ["CAD", "Canadian Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"],
  ["KES", "Kenyan Shilling"], ["AUD", "Australian Dollar"], ["NZD", "New Zealand Dollar"], ["INR", "Indian Rupee"],
] as const;

export const salaryFutureFactorOptions = [
  ["education", "College / education expenses"], ["medical", "Medical expenses"], ["caregiving", "Aging relatives / caregiving"],
  ["business", "Launching a new business"], ["nonprofit", "Launching a nonprofit"], ["partner-career", "Spouse / partner career decision"],
  ["family", "Children / family changes"], ["retirement", "Retirement"], ["market-shift", "Projected industry or market shift"], ["other", "Other"],
] as const;

export const salaryTimeHorizons: Array<{ id: SalaryTimeHorizon; label: string; position: number }> = [
  { id: "within-1", label: "Within 1 year", position: 18 }, { id: "1-3", label: "1–3 years", position: 48 },
  { id: "3-5", label: "3–5 years", position: 82 }, { id: "unknown", label: "Not sure", position: 50 },
];

export const significantChangeOptions: Array<{ id: SignificantChange; title: string; copy: string }> = [
  { id: "yes", title: "Yes", copy: "I can see a meaningful financial change that needs to happen." },
  { id: "unsure", title: "Maybe / Not Sure Yet", copy: "I need to think about this more." },
  { id: "no", title: "No", copy: "My current financial direction appears reasonably aligned with what I am considering." },
];

export const advisorOptions: Array<{ id: AdvisorRelationship; title: string }> = [
  { id: "current", title: "Yes — I currently work with someone" }, { id: "past", title: "Yes — I have worked with someone in the past" },
  { id: "none", title: "No" }, { id: "prefer-not", title: "Prefer not to answer" },
];

export const futureFactorLabel = (id: string) => salaryFutureFactorOptions.find(([value]) => value === id)?.[1] ?? id;
export const timeHorizonLabel = (id?: SalaryTimeHorizon) => salaryTimeHorizons.find((item) => item.id === id)?.label ?? "";
export const significantChangeLabel = (id?: SignificantChange) => significantChangeOptions.find((item) => item.id === id)?.copy ?? "";
export const advisorLabel = (id?: AdvisorRelationship) => advisorOptions.find((item) => item.id === id)?.title ?? "";
