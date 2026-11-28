"use client";
import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Download,
  Layers,
  Scissors,
  Sparkles,
  Subtitles,
  Video,
} from "lucide-react";
import { EditAIMascot } from "@/app/components/EditAIMascot";
import { AppThemeContext } from "@/app/components/AppThemeContext";
import { marketingContent } from "@/lib/marketing/content";

const icons = {
  batch: Layers,
  record: Video,
  cut: Scissors,
  audio: AudioLines,
  sparkles: Sparkles,
  captions: Subtitles,
  export: Download,
  timeline: Scissors,
};
const details: Record<string, string> = {
  batch:
    "Queue up to 10 projects at once. Review and refine each edit separately.",
  record:
    "Record with your camera and teleprompter. Choose your takes and send them to Eva.",
  cut: "Tell Eva how you want your video edited. Review, refine or undo the cuts.",
  audio:
    "Turn speech into a word-timed transcript. Read, copy or download the text.",
  sparkles:
    "Find your video's main point, key topics and highlights in a clear summary.",
  captions:
    "Create captions from speech. Adjust their font, color, timing and placement.",
  export: "Export your edits, captions, overlays and audio as an MP4.",
};
export function FeatureOrbit() {
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const phase = useRef(0);
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const features = marketingContent.features.filter(
    (feature) => feature.icon !== "export",
  );
  useEffect(() => {
    const el = scene.current!,
      host = root.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false,
      frame = 0,
      previous = 0;
    const paint = () => {
      const width = el.clientWidth,
        height = el.clientHeight;
      nodes.current.forEach((node, i) => {
        if (!node) return;
        const angle = phase.current + (i / features.length) * Math.PI * 2;
        const x = Math.cos(angle) * width * 0.38,
          y = Math.sin(angle) * Math.min(height * 0.32, 140);
        const tilt = -0.13,
          px = x * Math.cos(tilt) - y * Math.sin(tilt),
          py = x * Math.sin(tilt) + y * Math.cos(tilt);
        node.style.transform = `translate(-50%, -50%) translate3d(${px}px, ${py}px, 0) scale(${0.92 + Math.sin(angle) * 0.08})`;
        node.style.zIndex = Math.sin(angle) >= 0 ? "3" : "1";
      });
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    };
    const tick = (now: number) => {
      frame = 0;
      if (previous)
        phase.current += Math.min(64, now - previous) * ((Math.PI * 2) / 44000);
      previous = now;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      stop();
      paint();
      const paused =
        reduced.matches || document.hidden || !visible || active !== null;
      host.dataset.paused = String(paused);
      if (!paused) frame = requestAnimationFrame(tick);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const resize = new ResizeObserver(paint);
    intersection.observe(el);
    resize.observe(el);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      stop();
      intersection.disconnect();
      resize.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [active, features.length]);
  useEffect(() => {
    if (pinned === null) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setPinned(null);
        setActive(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [pinned]);
  const selected = active === null ? null : features[active];
  return (
    <div
      ref={root}
      className="feature-orbit"
      onPointerLeave={() => {
        if (pinned === null) setActive(null);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget) && pinned === null)
          setActive(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setPinned(null);
          setActive(null);
        }
      }}
    >
      <div
        ref={scene}
        className="feature-orbit-scene"
        role="group"
        aria-label="Explore EditAI features"
      >
        <div className="feature-orbit-ring" aria-hidden="true" />
        <div className="feature-orbit-ring second" aria-hidden="true" />
        <div className="feature-orbit-eva">
          <AppThemeContext.Provider value="editAI">
            <EditAIMascot size={200} shadow interactive={false} />
          </AppThemeContext.Provider>
        </div>
        {features.map((feature, i) => {
          const Icon = icons[feature.icon];
          return (
            <button
              key={feature.icon}
              ref={(node) => {
                nodes.current[i] = node;
              }}
              className="orbit-feature"
              data-feature={feature.icon}
              aria-expanded={active === i}
              aria-controls="feature-orbit-details"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                setPinned(pinned === i ? null : i);
                setActive(i);
              }}
            >
              <span className="orbit-feature-sphere">
                <Icon size={29} strokeWidth={1.65} aria-hidden="true" />
              </span>
              <strong>{feature.title}</strong>
            </button>
          );
        })}
      </div>
      <div
        className="feature-orbit-detail-slot"
        id="feature-orbit-details"
        aria-live="polite"
      >
        {selected ? (
          <div className="feature-orbit-detail" role="status">
            <h3>{selected.title}</h3>
            <p>{details[selected.icon] || selected.text}</p>
          </div>
        ) : (
          <p className="feature-orbit-hint">
            Hover or select a tool to explore.
          </p>
        )}
      </div>
    </div>
  );
}
