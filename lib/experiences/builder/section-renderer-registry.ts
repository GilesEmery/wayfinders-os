/** Source-controlled allowlist for generic curriculum Section renderers. */
export const SECTION_RENDERERS = {} as const;

export type SectionRendererKey = keyof typeof SECTION_RENDERERS;

export function isApprovedSectionRendererKey(value: string): value is SectionRendererKey {
  return Object.prototype.hasOwnProperty.call(SECTION_RENDERERS, value);
}
