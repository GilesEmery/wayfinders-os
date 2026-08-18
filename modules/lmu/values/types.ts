export type ValuesScreen = "introduction" | "selection" | "review" | "final";
export interface PathwayUValue { id: "pathwayu-1" | "pathwayu-2"; label: string; source: "pathwayu"; sourceMode: "manual" | "imported" }
export interface SelectedLMUValue { id: string; originalLabel: string; displayLabel: string; source: "lmu"; order: number }
export interface ValuesResponse { pathwayUValues: PathwayUValue[]; selectedValueIds: string[]; finalizedAt?: string; resumeScreen: ValuesScreen }
