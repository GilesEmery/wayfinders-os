"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";
import type { VideoAdapterHandle } from "./YouTubeVideoAdapter";

export function getTrustedBunnyHlsUrl(videoId: string, hlsUrl: string) {
  const url = new URL(hlsUrl);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".b-cdn.net") || url.pathname !== `/${videoId}/playlist.m3u8`) {
    throw new Error("Invalid Bunny HLS URL.");
  }
  return url.toString();
}

interface BunnyVideoAdapterProps {
  hlsUrl: string;
  onAdapter(adapter: VideoAdapterHandle): void;
  onError(): void;
  onReady(): void;
  onStateChange(state: "buffering" | "ended" | "paused" | "playing"): void;
  title: string;
  videoId: string;
}

export function BunnyVideoAdapter({ hlsUrl, onAdapter, onError, onReady, onStateChange, title, videoId }: BunnyVideoAdapterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const source = getTrustedBunnyHlsUrl(videoId, hlsUrl);
    let hls: Hls | undefined;
    let ready = false;

    const adapter: VideoAdapterHandle = {
      getAvailablePlaybackRates: () => [0.75, 1, 1.25, 1.5, 2],
      getBufferedFraction: () => video.duration && video.buffered.length ? video.buffered.end(video.buffered.length - 1) / video.duration : 0,
      getCurrentTime: () => video.currentTime,
      getDuration: () => video.duration,
      getVolume: () => video.volume * 100,
      isMuted: () => video.muted,
      mute: () => { video.muted = true; },
      pause: () => video.pause(),
      play: () => { void video.play().catch(() => undefined); },
      seekTo: (seconds) => { video.currentTime = seconds; },
      setPlaybackRate: (rate) => { video.playbackRate = rate; },
      setVolume: (volume) => { video.volume = volume / 100; },
      unMute: () => { video.muted = false; },
    };
    onAdapter(adapter);

    const markReady = () => {
      if (ready) return;
      ready = true;
      onReady();
      void video.play().catch(() => undefined);
    };
    const playing = () => onStateChange("playing");
    const paused = () => onStateChange("paused");
    const ended = () => onStateChange("ended");
    const buffering = () => onStateChange("buffering");
    video.addEventListener("loadedmetadata", markReady);
    video.addEventListener("playing", playing);
    video.addEventListener("pause", paused);
    video.addEventListener("ended", ended);
    video.addEventListener("waiting", buffering);
    video.addEventListener("error", onError);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) onError(); });
    } else {
      onError();
    }

    return () => {
      video.removeEventListener("loadedmetadata", markReady);
      video.removeEventListener("playing", playing);
      video.removeEventListener("pause", paused);
      video.removeEventListener("ended", ended);
      video.removeEventListener("waiting", buffering);
      video.removeEventListener("error", onError);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [hlsUrl, onAdapter, onError, onReady, onStateChange, videoId]);

  return <video aria-label={title} className="lmu-video-native" onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play(); else video.pause(); }} playsInline preload="metadata" ref={videoRef} />;
}
