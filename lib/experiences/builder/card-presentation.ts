import { normalizeCourseConfiguration } from './course-configuration';

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

// Card artwork belongs to the live catalog, not to a participant's curriculum
// version. Only explicitly saved image overrides cross that boundary.
export function cardPresentationConfiguration(version: unknown, live: unknown) {
  const base = normalizeCourseConfiguration(version ?? live);
  const root = object(live), card = object(root.card), appearance = object(root.appearance);
  return {
    ...base,
    card: { ...base.card, ...(Object.hasOwn(card, 'image_resource_id') ? { image_resource_id: normalizeCourseConfiguration(live).card.image_resource_id } : {}) },
    appearance: { ...base.appearance, ...(Object.hasOwn(appearance, 'cover_resource_id') ? { cover_resource_id: normalizeCourseConfiguration(live).appearance.cover_resource_id } : {}) },
  };
}
