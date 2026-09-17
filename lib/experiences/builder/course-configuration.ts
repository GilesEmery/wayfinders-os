export const GROUP_LABELS = ["module", "week", "section", "unit", "stage", "session", "chapter", "phase"] as const;
export type GroupLabel = typeof GROUP_LABELS[number];
export type CourseConfiguration = Readonly<{
  terminology: Readonly<{ group_label: GroupLabel }>;
  appearance: Readonly<{ header_treatment: "minimal" | "image" | "color"; reading_width: "focused" | "standard" | "wide"; accent_color: string | null; cover_resource_id: string | null; logo_resource_id: string | null; colors: Readonly<Record<"primaryAccent" | "secondaryAccent" | "background" | "surface" | "text" | "mutedText" | "borderColor" | "completion", string | null>> }>;
}>;

export const COURSE_COLOR_FIELDS = [["primaryAccent", "Primary"], ["secondaryAccent", "Accent"], ["background", "Background"], ["surface", "Surface"], ["text", "Text"], ["mutedText", "Muted Text"], ["borderColor", "Border"], ["completion", "Completion / Success"]] as const;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeCourseConfiguration(value: unknown): CourseConfiguration {
  const root = object(value);
  const terminology = object(root.terminology);
  const appearance = object(root.appearance);
  const group_label = GROUP_LABELS.includes(terminology.group_label as GroupLabel) ? terminology.group_label as GroupLabel : "module";
  const header_treatment = ["minimal", "image", "color"].includes(String(appearance.header_treatment)) ? appearance.header_treatment as CourseConfiguration["appearance"]["header_treatment"] : "minimal";
  const reading_width = ["focused", "standard", "wide"].includes(String(appearance.reading_width)) ? appearance.reading_width as CourseConfiguration["appearance"]["reading_width"] : "standard";
  const accent_color = typeof appearance.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(appearance.accent_color) ? appearance.accent_color : null;
  const cover_resource_id = typeof appearance.cover_resource_id === "string" && /^[0-9a-f-]{36}$/i.test(appearance.cover_resource_id) ? appearance.cover_resource_id : null;
  const logo_resource_id = typeof appearance.logo_resource_id === "string" && /^[0-9a-f-]{36}$/i.test(appearance.logo_resource_id) ? appearance.logo_resource_id : null;
  const inputColors = object(appearance.colors);
  const colors = Object.fromEntries(COURSE_COLOR_FIELDS.map(([key]) => [key, typeof inputColors[key] === "string" && /^#[0-9a-f]{6}$/i.test(inputColors[key] as string) ? inputColors[key] as string : null])) as CourseConfiguration["appearance"]["colors"];
  return { terminology: { group_label }, appearance: { header_treatment, reading_width, accent_color, cover_resource_id, logo_resource_id, colors } };
}

export function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => { const values = [1, 3, 5].map((position) => parseInt(hex.slice(position, position + 2), 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return values[0] * .2126 + values[1] * .7152 + values[2] * .0722; };
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
}

export function groupLabel(value: GroupLabel, plural = false): string {
  const label = value[0].toUpperCase() + value.slice(1);
  return plural ? `${label}s` : label;
}

export function accentInk(color: string): "#18231d" | "#ffffff" {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return "#ffffff";
  const rgb = [1, 3, 5].map((position) => parseInt(color.slice(position, position + 2), 16) / 255);
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return luminance > 0.42 ? "#18231d" : "#ffffff";
}
