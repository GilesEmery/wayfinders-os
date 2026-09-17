"use client";

import { useEffect, useState } from "react";

type ColorKey = "primaryAccent" | "secondaryAccent" | "background" | "surface" | "text" | "mutedText" | "borderColor" | "completion";
type Palette = Record<ColorKey, string>;

const FIELDS: ReadonlyArray<{ key: ColorKey; label: string; description: string }> = [
  { key: "primaryAccent", label: "Primary", description: "Primary buttons and major course actions" },
  { key: "secondaryAccent", label: "Accent", description: "Selected lesson/page backgrounds and highlighted states" },
  { key: "background", label: "Background", description: "Overall course background" },
  { key: "surface", label: "Surface", description: "Content cards, panels, and surfaces" },
  { key: "text", label: "Text", description: "Primary course text" },
  { key: "mutedText", label: "Muted Text", description: "Secondary text and metadata" },
  { key: "borderColor", label: "Border", description: "Dividers and subtle outlines" },
  { key: "completion", label: "Completion", description: "Completed Navigator and progress indicators" },
];

const HEX = /^#[0-9a-f]{6}$/i;

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const values = [1, 3, 5].map((position) => parseInt(hex.slice(position, position + 2), 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
  };
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
}

export function CoursePaletteEditor({ action, initialPalette, groupLabel, headerTreatment, readingWidth, accentColor, editable }: { action: (form: FormData) => void | Promise<void>; initialPalette: Palette; groupLabel: string; headerTreatment: string; readingWidth: string; accentColor: string; editable: boolean }) {
  const [palette, setPalette] = useState(initialPalette);
  const setColor = (key: ColorKey, value: string) => setPalette((current) => ({ ...current, [key]: value.toUpperCase() }));
  useEffect(() => {
    const workspace = document.querySelector<HTMLElement>(".course-builder-workspace");
    if (workspace && HEX.test(palette.secondaryAccent)) workspace.style.setProperty("--builder-course-accent", palette.secondaryAccent);
  }, [palette.secondaryAccent]);
  const warnings = [
    HEX.test(palette.text) && HEX.test(palette.background) && contrastRatio(palette.text, palette.background) < 4.5 ? "Text on Background may be difficult to read." : null,
    HEX.test(palette.text) && HEX.test(palette.surface) && contrastRatio(palette.text, palette.surface) < 4.5 ? "Text on Surface may be difficult to read." : null,
    HEX.test(palette.primaryAccent) && Math.max(contrastRatio("#FFFFFF", palette.primaryAccent), contrastRatio("#252925", palette.primaryAccent)) < 4.5 ? "Button text may not have enough contrast with Primary." : null,
  ].filter((warning): warning is string => Boolean(warning));
  return <form action={action} className="course-palette-editor"><input type="hidden" name="group_label" value={groupLabel}/><input type="hidden" name="header_treatment" value={headerTreatment}/><input type="hidden" name="reading_width" value={readingWidth}/><input type="hidden" name="accent_color" value={accentColor}/><header className="course-color-heading"><div><span aria-hidden="true">◉</span><div><h2>Color Theme</h2><p>Define the semantic color system used throughout the learner experience.</p></div></div><strong className={warnings.length ? "is-warning" : "is-passed"}>{warnings.length ? "Review contrast" : "✓ Contrast checks passed"}</strong></header><fieldset disabled={!editable}><legend className="sr-only">Semantic Course colors</legend><div className="course-theme-colors">{FIELDS.map((field) => <label className="course-color-control" key={field.key}><span><strong>{field.label}</strong><small>{field.description}</small></span><span className="course-color-inputs"><input aria-label={`${field.label} visual color picker`} type="color" value={HEX.test(palette[field.key]) ? palette[field.key] : initialPalette[field.key]} onChange={(event) => setColor(field.key, event.target.value)}/><input aria-label={`${field.label} hex color`} name={field.key} type="text" inputMode="text" pattern="#[0-9a-fA-F]{6}" maxLength={7} value={palette[field.key]} onChange={(event) => setColor(field.key, event.target.value)} required/></span></label>)}</div>{warnings.length > 0 && <div className="course-theme-warning" role="status">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}</fieldset>{editable && <div className="course-palette-save"><div><strong>Save to this Draft</strong><small>Preview these colors before publishing. Saving here does not create a reusable Theme.</small></div><button type="submit">Save Draft Colors</button></div>}</form>;
}
