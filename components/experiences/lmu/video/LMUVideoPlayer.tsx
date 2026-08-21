"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { LMULogo } from "../LMULogo";
import { LMUBadgeIcon } from "../icons/badge/LMUBadgeIcon";
import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";
import { BunnyVideoAdapter } from "./BunnyVideoAdapter";
import { ScreenPalVideoAdapter } from "./ScreenPalVideoAdapter";
import { YouTubeVideoAdapter, type VideoAdapterHandle } from "./YouTubeVideoAdapter";

export function formatVideoTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  const minutes = Math.floor(value / 60) % 60;
  const hours = Math.floor(value / 3600);
  return hours ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

type LMUVideoPlayerProps = LMUInstructionalMedia & { className?: string };
type PlaybackState = "buffering" | "ended" | "paused" | "playing";

export function LMUVideoPlayer(props: LMUVideoPlayerProps) {
  const { className = "", description, durationMinutes, provider, title, videoId } = props;
  const titleId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<VideoAdapterHandle>(null);
  const controlsTimerRef = useRef<number>(undefined);
  const [phase, setPhase] = useState<"poster" | "loading" | "ready" | "error">(provider === "screenpal" ? "loading" : "poster");
  const [playbackState, setPlaybackState] = useState<PlaybackState>("paused");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [rates, setRates] = useState<number[]>([1]);
  const [rate, setRate] = useState(1);
  const [scrubTime, setScrubTime] = useState<number>();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const onAdapter = useCallback((adapter: VideoAdapterHandle) => { adapterRef.current = adapter; }, []);
  const onReady = useCallback(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    setDuration(adapter.getDuration());
    setVolume(adapter.getVolume());
    setMuted(adapter.isMuted());
    const supported = adapter.getAvailablePlaybackRates().filter((value) => [0.75, 1, 1.25, 1.5, 2].includes(value));
    setRates(supported.length ? supported : [1]);
    setPhase("ready");
  }, []);
  const onError = useCallback(() => setPhase("error"), []);
  const onStateChange = useCallback((state: PlaybackState) => { setPlaybackState(state); setControlsVisible(true); }, []);

  useEffect(() => {
    if (playbackState !== "playing") return;
    const update = () => {
      const adapter = adapterRef.current;
      if (!adapter) return;
      setCurrentTime(adapter.getCurrentTime());
      setDuration(adapter.getDuration());
      setBuffered(adapter.getBufferedFraction());
    };
    update();
    const interval = window.setInterval(update, 500);
    return () => window.clearInterval(interval);
  }, [playbackState]);

  const showControls = useCallback(() => {
    window.clearTimeout(controlsTimerRef.current);
    setControlsVisible(true);
    const focusWithin = wrapperRef.current?.contains(document.activeElement);
    if (provider === "bunny" && playbackState === "playing" && scrubTime === undefined && !focusWithin) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2600);
    }
  }, [playbackState, provider, scrubTime]);

  useEffect(() => {
    window.clearTimeout(controlsTimerRef.current);
    const focusWithin = wrapperRef.current?.contains(document.activeElement);
    if (provider === "bunny" && playbackState === "playing" && scrubTime === undefined && !focusWithin) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2600);
    }
    return () => window.clearTimeout(controlsTimerRef.current);
  }, [playbackState, provider, scrubTime]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const shownTime = scrubTime ?? currentTime;
  const seekPercent = duration ? (shownTime / duration) * 100 : 0;
  const bufferedPercent = Math.max(seekPercent, buffered * 100);

  function commitSeek() {
    if (scrubTime === undefined) return;
    adapterRef.current?.seekTo(scrubTime);
    setCurrentTime(scrubTime);
    setScrubTime(undefined);
  }

  function togglePlayback() {
    if (playbackState === "playing") adapterRef.current?.pause();
    else adapterRef.current?.play();
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await wrapperRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  }

  function handlePlayerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (provider !== "bunny" || event.target !== event.currentTarget) return;
    showControls();
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); togglePlayback(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); const next = Math.max(0, currentTime - 5); adapterRef.current?.seekTo(next); setCurrentTime(next); }
    else if (event.key === "ArrowRight") { event.preventDefault(); const next = Math.min(duration, currentTime + 5); adapterRef.current?.seekTo(next); setCurrentTime(next); }
    else if (event.key.toLowerCase() === "m") { event.preventDefault(); if (muted) adapterRef.current?.unMute(); else adapterRef.current?.mute(); setMuted(!muted); }
    else if (event.key.toLowerCase() === "f") { event.preventDefault(); void toggleFullscreen(); }
  }

  return <section className={`instructional-video lmu-video-player ${className}`.trim()} aria-labelledby={titleId}>
    <header className="instructional-video-heading lmu-video-heading"><div><p className="eyebrow">Life Mapping U · Instruction</p><h2 id={titleId}>{title}</h2></div>{durationMinutes ? <span>{durationMinutes} min</span> : null}</header>
    {description ? <p className="instructional-video-description">{description}</p> : null}
    <div className={`lmu-video-shell${provider === "bunny" && !controlsVisible ? " controls-hidden" : ""}`} onFocusCapture={showControls} onKeyDown={handlePlayerKeyDown} onMouseMove={showControls} onTouchStart={showControls} ref={wrapperRef} tabIndex={provider === "bunny" ? 0 : undefined}>
      <div className="instructional-video-frame">
        {provider === "youtube" && phase === "poster" ? <div className="lmu-video-poster"><span className="lmu-video-poster-mark" aria-hidden="true">U.</span><p>{title}</p><button type="button" onClick={() => setPhase("loading")} aria-label={`Play ${title}`}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7Z" /></svg></button><small>Watch Instruction</small></div> : null}
        {provider === "bunny" && phase === "poster" ? <div className="lmu-video-poster lmu-video-poster-bunny"><LMULogo className="lmu-video-poster-logo" variant="wordmark-invert" /><div className="lmu-video-poster-content">{props.posterBadge ? <LMUBadgeIcon name={props.posterBadge} state="current" context="dark" size={50} label={`${props.posterTitle ?? title} module`} /> : null}<strong>{props.posterTitle ?? title}</strong><p>Instruction</p><button className="lmu-video-poster-button" type="button" onClick={() => setPhase("loading")} aria-label={`Play ${title}`}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7Z" /></svg></button><small>Watch Instruction</small></div></div> : null}
        {provider === "youtube" && (phase === "loading" || phase === "ready") ? <YouTubeVideoAdapter onAdapter={onAdapter} onError={onError} onReady={onReady} onStateChange={onStateChange} title={title} videoId={videoId} /> : null}
        {provider === "screenpal" && (phase === "loading" || phase === "ready") ? <ScreenPalVideoAdapter embedUrl={props.embedUrl} onError={onError} onLoad={() => setPhase("ready")} title={title} videoId={videoId} /> : null}
        {provider === "bunny" && (phase === "loading" || phase === "ready") ? <BunnyVideoAdapter hlsUrl={props.hlsUrl} onAdapter={onAdapter} onError={onError} onReady={onReady} onStateChange={onStateChange} title={title} videoId={videoId} /> : null}
        {phase === "loading" ? <div className="lmu-video-loading" role="status"><span aria-hidden="true" />Preparing video...</div> : null}
        {provider === "bunny" && phase === "ready" && playbackState === "buffering" ? <div className="lmu-video-buffering" role="status"><span aria-hidden="true" /><span className="sr-only">Buffering video</span></div> : null}
        {provider === "bunny" && phase === "ready" && playbackState !== "playing" ? <button className="lmu-video-center-play" type="button" onClick={togglePlayback} aria-label="Play video"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7Z" /></svg></button> : null}
        {phase === "error" ? <div className="lmu-video-error" role="alert"><strong>We couldn&apos;t load this video.</strong><button type="button" onClick={() => setPhase("loading")}>Try Again</button>{provider === "youtube" ? <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">Watch on YouTube</a> : null}</div> : null}
      </div>
      {(provider === "youtube" || provider === "bunny") && phase === "ready" ? <div className="lmu-video-controls" aria-label={`${title} playback controls`}>
        <button type="button" onClick={togglePlayback} aria-label={playbackState === "playing" ? "Pause video" : "Play video"}>{playbackState === "playing" ? <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM14 5h4v14h-4z" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7Z" /></svg>}</button>
        <span className="lmu-video-time">{formatVideoTime(shownTime)} / {formatVideoTime(duration)}</span>
        <label className="lmu-video-seek"><span className="sr-only">Video position</span><input type="range" min={0} max={Math.max(duration, 0)} step={0.1} value={shownTime} aria-label="Video position" aria-valuetext={`${formatVideoTime(shownTime)} of ${formatVideoTime(duration)}`} onChange={(event) => setScrubTime(Number(event.target.value))} onPointerUp={commitSeek} onKeyUp={commitSeek} style={{ "--played": `${seekPercent}%`, "--buffered": `${bufferedPercent}%` } as CSSProperties} /></label>
        <button type="button" onClick={() => { const adapter = adapterRef.current; if (!adapter) return; if (muted) adapter.unMute(); else adapter.mute(); setMuted(!muted); }} aria-label={muted ? "Unmute video" : "Mute video"}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9Zm12.5 3a4.5 4.5 0 0 0-2-3.74v7.48a4.5 4.5 0 0 0 2-3.74Z" />{muted ? <path d="m17 9 5 6M22 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" /> : null}</svg></button>
        <label className="lmu-video-volume"><span className="sr-only">Volume</span><input type="range" min={0} max={100} value={volume} aria-label="Volume" onChange={(event) => { const next = Number(event.target.value); setVolume(next); setMuted(next === 0); adapterRef.current?.setVolume(next); if (next > 0) adapterRef.current?.unMute(); }} /></label>
        <label className="lmu-video-rate"><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={rate} onChange={(event) => { const next = Number(event.target.value); setRate(next); adapterRef.current?.setPlaybackRate(next); }}>{rates.map((value) => <option key={value} value={value}>{value}x</option>)}</select></label>
        <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg></button>
      </div> : null}
    </div>
  </section>;
}
