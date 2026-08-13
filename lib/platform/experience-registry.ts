import { platformExperiences } from "@/data/platform/experiences";

export const experienceRegistry = new Map(
  platformExperiences.map((experience) => [experience.slug, experience]),
);

export function getPlatformExperiences() {
  return [...experienceRegistry.values()];
}

export function getPlatformExperience(slug: string) {
  return experienceRegistry.get(slug);
}
