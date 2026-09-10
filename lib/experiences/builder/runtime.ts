import type { ExperienceDeliveryMode } from "./types";
import { getCustomExperience } from "./runtime-registry";

export type ExperienceRuntime =
  | { kind: "builder" }
  | { kind: "hybrid"; customAdapterKey: string | null }
  | { kind: "custom"; route: string }
  | { kind: "unavailable"; reason: string };

export function resolveExperienceRuntime(slug: string, deliveryMode: ExperienceDeliveryMode): ExperienceRuntime {
  const adapter = getCustomExperience(slug);
  if (deliveryMode === "builder") return { kind: "builder" };
  if (deliveryMode === "hybrid") return { kind: "hybrid", customAdapterKey: adapter?.key ?? null };
  if (adapter) return { kind: "custom", route: adapter.route(slug) };
  return { kind: "unavailable", reason: `No source-controlled custom adapter is registered for ${slug}.` };
}
