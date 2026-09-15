import type { Json, Tables } from "@/lib/supabase/database.types";

export type ExperienceDeliveryMode = "builder" | "custom_code" | "hybrid";
export type RequirementLevel = "required" | "recommended" | "optional";
export type SectionRendererMode = "builder" | "custom" | "hybrid" | "route_handoff";
export type SectionCompletionRule = "view" | "manual" | "all_required_blocks" | "response_submitted";
export type LayoutMode = "single_column" | "two_column" | "three_column";
export type MobileColumnBehavior = "stack" | "collapsible" | "hidden";
export type BlockStatus = "active" | "archived";
export type BlockVisibility = "visible" | "hidden";
export type BlockCompletionRule = "none" | "view" | "manual" | "interaction" | "response_submitted" | "media_complete";
export type ExperienceVersionStatus = "draft" | "published" | "archived";
export type ExperienceReleaseType = "correction" | "structural" | "major";
export type SectionProgressState = "not_started" | "in_progress" | "completed" | "skipped";
export type ThemeStatus = "draft" | "active" | "archived";
export type ThemeTypographyKey = "purpose_sans" | "purpose_editorial" | "purpose_mixed";
export type ThemeButtonVariant = "solid" | "outline" | "underlined";
export type ThemeCardTreatment = "bordered" | "flat" | "elevated";
export type ThemeNavigationTreatment = "neutral" | "accent_line" | "dark";
export type ThemeSpacingPreset = "compact" | "comfortable" | "generous";
export type ThemeCornerPreset = "square" | "subtle" | "rounded";
export type RawResponseVisibility = "participant_only" | "facilitator" | "course_admin";
export type ResultVisibility = "participant_only" | "facilitator" | "course_admin" | "group";
export type ResponseShareMode = "disabled" | "participant_opt_in" | "required";
export type GroupMode = "off" | "optional" | "required";
export type DeliveryPlanSharingScope = "private" | "organization" | "hub" | "global";
export type DeliveryPlanStatus = "draft" | "active" | "archived";
export type CohortPlanOccurrenceType = "canonical" | "repeat" | "moved";

export type ThemeColorTokens = Readonly<{ primaryAccent?: string; secondaryAccent?: string; background?: string; surface?: string; elevatedSurface?: string; text?: string; mutedText?: string; borderColor?: string }>;
export type ThemeConfiguration = Readonly<{
  logoResourceId?: string;
  coverImageResourceId?: string;
  colors?: ThemeColorTokens;
  headingTreatment?: "standard" | "uppercase" | "editorial";
  buttonVariant?: ThemeButtonVariant;
  typographyKey?: ThemeTypographyKey;
  cardTreatment?: ThemeCardTreatment;
  navigationTreatment?: ThemeNavigationTreatment;
  spacingPreset?: ThemeSpacingPreset;
  cornerPreset?: ThemeCornerPreset;
  decorativeResourceIds?: readonly string[];
}>;

export type ExperienceRecord = Tables<"experiences">;
export type ExperienceVersionRecord = Tables<"experience_versions">;
export type ExperienceModuleRecord = Tables<"experience_modules">;
export type ExperienceLessonRecord = Tables<"experience_lessons">;
export type ExperienceSectionRecord = Tables<"experience_sections">;
export type SectionLayoutRecord = Tables<"section_layouts">;
export type SectionColumnRecord = Tables<"section_columns">;
export type ContentBlockRecord = Tables<"content_blocks">;
export type SectionProgressRecord = Tables<"section_progress">;
export type ExperienceTheme = Omit<Tables<"experience_themes">, "status" | "configuration"> & { status: ThemeStatus; configuration: ThemeConfiguration };
export type DeliveryPlanTemplate = Tables<"delivery_plan_templates">;
export type DeliveryPlanTemplateModule = Tables<"delivery_plan_template_modules">;
export type DeliveryPlanTemplateSection = Tables<"delivery_plan_template_sections">;
export type CohortCoursePlan = Tables<"cohort_course_plans">;
export type CohortCoursePlanModule = Tables<"cohort_course_plan_modules">;
export type CohortCoursePlanSection = Tables<"cohort_course_plan_sections">;

export type DeliveryPlanStructure = Readonly<{
  plan: CohortCoursePlan;
  modules: ReadonlyArray<CohortCoursePlanModule & { sections: CohortCoursePlanSection[] }>;
}>;

export interface ExperienceSection extends Omit<ExperienceSectionRecord, "requirement_level" | "renderer_mode" | "completion_rule"> {
  requirement_level: RequirementLevel;
  renderer_mode: SectionRendererMode;
  completion_rule: SectionCompletionRule;
}

export interface SectionLayout extends Omit<SectionLayoutRecord, "layout_mode"> {
  layout_mode: LayoutMode;
}

export interface SectionColumn extends Omit<SectionColumnRecord, "mobile_behavior"> {
  mobile_behavior: MobileColumnBehavior;
}

export interface BuilderContentBlock extends Omit<ContentBlockRecord, "content" | "requirement_level" | "status" | "visibility" | "completion_rule"> {
  configuration: RendererConfiguration;
  requirement_level: RequirementLevel;
  status: BlockStatus;
  visibility: BlockVisibility;
  completion_rule: BlockCompletionRule;
}

export interface BuilderColumn extends SectionColumn {
  blocks: BuilderContentBlock[];
}

export interface BuilderSection extends ExperienceSection {
  layout: (SectionLayout & { columns: BuilderColumn[] }) | null;
  legacy: boolean;
}

export interface BuilderLesson extends Omit<ExperienceLessonRecord, "requirement_level"> {
  requirement_level: RequirementLevel;
  sections: BuilderSection[];
}

export interface BuilderModule extends Omit<ExperienceModuleRecord, "requirement_level"> {
  requirement_level: RequirementLevel;
  lessons: BuilderLesson[];
}

export interface BuilderCourseStructure {
  experience: ExperienceRecord & { delivery_mode: ExperienceDeliveryMode };
  version: ExperienceVersionRecord & {
    status: ExperienceVersionStatus;
    release_type: ExperienceReleaseType | null;
  };
  modules: BuilderModule[];
}

export interface SectionProgress extends Omit<SectionProgressRecord, "status"> {
  status: SectionProgressState;
}

export type RendererConfiguration = Readonly<Record<string, Json | undefined>>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };
