import type { ThemeButtonVariant, ThemeCardTreatment, ThemeConfiguration, ThemeCornerPreset, ThemeNavigationTreatment, ThemeSpacingPreset, ThemeTypographyKey, ValidationResult } from "./types";

const KEYS = new Set(["logoResourceId", "coverImageResourceId", "colors", "headingTreatment", "buttonVariant", "typographyKey", "cardTreatment", "navigationTreatment", "spacingPreset", "cornerPreset", "decorativeResourceIds"]);
const COLOR_KEYS = new Set(["primaryAccent", "secondaryAccent", "background", "surface", "elevatedSurface", "text", "mutedText", "borderColor"]);
const HEX = /^#[0-9a-f]{6}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPOGRAPHY = new Set<ThemeTypographyKey>(["purpose_sans", "purpose_editorial", "purpose_mixed"]);
const BUTTONS = new Set<ThemeButtonVariant>(["solid", "outline", "underlined"]);
const HEADINGS = new Set(["standard", "uppercase", "editorial"]);
const CARDS = new Set<ThemeCardTreatment>(["bordered", "flat", "elevated"]);
const NAVIGATION = new Set<ThemeNavigationTreatment>(["neutral", "accent_line", "dark"]);
const SPACING = new Set<ThemeSpacingPreset>(["compact", "comfortable", "generous"]);
const CORNERS = new Set<ThemeCornerPreset>(["square", "subtle", "rounded"]);

export function validateThemeConfiguration(input: unknown): ValidationResult<ThemeConfiguration> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["Theme configuration must be an object."] };
  const value = input as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(value)) if (!KEYS.has(key)) errors.push(`Unsupported theme setting: ${key}.`);
  for (const key of ["logoResourceId", "coverImageResourceId"] as const) if (value[key] !== undefined && (typeof value[key] !== "string" || !UUID.test(value[key]))) errors.push(`${key} must be a resource UUID.`);
  if (value.typographyKey !== undefined && !TYPOGRAPHY.has(value.typographyKey as ThemeTypographyKey)) errors.push("Unsupported typographyKey.");
  if (value.buttonVariant !== undefined && !BUTTONS.has(value.buttonVariant as ThemeButtonVariant)) errors.push("Unsupported buttonVariant.");
  if (value.headingTreatment !== undefined && !HEADINGS.has(String(value.headingTreatment))) errors.push("Unsupported headingTreatment.");
  if (value.cardTreatment !== undefined && !CARDS.has(value.cardTreatment as ThemeCardTreatment)) errors.push("Unsupported cardTreatment.");
  if (value.navigationTreatment !== undefined && !NAVIGATION.has(value.navigationTreatment as ThemeNavigationTreatment)) errors.push("Unsupported navigationTreatment.");
  if (value.spacingPreset !== undefined && !SPACING.has(value.spacingPreset as ThemeSpacingPreset)) errors.push("Unsupported spacingPreset.");
  if (value.cornerPreset !== undefined && !CORNERS.has(value.cornerPreset as ThemeCornerPreset)) errors.push("Unsupported cornerPreset.");
  if (value.colors !== undefined) {
    if (!value.colors || typeof value.colors !== "object" || Array.isArray(value.colors)) errors.push("colors must be an object.");
    else for (const [key, color] of Object.entries(value.colors)) {
      if (!COLOR_KEYS.has(key)) errors.push(`Unsupported color token: ${key}.`);
      if (typeof color !== "string" || !HEX.test(color)) errors.push(`${key} must be a six-digit hex color.`);
    }
  }
  if (value.decorativeResourceIds !== undefined && (!Array.isArray(value.decorativeResourceIds) || value.decorativeResourceIds.some((id) => typeof id !== "string" || !UUID.test(id)))) errors.push("decorativeResourceIds must contain resource UUIDs.");
  return errors.length ? { ok: false, errors } : { ok: true, value: value as ThemeConfiguration };
}
