"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { VideoAsset } from "@/lib/marketing/content";

/** Emit one document-local event to enforce a single audible preview. */
const soundEvent = "editai:marketing-video-sound";
export function MarketingVideo({
  asset,
  emphasis = false,
  onProgress,
  paused = false,
  manualPlayback = false,
  hideCaption = false,
}: {
  asset: VideoAsset;
  emphasis?: boolean;
  paused?: boolean;
  manualPlayback?: boolean;
  hideCaption?: boolean;
  onProgress?: (video: HTMLVideoElement) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false),
    [playing, setPlaying] = useState(false),
    [muted, setMuted] = useState(true),
    [failed, setFailed] = useState(false);
  const userPaused = useRef(false),
    inView = useRef(false),
    manuallyStarted = useRef(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const media = video.current;
    const update = () => {
      if (!media) return;
      if (!inView.current || document.hidden || paused) {
        media.pause();
        media.muted = true;
        setMuted(true);
      } else if (
        !manualPlayback &&
        !userPaused.current &&
        (!reduced.matches || manuallyStarted.current)
      )
        void media.play().catch(() => setPlaying(false));
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting && entry.intersectionRatio >= 0.4;
        if (entry.isIntersecting && !manualPlayback) setLoaded(true);
        update();
      },
      { threshold: [0, 0.4, 0.7] },
    );
    observer.observe(host.current!);
    const silence = (event: Event) => {
      if ((event as CustomEvent).detail !== asset.id && media) {
        media.muted = true;
        setMuted(true);
      }
    };
    document.addEventListener(soundEvent, silence);
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener(soundEvent, silence);
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
      media?.pause();
    };
  }, [asset.id, loaded, manualPlayback, paused]);
  const toggle = () => {
    const media = video.current;
    if (!media) return;
    if (media.paused) {
      userPaused.current = false;
      manuallyStarted.current = true;
      void media.play().catch(() => setPlaying(false));
    } else {
      userPaused.current = true;
      media.pause();
    }
  };
  return (
    <div
      className={`marketing-video ${emphasis ? "emphasis" : ""} ${asset.src && !failed ? "has-video" : "poster-only"}`}
      ref={host}
      data-video-id={asset.id}
    >
      {asset.src && !failed ? (
        <video
          ref={video}
          src={manualPlayback || loaded ? asset.src : undefined}
          poster={asset.poster}
          preload="none"
          playsInline
          muted
          loop={!manualPlayback}
          onEnded={() => setPlaying(false)}
          aria-label={asset.title}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          onTimeUpdate={(e) => onProgress?.(e.currentTarget)}
        />
      ) : (
        <div className="branded-poster">
          {asset.poster ? (
            <img
              src={asset.poster}
              alt={asset.title}
              loading="lazy"
              width="360"
              height="640"
            />
          ) : (
            <>
              <div className="poster-ring" />
              <img
                className="poster-app-logo"
                src="/brand/editai-icon-192.png"
                width="64"
                height="64"
                alt=""
              />
              <span>EditAI</span>
              <div className="poster-wave">
                {Array.from({ length: 23 }, (_, i) => (
                  <i
                    key={i}
                    style={{ height: `${18 + (Math.sin(i * 1.7) + 1) * 25}px` }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {asset.src && !failed && (
        <>
          <button
            className="video-sound"
            aria-label={`${muted ? "Unmute" : "Mute"} ${asset.title}`}
            onClick={() => {
              const media = video.current;
              if (!media) return;
              if (muted)
                document.dispatchEvent(
                  new CustomEvent(soundEvent, { detail: asset.id }),
                );
              media.muted = !muted;
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button
            className="video-play"
            aria-label={`${playing ? "Pause" : "Play"} ${asset.title}`}
            onClick={toggle}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
        </>
      )}
      {(!hideCaption || failed) && (
        <div className="video-caption">
          {asset.creator?.approved && asset.creator.portrait && (
            <img
              src={asset.creator.portrait}
              alt=""
              width="28"
              height="28"
              loading="lazy"
            />
          )}
          <strong>
            {asset.creator?.approved ? asset.creator.name : asset.title}
          </strong>
          <small>{failed ? "Preview unavailable" : asset.description}</small>
        </div>
      )}
    </div>
  );
}
