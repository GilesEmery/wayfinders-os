import { currentMotivatorRankingsDefinition } from "@/modules/lmu/current-motivator-rankings/definition";
import { growthDefinition } from "@/modules/lmu/growth/definition";
import { locationDefinition } from "@/modules/lmu/location/definition";
import { salaryDefinition } from "@/modules/lmu/salary/definition";
import { studentPriorityMapDefinition } from "@/modules/lmu/student-priority-map/definition";
import { successStoriesDefinition } from "@/modules/lmu/success-stories/definition";
import { supervisorDefinition } from "@/modules/lmu/supervisor/definition";
import { teammatesDefinition } from "@/modules/lmu/teammates/definition";
import { transferableSkillsDefinition } from "@/modules/lmu/transferable-skills/definition";
import { valuesDefinition } from "@/modules/lmu/values/definition";
import { xFactorDefinition } from "@/modules/lmu/x-factor/definition";
import { yourLifeMapDefinition } from "@/modules/lmu/your-life-map/definition";
import type { LMUModuleDefinition } from "./types";

const definitions = [
  successStoriesDefinition,
  transferableSkillsDefinition,
  teammatesDefinition,
  supervisorDefinition,
  valuesDefinition,
  growthDefinition,
  locationDefinition,
  xFactorDefinition,
  salaryDefinition,
  currentMotivatorRankingsDefinition,
  yourLifeMapDefinition,
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
