import type { Json } from "@/lib/supabase/database.types";
import type { ValidationResult } from "./types";

export type ResponseKind = "short_text" | "long_text" | "single_select" | "multi_select" | "boolean";
export type DatabaseResponseType = "short_text" | "long_text" | "choice" | "multi_select" | "structured_response";
export type ResponseOption = Readonly<{ key: string; label: string; description?: string; sortOrder: number }>;
export type ResponseData = Readonly<{ value: string | boolean }> | Readonly<{ values: string[] }>;
export type ResponseDefinition = Readonly<{ responseKind: ResponseKind; responseType: DatabaseResponseType; label: string; maxLength?: number; participantRendererKey: string; draftable: true; finalizable: true; multipleResponses: false }>;

const definitions: readonly ResponseDefinition[] = Object.freeze([
  { responseKind: "short_text", responseType: "short_text", label: "Short Text Response", maxLength: 500, participantRendererKey: "short-text-response.v1", draftable: true, finalizable: true, multipleResponses: false },
  { responseKind: "long_text", responseType: "long_text", label: "Long Text / Reflection", maxLength: 8000, participantRendererKey: "long-text-response.v1", draftable: true, finalizable: true, multipleResponses: false },
  { responseKind: "single_select", responseType: "choice", label: "Single Select", participantRendererKey: "single-select-response.v1", draftable: true, finalizable: true, multipleResponses: false },
  { responseKind: "multi_select", responseType: "multi_select", label: "Multi Select", participantRendererKey: "multi-select-response.v1", draftable: true, finalizable: true, multipleResponses: false },
  { responseKind: "boolean", responseType: "choice", label: "Checkbox / Yes-No", participantRendererKey: "boolean-response.v1", draftable: true, finalizable: true, multipleResponses: false },
]);

const RESPONSES = new Map(definitions.map((definition) => [definition.responseKind, definition]));
export const RESPONSE_DEFINITIONS = definitions;
export const getResponseDefinition = (responseKind: string) => RESPONSES.get(responseKind as ResponseKind) ?? null;

function record(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
}

export function validateResponseOptions(input: unknown): ValidationResult<ResponseOption[]> {
  if (!Array.isArray(input)) return { ok: false, errors: ["Options must be a list."] };
  if (input.length < 1 || input.length > 50) return { ok: false, errors: ["Provide between 1 and 50 options."] };
  const errors: string[] = [];
  const options = input.map((item, index): ResponseOption => {
    const option = record(item);
    const key = typeof option?.key === "string" ? option.key.trim() : "";
    const label = typeof option?.label === "string" ? option.label.trim() : "";
    const description = typeof option?.description === "string" ? option.description.trim() : "";
    const sortOrder = Number(option?.sortOrder);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) || key.length > 80) errors.push(`Option ${index + 1} needs a lowercase slug-style key of 80 characters or fewer.`);
    if (!label || label.length > 160) errors.push(`Option ${index + 1} needs a label of 160 characters or fewer.`);
    if (description.length > 300) errors.push(`Option ${index + 1} description must be 300 characters or fewer.`);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) errors.push(`Option ${index + 1} needs a non-negative whole-number order.`);
    if (option && Object.keys(option).some((field) => !["key", "label", "description", "sortOrder"].includes(field))) errors.push(`Option ${index + 1} contains an unknown field.`);
    return { key, label, description: description || undefined, sortOrder };
  });
  if (new Set(options.map((option) => option.key)).size !== options.length) errors.push("Option keys must be unique.");
  if (new Set(options.map((option) => option.sortOrder)).size !== options.length) errors.push("Option order values must be unique.");
  return errors.length ? { ok: false, errors } : { ok: true, value: [...options].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key)) };
}

export function validateResponseData(responseKind: string, input: unknown, required: boolean, configuration: unknown = {}, finalizing = false): ValidationResult<ResponseData> {
  const definition = getResponseDefinition(responseKind);
  if (!definition) return { ok: false, errors: [`Unavailable response type: ${responseKind}.`] };
  const value = record(input);
  if (!value) return { ok: false, errors: ["Response data must be an object."] };
  const config = record(configuration) ?? {};
  if (responseKind === "short_text" || responseKind === "long_text") {
    const errors = Object.keys(value).filter((key) => key !== "value").map((key) => `Unknown response field: ${key}.`);
    const text = typeof value.value === "string" ? value.value.trim() : "";
    if (required && !text) errors.push("A response is required before submission.");
    if (text.length > (definition.maxLength ?? 8000)) errors.push(`Response must be ${definition.maxLength} characters or fewer.`);
    return errors.length ? { ok: false, errors } : { ok: true, value: { value: text } };
  }
  if (responseKind === "boolean") {
    const errors = Object.keys(value).filter((key) => key !== "value").map((key) => `Unknown response field: ${key}.`);
    if (typeof value.value !== "boolean") errors.push("Checkbox response must be true or false.");
    if (required && value.value !== true) errors.push("This checkbox must be selected before submission.");
    return errors.length ? { ok: false, errors } : { ok: true, value: { value: value.value as boolean } };
  }
  const options = validateResponseOptions(config.options);
  if (!options.ok) return options;
  const allowed = new Set(options.value.map((option) => option.key));
  if (responseKind === "single_select") {
    const errors = Object.keys(value).filter((key) => key !== "value").map((key) => `Unknown response field: ${key}.`);
    const selected = typeof value.value === "string" ? value.value : "";
    if (required && !selected) errors.push("Select one option before submission.");
    if (selected && !allowed.has(selected)) errors.push("The selected option is unavailable.");
    return errors.length ? { ok: false, errors } : { ok: true, value: { value: selected } };
  }
  const errors = Object.keys(value).filter((key) => key !== "values").map((key) => `Unknown response field: ${key}.`);
  const validList = Array.isArray(value.values) && value.values.every((item) => typeof item === "string");
  const selected = validList ? value.values as string[] : [];
  if (!validList) errors.push("Multi-select response must be a list of option keys.");
  if (new Set(selected).size !== selected.length) errors.push("An option may only be selected once.");
  if (selected.some((key) => !allowed.has(key))) errors.push("One or more selected options are unavailable.");
  const canonical = options.value.filter((option) => selected.includes(option.key)).map((option) => option.key);
  const configuredMinimum = Number.isInteger(config.minSelections) ? Number(config.minSelections) : 0;
  const minimum = Math.max(configuredMinimum, required ? 1 : 0);
  const maximum = Number.isInteger(config.maxSelections) ? Number(config.maxSelections) : options.value.length;
  if (finalizing && canonical.length < minimum) errors.push(`Select at least ${minimum} option${minimum === 1 ? "" : "s"}.`);
  if (finalizing && canonical.length > maximum) errors.push(`Select no more than ${maximum} options.`);
  return errors.length ? { ok: false, errors } : { ok: true, value: { values: canonical } };
}

export function responseDataJson(value: ResponseData): Json {
  return "values" in value ? { values: value.values } : { value: value.value };
}
