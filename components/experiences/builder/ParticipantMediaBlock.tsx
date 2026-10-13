import {ExternalResourceCard} from "./ExternalResourceCard";
import {PdfResourceCard} from "./PdfResourceCard";
import Image from "next/image";
import { safeExternalUrl, videoSource, type MediaKind } from "@/lib/experiences/builder/media-source";
import type { ResolvedAsset } from "@/lib/experiences/builder/resource-assets";

function value(config: Record<string, unknown>, key: string) { return typeof config[key] === "string" ? config[key] as string : ""; }

function fileType(asset: ResolvedAsset) {
  const extension = asset.originalFilename?.match(/\.([a-z0-9]{1,10})$/i)?.[1];
  if (extension) return extension.toUpperCase();
  if (asset.mimeType === "application/pdf") return "PDF";
  return asset.mimeType?.split("/").pop()?.toUpperCase() || "FILE";
}

function fileSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ParticipantMediaBlock({ kind, config, asset }: { kind: MediaKind; config: Record<string, unknown>; asset?: ResolvedAsset }) {
  const url = asset?.url ?? safeExternalUrl(value(config, "url"));
  if (!url) return <div className="participant-block-unavailable" role="status">Resource source unavailable</div>;
  const title = value(config, "title") || (config.suppressAssetText ? "" : asset?.title) || "";
  const description = value(config, "description") || (config.suppressAssetText ? "" : asset?.description) || "";
  const caption = value(config, "caption");
  if(kind==="external_link")return <ExternalResourceCard title={title} url={url} subtext={description} label={value(config,"linkLabel")||"Open"}/>;
  const label = value(config, "linkLabel") || "Visit resource";
  const external = <a href={url} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only"> (opens in a new tab)</span></a>;
  if(kind==="document"||kind==="download")return <PdfResourceCard icon="folder" title={title||asset?.originalFilename||"Course file"} description={description} metadata={asset?[asset.originalFilename,fileType(asset),fileSize(asset.sizeBytes)].filter(Boolean).join(" · "):undefined} url={url} downloadUrl={asset?.downloadUrl} allowOpenInNewTab allowDownload={Boolean(asset?.downloadUrl)}/>;
  return <figure className="participant-media-block">
    {title && <strong>{title}</strong>}{description && <p>{description}</p>}
    {kind === "video" && (() => {
      const source = videoSource(url);
      if (source?.kind === "embed") return <div className="participant-media-frame"><iframe src={source.url} title={title || `${source.provider} video`} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>;
      if (source?.kind === "direct") return <video src={source.url} controls preload="metadata" aria-label={title || "Course video"}/>;
      return external;
    })()}
    {kind === "image" && <Image src={url} alt={value(config, "alt")} width={1200} height={800} unoptimized sizes="(max-width: 768px) 100vw, 70vw"/>}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
