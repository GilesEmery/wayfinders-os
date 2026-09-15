import type { BlockConfiguration } from "./block-registry";
import type { ValidationResult } from "./types";

export type MediaKind = "video" | "image" | "document" | "download" | "external_link";

export function safeExternalUrl(input: unknown): string | null {
  if (typeof input !== "string" || !input.trim() || input.length > 2048) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

function field(value: unknown, label: string, max: number, required = false): { value: string; error?: string } {
  if (typeof value !== "string") return { value: "", error: `${label} must be text.` };
  const normalized = value.trim();
  if (required && !normalized) return { value: "", error: `${label} is required.` };
  if (normalized.length > max) return { value: normalized, error: `${label} must be ${max} characters or fewer.` };
  return { value: normalized };
}

export function validateMediaConfiguration(input: unknown, kind: MediaKind): ValidationResult<BlockConfiguration> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["Media configuration must be an object."] };
  const data = input as Record<string, unknown>;
  const allowed = ["title", "description", "url", "caption", "alt", "linkLabel"];
  const errors = Object.keys(data).filter((key) => !allowed.includes(key)).map((key) => `Unknown configuration field: ${key}.`);
  const title = field(data.title ?? "", "Title", 200, kind === "document" || kind === "download" || kind === "external_link");
  const description = field(data.description ?? "", "Description", 3000);
  const caption = field(data.caption ?? "", "Caption", 1000);
  const alt = field(data.alt ?? "", "Image alt text", 300, kind === "image");
  const linkLabel = field(data.linkLabel ?? "", "Action label", 120);
  errors.push(...[title.error, description.error, caption.error, alt.error, linkLabel.error].filter((error): error is string => Boolean(error)));
  const source = data.url ?? "";
  const url = safeExternalUrl(source);
  // An empty source is allowed on a newly added Draft Block, but cannot publish
  // as required participant Content. Unsafe nonempty protocols are always rejected.
  if (typeof source !== "string" || (source.trim() && !url)) errors.push("Source must be a valid HTTPS URL without embedded credentials.");
  const value = { title: title.value, description: description.value, url: url ?? "", caption: caption.value, alt: alt.value, linkLabel: linkLabel.value };
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export function videoSource(urlValue: string): { kind: "embed" | "direct" | "link"; url: string; provider: string } | null {
  const safe = safeExternalUrl(urlValue);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtube.com" || host === "youtube.com" || host === "m.youtube.com") {
    const id = host === "youtu.be" ? url.pathname.slice(1) : url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : url.searchParams.get("v");
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return { kind: "embed", url: `https://www.youtube-nocookie.com/embed/${id}`, provider: "YouTube" };
  }
  if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
    if (id) return { kind: "embed", url: `https://player.vimeo.com/video/${id}`, provider: "Vimeo" };
  }
  if ((host === "screenpal.com" || host === "go.screenpal.com") && /^\/player\/[a-zA-Z0-9]+\/?$/.test(url.pathname)) {
    return { kind: "embed", url: `https://screenpal.com${url.pathname}`, provider: "ScreenPal" };
  }
  if (/\.(?:mp4|webm|ogg)$/i.test(url.pathname)) return { kind: "direct", url: safe, provider: "Hosted video" };
  return { kind: "link", url: safe, provider: host };
}
