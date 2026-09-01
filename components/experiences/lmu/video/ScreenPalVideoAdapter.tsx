"use client";

import { useMemo, useState } from "react";

const SCREENPAL_ORIGIN = "https://go.screenpal.com";

export function getTrustedScreenPalEmbedUrl(videoId: string, embedUrl?: string) {
  const url = new URL(embedUrl ?? `${SCREENPAL_ORIGIN}/player/${encodeURIComponent(videoId)}`);
  if (url.origin !== SCREENPAL_ORIGIN || url.pathname !== `/player/${videoId}`) {
    throw new Error("Invalid ScreenPal embed URL.");
  }
  return url.toString();
}

interface ScreenPalVideoAdapterProps {
  embedUrl?: string;
  onError(): void;
  onLoad(): void;
  title: string;
  videoId: string;
}

export function ScreenPalVideoAdapter({ embedUrl, onError, onLoad, title, videoId }: ScreenPalVideoAdapterProps) {
  const [visible, setVisible] = useState(false);
  const source = useMemo(() => getTrustedScreenPalEmbedUrl(videoId, embedUrl), [embedUrl, videoId]);
  return <iframe
    allow="fullscreen"
    allowFullScreen
    className={`lmu-video-screenpal${visible ? " is-ready" : ""}`}
    onError={onError}
    onLoad={() => { setVisible(true); onLoad(); }}
    referrerPolicy="strict-origin-when-cross-origin"
    src={source}
    title={title}
  />;
}
