export type PlatformExperienceType =
  | "guided-experience"
  | "course"
  | "training"
  | "assessment"
  | "resource"
  | "cohort";

export type PlatformExperienceStatus = "draft" | "active" | "archived";

export interface PlatformExperienceDefinition {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  type: PlatformExperienceType;
  status: PlatformExperienceStatus;
  href: string;
  brandKey: string;
  version: string;
}
