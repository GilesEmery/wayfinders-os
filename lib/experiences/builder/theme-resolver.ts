import type { CSSProperties } from "react";
import type { ThemeConfiguration } from "./types";
import { validateThemeConfiguration } from "./theme-validation";

export const FALLBACK_EXPERIENCE_THEME: ThemeConfiguration = Object.freeze({
  colors: { primaryAccent: "#303735", secondaryAccent: "#6b7471", background: "#f7f6f1", surface: "#ffffff", elevatedSurface: "#ffffff", text: "#252a29", mutedText: "#69716e", borderColor: "#d7d5cc" },
  typographyKey: "purpose_mixed",
  headingTreatment: "standard",
  buttonVariant: "solid",
  cardTreatment: "bordered",
  navigationTreatment: "neutral",
  spacingPreset: "comfortable",
  cornerPreset: "square",
});

export type ResolvedExperienceTheme = Readonly<{
  configuration: ThemeConfiguration;
  style: CSSProperties;
  typographyClass: string;
  headingClass: string;
  buttonClass: string;
  cardClass: string;
  navigationClass: string;
  spacingClass: string;
  cornerClass: string;
}>;

export function resolveExperienceTheme(input: unknown): ResolvedExperienceTheme {
  const parsed = validateThemeConfiguration(input);
  const configuration = parsed.ok ? { ...FALLBACK_EXPERIENCE_THEME, ...parsed.value, colors: { ...FALLBACK_EXPERIENCE_THEME.colors, ...parsed.value.colors } } : FALLBACK_EXPERIENCE_THEME;
  const colors = configuration.colors!;
  return {
    configuration,
    style: {
      "--experience-accent": colors.primaryAccent,
      "--experience-accent-secondary": colors.secondaryAccent,
      "--experience-background": colors.background,
      "--experience-surface": colors.surface,
      "--experience-surface-elevated": colors.elevatedSurface,
      "--experience-text": colors.text,
      "--experience-muted": colors.mutedText,
      "--experience-border": colors.borderColor,
    } as CSSProperties,
    typographyClass: `experience-type-${configuration.typographyKey}`,
    headingClass: `experience-heading-${configuration.headingTreatment}`,
    buttonClass: `experience-button-${configuration.buttonVariant}`,
    cardClass: `experience-card-${configuration.cardTreatment}`,
    navigationClass: `experience-navigation-${configuration.navigationTreatment}`,
    spacingClass: `experience-spacing-${configuration.spacingPreset}`,
    cornerClass: `experience-corners-${configuration.cornerPreset}`,
  };
}
