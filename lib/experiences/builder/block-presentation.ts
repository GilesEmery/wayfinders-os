export type TextSize = "h1" | "h2" | "h3" | "h4";
export type BlockPresentation = { header: string; body: string; headerSize: TextSize; bodySize: TextSize; placement: "above" | "between" | "below" };
export function readBlockPresentation(settings: unknown): BlockPresentation | null {
  if (!settings || typeof settings !== "object") return null;
  const value = (settings as Record<string, unknown>).textPresentation;
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const size = (value: unknown, fallback: TextSize): TextSize => ["h1", "h2", "h3", "h4"].includes(String(value)) ? value as TextSize : fallback;
  return { header: typeof p.header === "string" ? p.header : "", body: typeof p.body === "string" ? p.body : "", headerSize: size(p.headerSize, "h3"), bodySize: size(p.bodySize, "h4"), placement: p.placement === "above" || p.placement === "between" ? p.placement : "below" };
}
export function presentationSettings(current: unknown, form: FormData) {
  const settings = current && typeof current === "object" && !Array.isArray(current) ? current as Record<string, unknown> : {};
  if (!form.has("presentation_header")) return settings;
  const header = String(form.get("presentation_header") ?? "");
  const body = String(form.get("presentation_body") ?? "");
  if (header.length > 12000 || body.length > 12000) throw new Error("Each text area must be at most 12,000 characters.");
  const textPresentation = readBlockPresentation({ textPresentation: { header, body, headerSize: form.get("presentation_header_size"), bodySize: form.get("presentation_body_size"), placement: form.get("presentation_placement") } });
  return { ...settings, textPresentation };
}
