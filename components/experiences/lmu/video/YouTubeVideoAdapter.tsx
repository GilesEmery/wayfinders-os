"use client";

import { useEffect, useRef } from "react";
import { loadYouTubeIframeApi, type YouTubePlayer } from "./youtube-api";

export interface VideoAdapterHandle {
  getAvailablePlaybackRates(): number[];
  getBufferedFraction(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getVolume(): number;
  isMuted(): boolean;
  mute(): void;
  pause(): void;
  play(): void;
  seekTo(seconds: number): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  unMute(): void;
}

interface YouTubeVideoAdapterProps {
  onAdapter(adapter: VideoAdapterHandle): void;
  onError(): void;
  onReady(): void;
  onStateChange(state: "buffering" | "ended" | "paused" | "playing"): void;
  title: string;
  videoId: string;
}

export function YouTubeVideoAdapter({ onAdapter, onError, onReady, onStateChange, title, videoId }: YouTubeVideoAdapterProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let player: YouTubePlayer | undefined;
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      player = new YT.Player(mountRef.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 0, controls: 1, enablejsapi: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            onAdapter({
              getAvailablePlaybackRates: () => target.getAvailablePlaybackRates(),
              getBufferedFraction: () => target.getVideoLoadedFraction(),
              getCurrentTime: () => target.getCurrentTime(),
              getDuration: () => target.getDuration(),
              getVolume: () => target.getVolume(),
              isMuted: () => target.isMuted(),
              mute: () => target.mute(), pause: () => target.pauseVideo(), play: () => target.playVideo(),
              seekTo: (seconds) => target.seekTo(seconds, true),
              setPlaybackRate: (rate) => target.setPlaybackRate(rate), setVolume: (volume) => target.setVolume(volume), unMute: () => target.unMute(),
            });
            onReady();
            target.playVideo();
          },
          onStateChange: ({ data }) => {
            if (data === YT.PlayerState.PLAYING) onStateChange("playing");
            else if (data === YT.PlayerState.PAUSED) onStateChange("paused");
            else if (data === YT.PlayerState.ENDED) onStateChange("ended");
            else if (data === YT.PlayerState.BUFFERING) onStateChange("buffering");
          },
          onError,
        },
      });
    }).catch(onError);
    return () => { cancelled = true; player?.destroy(); };
  }, [onAdapter, onError, onReady, onStateChange, videoId]);
  return <div className="lmu-video-youtube" ref={mountRef} title={title} />;
}
