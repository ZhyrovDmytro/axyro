"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Exercise } from "@/domain/exercise/exercise.types";
import {
  resolveExerciseMediaError,
  type ExerciseMediaState as MediaState,
} from "@/domain/exercise/exercise-media-state";

type ExerciseMediaProps = {
  exercise: Exercise;
  aspectRatio?: string;
  compact?: boolean;
  player?: boolean;
  preload?: "none" | "metadata" | "auto";
};

const MOVEMENT_FRAME_ASSET_REVISION = "2026-10-09-positions-v2";

function getMovementFrameSrc(uri: string) {
  const separator = uri.includes("?") ? "&" : "?";
  return `${uri}${separator}v=${MOVEMENT_FRAME_ASSET_REVISION}`;
}

export function ExerciseMedia({
  exercise,
  aspectRatio,
  compact = false,
  player = false,
  preload,
}: ExerciseMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [mediaState, setMediaState] = useState<MediaState>("loading");
  const [cachedVideoUri, setCachedVideoUri] = useState<string | null>(null);
  const [activeFrame, setActiveFrame] = useState<"start" | "end">("start");
  const [cycleFrames, setCycleFrames] = useState(true);
  const [framesVisible, setFramesVisible] = useState(true);
  const framesRef = useRef<HTMLDivElement>(null);
  const media = exercise.media;
  const hasDistinctMovementFrames =
    exercise.movementFrames.start.uri !== exercise.movementFrames.end.uri;
  const isVideo = media.type === "video";
  const isAnimation = media.type === "animation";
  const mediaPreload = preload ?? (compact ? "metadata" : "auto");
  const showMovementFrames = !media.uri;

  useEffect(() => {
    const element = framesRef.current;
    if (!element || !showMovementFrames) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFramesVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [showMovementFrames]);

  useEffect(() => {
    if (
      !cycleFrames ||
      !framesVisible ||
      !hasDistinctMovementFrames ||
      !showMovementFrames
    )
      return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        setActiveFrame((current) => (current === "start" ? "end" : "start"));
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [
    cycleFrames,
    framesVisible,
    hasDistinctMovementFrames,
    showMovementFrames,
  ]);

  useEffect(() => {
    if (!player || !media.uri || !isVideo || !("caches" in window)) return;
    let active = true;
    let objectUrl: string | null = null;
    const resolveCachedVideo = async () => {
      const response = await window.caches.match(media.uri as string);
      if (!response || !active) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(await response.blob());
      if (active) setCachedVideoUri(objectUrl);
    };
    const handleCacheUpdate = () => void resolveCachedVideo();
    void resolveCachedVideo();
    window.addEventListener("axyro-media-cache-updated", handleCacheUpdate);
    return () => {
      active = false;
      window.removeEventListener(
        "axyro-media-cache-updated",
        handleCacheUpdate,
      );
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isVideo, media.uri, player]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || compact || mediaState !== "ready") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void video.play().catch(() => setMediaState("paused"));
  }, [compact, mediaState]);

  const className = `exercise-media${compact ? " exercise-media--compact" : ""}`;
  const style = { aspectRatio: aspectRatio ?? media.aspectRatio };
  const fallbackUri = media.fallbackUri ?? media.posterUri;

  if (showMovementFrames) {
    const active = exercise.movementFrames[activeFrame];
    const frameNames = hasDistinctMovementFrames
      ? (["start", "end"] as const)
      : (["start"] as const);

    return (
      <div
        ref={framesRef}
        className={`${className} exercise-media--movement-frames`}
        style={style}
        data-active-frame={activeFrame}
      >
        {frameNames.map((frameName) => {
          const frame = exercise.movementFrames[frameName];
          return (
            <Image
              key={frameName}
              className="exercise-media__movement-frame"
              data-frame={frameName}
              alt={frame.alt}
              aria-hidden={activeFrame !== frameName}
              fill
              priority={player}
              loading={compact ? "lazy" : "eager"}
              sizes={
                compact
                  ? "(min-width: 42rem) 50vw, 100vw"
                  : "(min-width: 48rem) 58vw, 100vw"
              }
              src={getMovementFrameSrc(frame.uri)}
            />
          );
        })}
        {!compact && (
          <div className="exercise-media__frame-copy">
            <strong>{active.cue}</strong>
          </div>
        )}
        {!compact && hasDistinctMovementFrames && (
          <div
            className="exercise-media__frame-controls"
            aria-label="Movement positions"
          >
            {frameNames.map((frameName) => (
              <button
                key={frameName}
                type="button"
                aria-pressed={activeFrame === frameName}
                onClick={() => {
                  setActiveFrame(frameName);
                  setCycleFrames(false);
                }}
              >
                {frameName === "start" ? "Start" : "Finish"}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={cycleFrames}
              onClick={() => setCycleFrames((current) => !current)}
            >
              {cycleFrames ? "Pause" : "Auto"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!media.uri || mediaState === "fallback") {
    return (
      <div className={`${className} exercise-media--fallback`} style={style}>
        {fallbackUri ? (
          <Image
            alt={`${exercise.name} movement reference`}
            fill
            priority={player}
            sizes={
              compact
                ? "(min-width: 42rem) 50vw, 100vw"
                : "(min-width: 48rem) 58vw, 100vw"
            }
            src={fallbackUri}
          />
        ) : (
          <div
            className="exercise-media__instructional"
            role="img"
            aria-label={`${exercise.name} instructional fallback`}
          >
            <span>Movement guide</span>
            <strong>{exercise.instructions[0]}</strong>
            {!compact && <p>{exercise.cues[0]}</p>}
          </div>
        )}
      </div>
    );
  }

  if (!isVideo) {
    return (
      <div
        className={`${className} exercise-media--image`}
        style={style}
        data-media-state={mediaState}
      >
        <Image
          alt={`${exercise.name} movement reference`}
          fill
          loading={compact ? "lazy" : "eager"}
          priority={player}
          unoptimized={isAnimation}
          sizes={
            compact
              ? "(min-width: 42rem) 50vw, 100vw"
              : "(min-width: 48rem) 58vw, 100vw"
          }
          src={media.uri}
          onLoad={() => setMediaState("ready")}
          onError={() => setMediaState("fallback")}
        />
      </div>
    );
  }

  return (
    <div className={className} style={style} data-media-state={mediaState}>
      {mediaState === "loading" && (
        <div
          className="exercise-media__loading"
          aria-label="Loading movement demonstration"
        />
      )}
      {mediaState === "error" && (
        <div className="exercise-media__error" role="status">
          <span>Movement demo unavailable</span>
          <button
            type="button"
            onClick={() => {
              setMediaState("loading");
              setRetryKey((current) => current + 1);
            }}
          >
            Retry media
          </button>
        </div>
      )}
      <video
        key={retryKey}
        ref={videoRef}
        aria-label={`${exercise.name} movement demonstration`}
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        loop={media.loop}
        muted
        playsInline
        poster={media.posterUri}
        preload={mediaPreload}
        src={cachedVideoUri ?? media.uri}
        tabIndex={-1}
        onCanPlay={() => setMediaState("ready")}
        onError={() => setMediaState(resolveExerciseMediaError(media))}
        onPause={() => setMediaState("paused")}
        onPlay={() => setMediaState("playing")}
      />
      {!compact && mediaState !== "error" && (
        <div className="exercise-media__controls">
          <button
            type="button"
            aria-label={
              mediaState === "playing"
                ? "Pause movement demonstration"
                : "Play movement demonstration"
            }
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              if (video.paused) void video.play();
              else video.pause();
            }}
          >
            {mediaState === "playing" ? "Pause demo" : "Play demo"}
          </button>
          <button
            type="button"
            aria-label="Replay movement demonstration"
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              video.currentTime = 0;
              void video.play().catch(() => setMediaState("paused"));
            }}
          >
            Replay
          </button>
        </div>
      )}
    </div>
  );
}
