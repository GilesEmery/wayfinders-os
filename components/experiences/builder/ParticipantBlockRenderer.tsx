import { getBlockDefinition } from "@/lib/experiences/builder/block-registry";
import type { BuilderContentBlock } from "@/lib/experiences/builder/types";
import type { ParticipantResponseContext } from "@/lib/experiences/builder/participant-runtime";
import { ParticipantResponseBlock } from "./ParticipantResponseBlock";
import { ParticipantMediaBlock } from "./ParticipantMediaBlock";
import { ParticipantPdfReader } from "./ParticipantPdfReader";
import { ParticipantRichText } from "./ParticipantRichText";
import type { ResolvedAsset } from "@/lib/experiences/builder/resource-assets";

function value(configuration: Record<string, unknown>, key: string) {
  return typeof configuration[key] === "string" ? configuration[key] as string : "";
}

function Unavailable({ block }: { block: BuilderContentBlock }) {
  if (block.requirement_level === "optional") return null;
  return <div className="participant-block-unavailable" role="status">Content unavailable</div>;
}

export function ParticipantBlockRenderer({ block, response, asset, route, preview = false }: { block: BuilderContentBlock; response?: ParticipantResponseContext; asset?: ResolvedAsset; route: { slug: string; moduleKey: string; lessonKey: string; sectionKey: string }; preview?: boolean }) {
  if (block.status !== "active" || block.visibility !== "visible") return null;
  const definition = getBlockDefinition(block.block_type);
  if (!definition || (block.custom_renderer_key && block.custom_renderer_key !== definition.participantRendererKey)) return <Unavailable block={block}/>;
  const parsed = definition.validateConfiguration(block.configuration);
  if (!parsed.ok) return <Unavailable block={block}/>;
  const configuration = parsed.value;

  if (definition.previewKey === "response") {
    if (!response || response.definition.response_type !== definition.response?.responseType) return <Unavailable block={block}/>;
    return <ParticipantResponseBlock context={response} route={{ ...route, blockKey: block.block_key }} configuration={configuration} responseKind={definition.response.responseKind} preview={preview}/>;
  }

  if (definition.previewKey === "heading") {
    const eyebrow = value(configuration, "eyebrow");
    const text = value(configuration, "text");
    const level = value(configuration, "level");
    return <header className={`participant-heading-block is-${value(configuration, "alignment") || "left"}`}>{eyebrow && <p>{eyebrow}</p>}{level === "h4" ? <h4>{text}</h4> : level === "h3" ? <h3>{text}</h3> : <h2>{text}</h2>}</header>;
  }
  if (definition.previewKey === "rich_text") return <ParticipantRichText title={value(configuration, "title")} text={value(configuration, "text")}/>;
  if (definition.previewKey === "pdf_reader") return <ParticipantPdfReader config={configuration} asset={asset}/>;
  if (definition.previewKey === "media") return <ParticipantMediaBlock kind={block.block_type as "video" | "image" | "document" | "download" | "external_link"} config={configuration} asset={asset}/>;
  const title = value(configuration, "title");
  return <aside className={`participant-callout-block is-${value(configuration, "treatment") || "info"}`}>{title && <strong>{title}</strong>}<p>{value(configuration, "body")}</p></aside>;
}
