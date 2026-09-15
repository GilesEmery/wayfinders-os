import Image from "next/image";
import { safeExternalUrl, videoSource, type MediaKind } from "@/lib/experiences/builder/media-source";

function value(config: Record<string, unknown>, key: string) { return typeof config[key] === "string" ? config[key] as string : ""; }

export function ParticipantMediaBlock({ kind, config }: { kind: MediaKind; config: Record<string, unknown> }) {
  const url = safeExternalUrl(value(config, "url"));
  if (!url) return <div className="participant-block-unavailable" role="status">Resource source unavailable</div>;
  const title = value(config, "title");
  const description = value(config, "description");
  const caption = value(config, "caption");
  const label = value(config, "linkLabel") || (kind === "download" ? "Open download" : kind === "document" ? "Open document" : "Visit resource");
  const external = <a href={url} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only"> (opens in a new tab)</span></a>;
  return <figure className="participant-media-block">
    {title && <strong>{title}</strong>}{description && <p>{description}</p>}
    {kind === "video" && (() => {
      const source = videoSource(url);
      if (source?.kind === "embed") return <div className="participant-media-frame"><iframe src={source.url} title={title || `${source.provider} video`} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>;
      if (source?.kind === "direct") return <video src={source.url} controls preload="metadata" aria-label={title || "Course video"}/>;
      return external;
    })()}
    {kind === "image" && <Image src={url} alt={value(config, "alt")} width={1200} height={800} unoptimized sizes="(max-width: 768px) 100vw, 70vw"/>}
    {(kind === "document" || kind === "download" || kind === "external_link") && external}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
