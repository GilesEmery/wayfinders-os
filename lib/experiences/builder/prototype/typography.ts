import type { CSSProperties } from "react";
import type { ThemeTypographyKey } from "../types";

export const TEXT_STYLES = ["h1", "h2", "h3", "h4", "h5", "h6", "body", "small"] as const;
export type TextStyle = typeof TEXT_STYLES[number];
export type TypographyToken = { family: string; size: number; mobileSize: number; lineHeight: number; before: number; after: number; letterSpacing: number };
export type TypographyTokens = Record<TextStyle, TypographyToken>;
export type TypographyOverrides = Partial<Record<TextStyle, Partial<TypographyToken>>>;
export const FONT_FAMILIES = { sans: 'var(--font-sans), Arial, sans-serif', editorial: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, monospace' } as const;
const scales = [[32,26,1.2,24,14],[27,24,1.25,22,12],[23,21,1.3,20,10],[20,19,1.35,18,9],[17,17,1.4,16,8],[15,15,1.45,14,7],[16,16,1.65,0,14],[13,13,1.55,0,8]];

export function typographyTokens(theme: ThemeTypographyKey = "purpose_mixed", overrides: TypographyOverrides = {}): TypographyTokens {
  return Object.fromEntries(TEXT_STYLES.map((key,index) => {
    const [size,mobileSize,lineHeight,before,after] = scales[index];
    const family = theme === "purpose_editorial" || theme === "purpose_mixed" && index < 6 ? FONT_FAMILIES.editorial : FONT_FAMILIES.sans;
    return [key,{ family,size,mobileSize,lineHeight,before,after,letterSpacing:0,...overrides[key] }];
  })) as TypographyTokens;
}
export function typographyVariables(tokens: TypographyTokens): CSSProperties {
  return Object.fromEntries(TEXT_STYLES.flatMap(key => Object.entries(tokens[key]).map(([property,value]) => [`--pos-${key}-${property}`, typeof value === "number" && property !== "lineHeight" ? `${value}px` : value]))) as CSSProperties;
}
export function textStyle(value: unknown): TextStyle | null { return TEXT_STYLES.includes(value as TextStyle) ? value as TextStyle : null; }
