import type { Json } from "@/lib/supabase/database.types";
import type { BlockCompletionRule, ValidationResult } from "./types";
import { validateResponseOptions, type DatabaseResponseType, type ResponseKind } from "./response-registry";
import { validateMediaConfiguration } from "./media-source";

export type BlockCategory = "content" | "media" | "interaction" | "resource" | "navigation" | "communication" | "system" | "custom";
export type BlockEditorKey = "heading" | "rich_text" | "callout" | "response" | "media" | "pdf_reader";
export type BlockPreviewKey = BlockEditorKey;
export type BlockConfiguration = Readonly<Record<string, Json | undefined>>;

export type BlockDefinition = Readonly<{
  blockType: string;
  label: string;
  description: string;
  category: BlockCategory;
  iconKey: string;
  editorKey: BlockEditorKey;
  previewKey: BlockPreviewKey;
  participantRendererKey: string;
  defaultCompletionRule: BlockCompletionRule;
  defaultConfiguration: () => BlockConfiguration;
  validateConfiguration: (input: unknown) => ValidationResult<BlockConfiguration>;
  supportsResponse: boolean;
  supportsCompletion: boolean;
  supportsResources: boolean;
  duplicable: boolean;
  availability: "available" | "experimental";
  response?: Readonly<{ responseKind: ResponseKind; responseType: DatabaseResponseType; completionSignal: "response_submitted" }>;
}>;

function object(input: unknown): Record<string, unknown> | null {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
}

function strict(input: unknown, allowed: readonly string[]): { value: Record<string, unknown> | null; errors: string[] } {
  const value = object(input);
  if (!value) return { value: null, errors: ["Block configuration must be an object."] };
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  return { value, errors: unknown.map((key) => `Unknown configuration field: ${key}.`) };
}

function text(value: unknown, name: string, max: number, required = false): { value: string; error?: string } {
  if (typeof value !== "string") return { value: "", error: required ? `${name} is required.` : `${name} must be text.` };
  const normalized = value.trim();
  if (required && !normalized) return { value: "", error: `${name} is required.` };
  if (normalized.length > max) return { value: normalized, error: `${name} must be ${max} characters or fewer.` };
  return { value: normalized };
}

function oneOf<T extends string>(value: unknown, values: readonly T[], name: string): { value: T; error?: string } {
  if (typeof value === "string" && values.includes(value as T)) return { value: value as T };
  return { value: values[0], error: `${name} must be one of: ${values.join(", ")}.` };
}

function result(value: BlockConfiguration, errors: Array<string | undefined>): ValidationResult<BlockConfiguration> {
  const compact = errors.filter((error): error is string => Boolean(error));
  return compact.length ? { ok: false, errors: compact } : { ok: true, value };
}

function heading(input: unknown): ValidationResult<BlockConfiguration> {
  const parsed = strict(input, ["text", "level", "eyebrow", "alignment"]);
  if (!parsed.value) return { ok: false, errors: parsed.errors };
  const headingText = text(parsed.value.text, "Heading text", 240, true);
  const eyebrow = text(parsed.value.eyebrow ?? "", "Eyebrow", 120);
  const level = oneOf(parsed.value.level, ["h2", "h3", "h4"] as const, "Heading level");
  const alignment = oneOf(parsed.value.alignment, ["left", "center"] as const, "Alignment");
  return result({ text: headingText.value, level: level.value, eyebrow: eyebrow.value || undefined, alignment: alignment.value }, [...parsed.errors, headingText.error, eyebrow.error, level.error, alignment.error]);
}

function richText(input: unknown): ValidationResult<BlockConfiguration> {
  const parsed = strict(input, ["title", "text"]);
  if (!parsed.value) return { ok: false, errors: parsed.errors };
  const title = text(parsed.value.title ?? "", "Text title", 200);
  const body = text(parsed.value.text, "Rich text", 12000, true);
  return result({ title: title.value, text: body.value }, [...parsed.errors, title.error, body.error]);
}

function callout(input: unknown): ValidationResult<BlockConfiguration> {
  const parsed = strict(input, ["title", "body", "treatment"]);
  if (!parsed.value) return { ok: false, errors: parsed.errors };
  const title = text(parsed.value.title ?? "", "Callout title", 180);
  const body = text(parsed.value.body, "Callout body", 4000, true);
  const treatment = oneOf(parsed.value.treatment, ["info", "emphasis", "warning", "success"] as const, "Callout treatment");
  return result({ title: title.value || undefined, body: body.value, treatment: treatment.value }, [...parsed.errors, title.error, body.error, treatment.error]);
}

function response(input: unknown): ValidationResult<BlockConfiguration> {
  const parsed = strict(input, ["placeholder", "maxLength"]);
  if (!parsed.value) return { ok: false, errors: parsed.errors };
  const placeholder = text(parsed.value.placeholder ?? "", "Placeholder", 240);
  const maxLength = Number(parsed.value.maxLength);
  const maxError = !Number.isInteger(maxLength) || maxLength < 1 || maxLength > 8000 ? "Maximum length must be a whole number from 1 to 8000." : undefined;
  return result({ placeholder: placeholder.value || undefined, maxLength: maxError ? 500 : maxLength }, [...parsed.errors, placeholder.error, maxError]);
}

function selection(input: unknown, multi: boolean): ValidationResult<BlockConfiguration> {
  const fields = multi ? ["options", "minSelections", "maxSelections"] : ["options"];
  const parsed = strict(input, fields);
  if (!parsed.value) return { ok: false, errors: parsed.errors };
  const options = validateResponseOptions(parsed.value.options);
  if (!options.ok) return { ok: false, errors: [...parsed.errors, ...options.errors] };
  if (!multi) return result({ options: options.value }, parsed.errors);
  const minSelections = Number(parsed.value.minSelections);
  const maxSelections = Number(parsed.value.maxSelections);
  const selectionErrors = [
    !Number.isInteger(minSelections) || minSelections < 0 || minSelections > options.value.length ? `Minimum selections must be between 0 and ${options.value.length}.` : undefined,
    !Number.isInteger(maxSelections) || maxSelections < 1 || maxSelections > options.value.length ? `Maximum selections must be between 1 and ${options.value.length}.` : undefined,
    Number.isInteger(minSelections) && Number.isInteger(maxSelections) && minSelections > maxSelections ? "Minimum selections cannot exceed maximum selections." : undefined,
  ];
  return result({ options: options.value, minSelections, maxSelections }, [...parsed.errors, ...selectionErrors]);
}

function booleanResponse(input: unknown): ValidationResult<BlockConfiguration> {
  const parsed = strict(input, ["affirmativeLabel"]);
  if (!parsed.value) return { ok: false, errors: parsed.errors };
  const affirmativeLabel = text(parsed.value.affirmativeLabel, "Checkbox label", 200, true);
  return result({ affirmativeLabel: affirmativeLabel.value }, [...parsed.errors, affirmativeLabel.error]);
}

function pdfReader(input: unknown): ValidationResult<BlockConfiguration> {
  const parsed = strict(input, ["title", "description", "readerMode"]);
  if (!parsed.value) return { ok: false, errors: parsed.errors };
  const title = text(parsed.value.title ?? "", "Title", 200);
  const description = text(parsed.value.description ?? "", "Description", 3000);
  const readerMode = oneOf(parsed.value.readerMode, ["reader", "slides", "fit_width"] as const, "Reader mode");
  return result({ title: title.value, description: description.value, readerMode: readerMode.value }, [...parsed.errors, title.error, description.error, readerMode.error]);
}

const definitions = [
  {
    blockType: "heading", label: "Heading", description: "Introduce a topic or divide content with a clear heading.", category: "content", iconKey: "heading", editorKey: "heading", previewKey: "heading", participantRendererKey: "heading.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ text: "New heading", level: "h2", alignment: "left" }), validateConfiguration: heading,
    supportsResponse: false, supportsCompletion: false, supportsResources: false, duplicable: true, availability: "available",
  },
  {
    blockType: "rich_text", label: "Text", description: "Add safe paragraph content without executable HTML.", category: "content", iconKey: "text", editorKey: "rich_text", previewKey: "rich_text", participantRendererKey: "rich-text.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ title: "", text: "Add your content here." }), validateConfiguration: richText,
    supportsResponse: false, supportsCompletion: false, supportsResources: false, duplicable: true, availability: "available",
  },
  {
    blockType: "callout", label: "Callout", description: "Emphasize a short message with an approved treatment.", category: "content", iconKey: "callout", editorKey: "callout", previewKey: "callout", participantRendererKey: "callout.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ body: "Add a helpful callout.", treatment: "info" }), validateConfiguration: callout,
    supportsResponse: false, supportsCompletion: false, supportsResources: false, duplicable: true, availability: "available",
  },
  {
    blockType: "structured_response", label: "Short Response", description: "Invite one concise, private participant response.", category: "interaction", iconKey: "response", editorKey: "response", previewKey: "response", participantRendererKey: "short-text-response.v1", defaultCompletionRule: "response_submitted",
    defaultConfiguration: () => ({ placeholder: "Write your response…", maxLength: 500 }), validateConfiguration: response,
    supportsResponse: true, supportsCompletion: true, supportsResources: false, duplicable: true, availability: "available", response: { responseKind: "short_text", responseType: "short_text", completionSignal: "response_submitted" },
  },
  {
    blockType: "reflection", label: "Reflection", description: "Invite a longer private reflection with draft saving.", category: "interaction", iconKey: "reflection", editorKey: "response", previewKey: "response", participantRendererKey: "long-text-response.v1", defaultCompletionRule: "response_submitted",
    defaultConfiguration: () => ({ placeholder: "Take your time and reflect…", maxLength: 8000 }), validateConfiguration: response,
    supportsResponse: true, supportsCompletion: true, supportsResources: false, duplicable: true, availability: "available", response: { responseKind: "long_text", responseType: "long_text", completionSignal: "response_submitted" },
  },
  {
    blockType: "card_selection", label: "Single Select", description: "Choose one option from an ordered set.", category: "interaction", iconKey: "single-select", editorKey: "response", previewKey: "response", participantRendererKey: "single-select-response.v1", defaultCompletionRule: "response_submitted",
    defaultConfiguration: () => ({ options: [{ key: "option-one", label: "Option one", sortOrder: 0 }, { key: "option-two", label: "Option two", sortOrder: 1 }] }), validateConfiguration: (input) => selection(input, false),
    supportsResponse: true, supportsCompletion: true, supportsResources: false, duplicable: true, availability: "available", response: { responseKind: "single_select", responseType: "choice", completionSignal: "response_submitted" },
  },
  {
    blockType: "checklist", label: "Multi Select", description: "Choose one or more options from an ordered set.", category: "interaction", iconKey: "multi-select", editorKey: "response", previewKey: "response", participantRendererKey: "multi-select-response.v1", defaultCompletionRule: "response_submitted",
    defaultConfiguration: () => ({ options: [{ key: "option-one", label: "Option one", sortOrder: 0 }, { key: "option-two", label: "Option two", sortOrder: 1 }], minSelections: 0, maxSelections: 2 }), validateConfiguration: (input) => selection(input, true),
    supportsResponse: true, supportsCompletion: true, supportsResources: false, duplicable: true, availability: "available", response: { responseKind: "multi_select", responseType: "multi_select", completionSignal: "response_submitted" },
  },
  {
    blockType: "check_in", label: "Checkbox / Yes-No", description: "Confirm a statement with one accessible checkbox.", category: "interaction", iconKey: "checkbox", editorKey: "response", previewKey: "response", participantRendererKey: "boolean-response.v1", defaultCompletionRule: "response_submitted",
    defaultConfiguration: () => ({ affirmativeLabel: "Yes, I agree" }), validateConfiguration: booleanResponse,
    supportsResponse: true, supportsCompletion: true, supportsResources: false, duplicable: true, availability: "available", response: { responseKind: "boolean", responseType: "choice", completionSignal: "response_submitted" },
  },
  {
    blockType: "video", label: "Video", description: "Embed a video from a supported external provider.", category: "media", iconKey: "video", editorKey: "media", previewKey: "media", participantRendererKey: "video.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ title: "", description: "", url: "", caption: "", alt: "", linkLabel: "" }), validateConfiguration: (input) => validateMediaConfiguration(input, "video"),
    supportsResponse: false, supportsCompletion: false, supportsResources: true, duplicable: true, availability: "available",
  },
  {
    blockType: "image", label: "Image", description: "Upload an image or choose an existing asset.", category: "media", iconKey: "image", editorKey: "media", previewKey: "media", participantRendererKey: "image.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ title: "", description: "", url: "", caption: "", alt: "Describe this image", linkLabel: "" }), validateConfiguration: (input) => validateMediaConfiguration(input, "image"),
    supportsResponse: false, supportsCompletion: false, supportsResources: true, duplicable: true, availability: "available",
  },
  {
    blockType: "pdf_reader", label: "PDF Reader", description: "Display a PDF, slide deck, workbook, or guide directly inside the Lesson.", category: "media", iconKey: "document", editorKey: "pdf_reader", previewKey: "pdf_reader", participantRendererKey: "pdf-reader.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ title: "", description: "", readerMode: "reader" }), validateConfiguration: pdfReader,
    supportsResponse: false, supportsCompletion: false, supportsResources: true, duplicable: true, availability: "available",
  },
  {
    blockType: "document", label: "Document / File", description: "Upload a PDF, document, worksheet, or other file. Participants can open or download it.", category: "resource", iconKey: "document", editorKey: "media", previewKey: "media", participantRendererKey: "document.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ title: "New Document / File", description: "", url: "", caption: "", alt: "", linkLabel: "" }), validateConfiguration: (input) => validateMediaConfiguration(input, "document"),
    supportsResponse: false, supportsCompletion: false, supportsResources: true, duplicable: true, availability: "available",
  },
  {
    blockType: "download", label: "Document / File", description: "Legacy file Block. Participants can open or download its Resource.", category: "resource", iconKey: "download", editorKey: "media", previewKey: "media", participantRendererKey: "download.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ title: "New File", description: "", url: "", caption: "", alt: "", linkLabel: "Open File" }), validateConfiguration: (input) => validateMediaConfiguration(input, "download"),
    supportsResponse: false, supportsCompletion: false, supportsResources: true, duplicable: true, availability: "available",
  },
  {
    blockType: "external_link", label: "External Link", description: "Link to an external website or resource.", category: "resource", iconKey: "link", editorKey: "media", previewKey: "media", participantRendererKey: "external-link.v1", defaultCompletionRule: "none",
    defaultConfiguration: () => ({ title: "New Resource", description: "", url: "", caption: "", alt: "", linkLabel: "Open Resource" }), validateConfiguration: (input) => validateMediaConfiguration(input, "external_link"),
    supportsResponse: false, supportsCompletion: false, supportsResources: true, duplicable: true, availability: "available",
  },
] satisfies BlockDefinition[];

const BLOCKS = new Map(definitions.map((definition) => [definition.blockType, Object.freeze(definition)]));

export const BLOCK_DEFINITIONS: readonly BlockDefinition[] = Object.freeze([...definitions]);
export const getBlockDefinition = (blockType: string): BlockDefinition | null => BLOCKS.get(blockType) ?? null;
export const isRegisteredBlockType = (blockType: string): boolean => BLOCKS.has(blockType);

export function parseBlockConfiguration(blockType: string, input: unknown): ValidationResult<BlockConfiguration> {
  const definition = getBlockDefinition(blockType);
  return definition ? definition.validateConfiguration(input) : { ok: false, errors: [`Unavailable Block type: ${blockType}.`] };
}
