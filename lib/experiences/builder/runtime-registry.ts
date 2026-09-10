import type { RendererConfiguration, ValidationResult } from "./types";

export type RuntimeDefinition = Readonly<{
  key: string;
  description: string;
  validateConfiguration: (input: unknown) => ValidationResult<RendererConfiguration>;
}>;

export type CustomExperienceAdapter = RuntimeDefinition & Readonly<{ route: (slug: string) => string }>;
export type RouteHandoffAdapter = RuntimeDefinition & Readonly<{ route: (configuration: RendererConfiguration) => string }>;

const customExperiences = new Map<string, CustomExperienceAdapter>();
const sectionRenderers = new Map<string, RuntimeDefinition>();
const blockRenderers = new Map<string, RuntimeDefinition>();
const routeHandoffs = new Map<string, RouteHandoffAdapter>();

function register<T extends RuntimeDefinition>(registry: Map<string, T>, definition: T): void {
  if (!definition.key.trim()) throw new Error("Runtime registry keys cannot be empty.");
  if (registry.has(definition.key)) throw new Error(`Runtime key already registered: ${definition.key}`);
  registry.set(definition.key, Object.freeze(definition));
}

export const registerCustomExperience = (definition: CustomExperienceAdapter) => register(customExperiences, definition);
export const registerSectionRenderer = (definition: RuntimeDefinition) => register(sectionRenderers, definition);
export const registerBlockRenderer = (definition: RuntimeDefinition) => register(blockRenderers, definition);
export const registerRouteHandoff = (definition: RouteHandoffAdapter) => register(routeHandoffs, definition);

export const getCustomExperience = (key: string) => customExperiences.get(key) ?? null;
export const getSectionRenderer = (key: string) => sectionRenderers.get(key) ?? null;
export const getBlockRenderer = (key: string) => blockRenderers.get(key) ?? null;
export const getRouteHandoff = (key: string) => routeHandoffs.get(key) ?? null;

export function validateObjectConfiguration(input: unknown): ValidationResult<RendererConfiguration> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["Configuration must be a JSON object."] };
  return { ok: true, value: input as RendererConfiguration };
}

// Compatibility registration only: the existing LMU route and implementation remain untouched.
registerCustomExperience({
  key: "life-mapping-u",
  description: "Existing custom-coded Life Mapping U experience.",
  validateConfiguration: validateObjectConfiguration,
  route: () => "/experiences/life-mapping-u",
});
