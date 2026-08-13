import { studentPriorityMapDefinition } from "@/modules/lmu/student-priority-map/definition";
import { successStoriesDefinition } from "@/modules/lmu/success-stories/definition";
import { transferableSkillsDefinition } from "@/modules/lmu/transferable-skills/definition";
import type { LMUModuleDefinition } from "./types";

const definitions = [
  successStoriesDefinition,
  transferableSkillsDefinition,
  studentPriorityMapDefinition,
] as const;

export const moduleRegistry = new Map<string, LMUModuleDefinition>(
  definitions.map((definition) => [definition.slug, definition]),
);

export function getModuleDefinition(slug: string) {
  return moduleRegistry.get(slug);
}

export function getAllModuleDefinitions() {
  return [...moduleRegistry.values()];
}
