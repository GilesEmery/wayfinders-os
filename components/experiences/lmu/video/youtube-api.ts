export interface YouTubePlayer {
  destroy(): void;
  getAvailablePlaybackRates(): number[];
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  getVolume(): number;
  isMuted(): boolean;
  mute(): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  unMute(): void;
}

interface YouTubePlayerEvent { target: YouTubePlayer; data: number }
interface YouTubePlayerOptions {
  videoId: string;
  host: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady(event: YouTubePlayerEvent): void;
    onStateChange(event: YouTubePlayerEvent): void;
    onError(event: YouTubePlayerEvent): void;
  };
}

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loader: Promise<NonNullable<Window["YT"]>> | undefined;

export function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loader) return loader;
  const pending = new Promise<NonNullable<Window["YT"]>>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API did not initialize."));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) {
      existing.addEventListener("error", () => reject(new Error("YouTube IFrame API failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.addEventListener("error", () => reject(new Error("YouTube IFrame API failed to load.")), { once: true });
    document.head.appendChild(script);
  });
  loader = pending.catch((error) => {
    loader = undefined;
    throw error;
  });
  return loader;
}
