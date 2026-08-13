export type ModuleProgressStatus =
  | "locked"
  | "available"
  | "in-progress"
  | "completed";

export type ModuleDefinitionStatus = "draft" | "active" | "archived";

export interface LMUInstructionalMedia {
  url: string;
  provider: string;
  title: string;
  durationMinutes: number;
}

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
  media?: LMUInstructionalMedia;
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
