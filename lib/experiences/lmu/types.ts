export type ModuleProgressStatus =
  | "locked"
  | "available"
  | "in-progress"
  | "completed";

export type ModuleDefinitionStatus = "draft" | "active" | "archived";
export type LMUModuleKind = "module" | "result";

export interface LMUModuleStage {
  id: string;
  title: string;
}

interface LMUInstructionalMediaBase {
  title: string;
  posterTitle?: string;
  posterBadge?: import("@/components/experiences/lmu/icons/types").LMUIconName;
  poster?: string;
  captions?: boolean;
  description?: string;
  durationMinutes?: number;
}

export type LMUInstructionalMedia = LMUInstructionalMediaBase & (
  | { provider: "youtube"; videoId: string }
  | { provider: "screenpal"; videoId: string; embedUrl?: string }
  | { provider: "bunny"; libraryId: string; videoId: string; hlsUrl: string }
);

export interface LMUModuleDefinition {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  estimatedMinutes: number;
  version: string;
  status: ModuleDefinitionStatus;
  requiredModules: string[];
  allowedExperiences: string[];
  kind?: LMUModuleKind;
  stages?: LMUModuleStage[];
  resultSections?: string[];
  instructionalMedia?: Record<string, LMUInstructionalMedia>;
}

export interface LMUPostExperienceResourceDefinition {
  id: string;
  title: string;
  description: string;
  status: "planned" | "available";
  format: "pdf";
  includedExercises: string[];
  downloadUrl?: string;
}

export interface LMUExperienceModule {
  moduleId: string;
}

export interface LMUExperienceDefinition {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  modules: LMUExperienceModule[];
  version: string;
}

export interface ParticipantModuleProgress {
  moduleId: string;
  status: ModuleProgressStatus;
  startedAt?: string;
  completedAt?: string;
  responses: Record<string, unknown>;
  derivedResults: Record<string, unknown>;
  result?: LMUModuleResult;
}

export interface LMUModuleResult {
  moduleId: string;
  completedAt?: string;
  summary?: string;
  highlights: string[];
  rankedItems: Array<{ id: string; label: string; rank: number }>;
  structuredData: Record<string, unknown>;
}

export interface ParticipantExperienceProgress {
  experienceId: string;
  startedAt?: string;
  completedAt?: string;
  moduleProgress: ParticipantModuleProgress[];
}

export interface ProgressSummary {
  completed: number;
  total: number;
  percentage: number;
}
